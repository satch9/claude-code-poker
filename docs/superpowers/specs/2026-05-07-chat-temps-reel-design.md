# Chat temps réel — design

Date : 2026-05-07
Périmètre : MVP du chat de table pour la roadmap v1.3.0.

## Objectif

Activer un chat texte temps réel entre les joueurs assis à une table de poker, en remplaçant l'actuel placeholder `ChatPanel`. La discussion est éphémère (purgée à la fin de la partie) et limitée aux participants effectifs.

## Décisions cadrantes

| Question | Choix retenu |
|---|---|
| Portée | Par table uniquement (pas de chat global ni de DM). |
| Accès | Joueurs assis uniquement, en lecture comme en écriture. |
| Persistance | Volatile : purge des messages quand `tables.status` passe à `"finished"`. |
| Modération | Rate limit serveur (5 messages / 10 s par user × table) + longueur ≤ 280 caractères après trim. |
| Intégration feed actions | Chat séparé du feed `gameActions` ; l'onglet "Historique" reste inchangé. |
| Notification UI | Badge non-lu sur l'onglet Chat (et sur l'icône d'ouverture du drawer mobile). |

## Architecture

### Schéma Convex

Nouvelle table dans `convex/schema.ts` :

```ts
chatMessages: defineTable({
  tableId: v.id("tables"),
  userId: v.id("users"),
  playerName: v.string(),  // dénormalisé : pseudo figé au moment de l'envoi
  body: v.string(),        // déjà trimmé + tronqué côté serveur
  createdAt: v.number(),
}).index("by_table", ["tableId", "createdAt"]),
```

- Index composite `(tableId, createdAt)` pour la lecture chronologique sans tri client.
- `playerName` dénormalisé : un changement de pseudo ne ré-écrit pas l'historique (cohérent avec la purge de fin de partie).
- Pas d'`isSystem`, pas de soft-delete : YAGNI, on supprime via `db.delete`.

### Mutations & queries (`convex/chat.ts`)

**`sendMessage` (mutation publique)**
- Args : `{ tableId: Id<"tables">, body: string }`.
- Auth : `getAuthUserId(ctx)` ; throw si null.
- Validation siège : query `players` avec `by_table` filtrée sur `userId` ; throw `"NOT_SEATED"` si l'utilisateur n'est pas assis à cette table.
- Validation contenu : `body.trim()` non vide, longueur ≤ 280 ; sinon throw `"INVALID_BODY"`.
- Rate limit : composant `@convex-dev/rate-limiter` (déjà installé), clé `chat:<userId>:<tableId>`, capacité 5 / fenêtre 10 s ; throw `"RATE_LIMIT"` à l'épuisement.
- Insert : `{ tableId, userId, playerName: user.name, body: trimmed, createdAt: Date.now() }`.
- Retour : `_id` du message inséré (utilisable pour optimistic UI ultérieur).

**`listMessages` (query publique)**
- Args : `{ tableId: Id<"tables">, limit?: number }` (défaut 50).
- Auth + check siège ; renvoie `[]` si non assis (pas un throw, on n'affole pas l'UI pour un spectateur).
- Lecture : `db.query("chatMessages").withIndex("by_table", q => q.eq("tableId", tableId)).order("desc").take(limit)` puis inversé pour ordre ascendant côté UI.
- Convex pousse les updates en temps réel automatiquement via la subscription.

**`purgeTableMessages` (internal mutation)**
- Args : `{ tableId: Id<"tables"> }`.
- Itère et supprime tous les `chatMessages` du `tableId`.
- Appelée depuis le code qui passe `tables.status` à `"finished"` (à localiser dans `convex/tables.ts` ou le moteur de jeu lors de la phase plan) ; appelée également avant un éventuel `db.delete(tableId)`.

### UI

**Hook `useTableChat(tableId)` (`src/core/hooks/useTableChat.ts`)**
- `messages = useQuery(api.chat.listMessages, { tableId })`.
- `sendMessage(body)` via `useMutation`, mappe les erreurs (`RATE_LIMIT`, `INVALID_BODY`, `NOT_SEATED`) sur des toasts via `useToast`.
- `sending: boolean` pour désactiver l'input pendant l'aller-retour.
- Compteur non-lu : timestamp `lastReadAt` persisté en `localStorage` (clé `chat:lastRead:<tableId>`) ; `unreadCount` = nombre de messages avec `createdAt > lastReadAt` et `userId !== currentUserId`. `markRead()` met `lastReadAt = Date.now()`.

**Refonte `ChatPanel` (`src/core/components/Game/ChatPanel.tsx`)**
- Props : `{ tableId, isActive }`. `isActive` = onglet visible ; déclenche `markRead()` au montage / changement.
- Layout :
  - Liste scrollable des messages : `playerName` en accent, `body`, heure `HH:mm` en `text-text-muted`.
  - Auto-scroll en bas à chaque nouveau message *seulement* si l'utilisateur était déjà en bas (sinon on respecte sa position pour éviter de voler le scroll).
  - Tokens Sprint 0 dark : `bg-bg-surface`, `text-text-primary`.
  - États : skeleton si `messages === undefined`, état vide ("Soyez le premier à écrire", icône `MessageCircle`), état "non assis" (réutilise le placeholder actuel).
  - Input ancré en bas : primitive `Input` Sprint 0, `Enter` envoie, bouton `<Send />` lucide. Désactivé si `sending` ou non assis. Compteur discret `body.length / 280`.
- A11y : `role="log"` + `aria-live="polite"` sur la liste, `aria-label` sur l'input.

**Badge non-lu (`TableRightPanel.tsx` + drawer mobile)**
- `TableRightPanel` reçoit `unreadChat: number` (consommé via `useTableChat` au niveau du panel ou du parent commun).
- Pastille `bg-accent text-white text-xs rounded-full` à côté du label "Chat" si `unreadChat > 0 && active !== "chat"`.
- Sur mobile, même règle sur l'icône d'ouverture du drawer joueurs/chat.

## Cycle de vie

- **Fin de partie** : la mutation qui passe `tables.status` à `"finished"` invoque `internal.chat.purgeTableMessages({ tableId })` après commit. Si la table est supprimée plutôt qu'archivée, l'appel se fait avant `db.delete(tableId)`.
- **Abandon (table reste en `playing`)** : pas de purge automatique au MVP. Acceptable ; on pourra brancher un cron Convex plus tard si nécessaire.
- **Suppression d'un user** : à brancher dans la mutation `deleteUser` existante (cf. `convex/admin/`) lors de la prochaine intervention. Hors scope MVP.

## Performances

- Read : `listMessages` borné à 50, index composite, 1 lookup direct, pas de N+1 (pseudo dénormalisé).
- Write : faible contention attendue ; le rate limit (5/10 s) plafonne le débit.
- Bundle : chat embarqué dans le chunk `PokerTable` (déjà lazy-loadé). Pas de nouveau chunk.
- Re-renders : `ChatPanel` re-render uniquement quand `messages` change.

## Sécurité

- Toute écriture passe par `sendMessage` qui revérifie auth + siège côté serveur.
- Longueur tronquée serveur (pas seulement client).
- Pas de HTML / markdown : `body` rendu en texte brut, React échappe.
- Rate limit Convex officiel (pas seulement debounce client).
- RGPD : purge automatique en fin de partie limite la rétention.

## Hors scope (backlog explicite)

- Édition / suppression d'un message par son auteur.
- Réactions / emojis picker.
- Mentions @user.
- Indicateur "en train d'écrire".
- Liens cliquables / aperçus.
- Mute par joueur, signalement.
- Chat global ou messages privés.
- Persistance longue durée / historique post-partie.

## Plan de tests

- **Unité** : `useTableChat` (calcul `unreadCount`, `markRead`, mapping erreurs).
- **UI** : `ChatPanel` (envoi OK, état non-assis, état vide, troncature, désactivation pendant `sending`), badge non-lu dans `TableRightPanel`.
- **Convex** : pas de tests unitaires Convex dans ce repo ; validation manuelle (smoke test) pour rate limit et purge.

## Critères de complétion

- Un joueur assis peut envoyer / lire des messages en temps réel sur sa table.
- Un spectateur ou un utilisateur non-authentifié ne peut ni lire, ni écrire.
- Un dépassement de longueur ou de débit affiche un toast clair sans crash.
- Le badge non-lu apparaît / disparaît correctement quand l'onglet Chat n'est pas actif.
- À la fin de la partie, les messages sont purgés.
- Le bundle initial n'augmente pas (le chat suit le chunk `PokerTable` existant).
