# Spec — Module Invitations (Étape 2)

**Date** : 2026-05-05
**Phase** : Étape 2 — Module Invitations (V1 sans email)
**Phase précédente** : Étape 1 Sprint UX MVP terminé (rebuy + join code + mobile + polish PokerStars-like)
**Phase suivante** : Étape 3 — 0.C Audit production-ready (sécurité, perf)

## Contexte

L'Étape 1 a livré la mécanique de **code d'invitation** : génération automatique d'un code à 6 chars par table, badge cliquable dans le header (copie dans le presse-papier), formulaire `JoinByCodeForm` dans le lobby. Cela suffit pour partager une table par WhatsApp/SMS textuel.

Cette étape ajoute la **couche distribution** :
- **Lien shareable** : URL `https://home-poker.vjdev.tech/?join=ABC123` cliquable
- **QR code** : pour scanner depuis un téléphone vers un autre
- **Auto-join** : zéro friction côté invité (pas de saisie manuelle du code)

L'envoi par email est explicitement **reporté à V2** (nécessite Resend + vérif domaine, friction setup non justifiée pour l'usage famille initial).

## Objectif

Permettre au créateur d'une table de partager un lien (URL + QR) que les invités cliquent / scannent pour atterrir directement dans la table sans saisir de code.

## Périmètre

### IN
- Modale `InviteDialog` accessible depuis le badge code de `PokerTable`
- Génération du QR code côté client (lib `qrcode.react`)
- Bouton copier-lien et bouton partager natif (Web Share API si supporté)
- Lecture de la query string `?join=CODE` au chargement de l'app
- Auto-join intelligent post-auth si un code est en attente
- Persistance du `pendingJoinCode` en `localStorage` entre signup et arrivée à la table

### OUT
- Email d'invitation (V2 module)
- Tracking individuel via la table `invitations` (status pending/accepted)
- Expiration des codes
- Limite du nombre d'invitations par table
- React Router / deep linking par path (`/join/X`)

## Décisions de design

### Format URL
**`https://home-poker.vjdev.tech/?join=ABC123`** (query string)

L'app n'utilise pas de router — `currentView` est un state local. Avec une query string, on lit `window.location.search` au chargement, on extrait `join`, on stocke en localStorage, et on `history.replaceState` pour nettoyer la barre d'URL. Aucune dépendance router à ajouter.

### Library QR
**`qrcode.react`** (composant React, ~10KB) — utilisé via `<QRCodeSVG value={url} size={N} />`. Préféré à `qrcode` vanilla parce qu'il s'intègre naturellement dans React.

### Flow auto-join

```
URL avec ?join=CODE
    ↓
AppMain useEffect (montage)
    ↓
1. lit window.location.search
2. extrait code
3. localStorage.setItem("pendingJoinCode", code)
4. history.replaceState pour nettoyer URL
    ↓
useAuth callback après chargement de l'user
    ↓
Si user existe ET pendingJoinCode non vide:
    1. query getTableByInviteCode(code)
    2. si table trouvée:
       - setSelectedTableId(table._id)
       - setCurrentView("table")
       - joinTable mutation (siège libre, pas d'erreur si déjà assis)
    3. localStorage.removeItem("pendingJoinCode")

Si pas d'user (déco/pas inscrit):
    → écran LoginForm s'affiche normalement
    → après signup/signin succès, useAuth re-déclenche le check
    → la chaîne ci-dessus s'exécute
```

### InviteDialog — contenu

| Section | Détail |
|---|---|
| Header | Titre "Inviter des joueurs" + bouton fermer (×) |
| QR code | 200x200 desktop / 160x160 mobile, fond blanc, marge 16px |
| Code | Affichage en gros caractères monospace, espacement large (`tracking-widest`) |
| Lien | Champ readonly avec l'URL complète, bouton 📋 copie au clic |
| Bouton partager | "📲 Partager" — utilise `navigator.share({ title, url })` si supporté ; sinon le bouton est caché |

### Comportement de l'auto-join

- Si l'invité **est déjà à la table** → naviguer simplement à la vue table (pas de re-join, pas d'erreur)
- Si l'invité **n'est pas à la table** mais la table est **pleine** → afficher un toast "Table pleine" + retour au lobby
- Si la table **n'existe pas** (code invalide) → toast "Code invalide" + retour au lobby
- Si l'invité **est le créateur** → naviguer à sa table normalement

### URL canonique pour l'app

L'app est servie par nginx sur `https://home-poker.vjdev.tech`. Le lien d'invitation utilise cette URL en hard-coded. À terme, on pourrait lire ça depuis une variable d'env Vite, mais pour V1 c'est OK.

## Composants

| Fichier | Rôle |
|---|---|
| `src/core/components/Game/InviteDialog.tsx` | Create — modale avec QR + lien + boutons copier/partager |
| `src/core/components/Game/PokerTable.tsx` | Modifier — le badge code ouvre la modale au lieu de copier directement |
| `src/core/components/App/AppMain.tsx` | Modifier — useEffect au montage qui lit `?join=` et stocke `pendingJoinCode` |
| `src/core/hooks/useAuth.ts` ou nouveau `useAutoJoin.ts` | Add — hook qui watch `user` + `pendingJoinCode`, déclenche le join |
| `package.json` | Modifier — ajout dépendance `qrcode.react` |

## Critères de sortie

### Automatiques
```bash
npm run typecheck && npm run lint && npx vitest run   # exit 0
```

### Smoke manuel
1. Bea crée une table publique → clique le badge "Code: ABC123" dans le header → modale s'ouvre avec QR + lien
2. Bea **copie le lien** depuis la modale et le partage à Lena (par WhatsApp ou autre)
3. Lena clique le lien :
   - **Cas 1 — déjà connectée** : arrive directement sur la table, assise sur le siège libre
   - **Cas 2 — pas connectée** : voit le LoginForm, signup, puis arrive directement sur la table
4. Bea peut aussi **scanner le QR code** depuis son téléphone (test alternatif au lien copié)
5. Si Bea revient au lobby et que Lena re-clique sur le lien : Lena revient à la table sans erreur (auto-join idempotent)

## Hors-scope

- Email d'invitation (Resend, SendGrid) → V2 du module
- Statistiques d'envoi/acceptation des invitations → V2 avec tracking via table `invitations`
- Expiration de codes / révocation
- Limite du nombre d'utilisations d'un code (tant que la table existe et n'est pas pleine, le code reste valide)
- Branded landing page pour les non-connectés (juste le LoginForm normal pour V1)

## Risques

- **R1** `pendingJoinCode` en localStorage peut subsister si l'user ferme avant signup : mitigation = clear systématique après le join réussi, et pas de retry infini si le code n'existe pas.
- **R2** Codes à 6 chars (~2 G combos) ne sont pas crypto. Brute-force possible théorique. Hors-scope sécurité 0.C.
- **R3** L'URL hard-coded `https://home-poker.vjdev.tech` ne fonctionne pas en local dev. Mitigation : utiliser `window.location.origin` à la place — toujours juste pour l'environnement courant.
- **R4** `qrcode.react` peut introduire un warning ESM / CJS. Vérifier au premier import.

## Hypothèses

- **H1** Le code de la table (`tables.inviteCode`) est généré pour toutes les tables (publiques et privées) — fait en Étape 1.
- **H2** La query `getTableByInviteCode` existe et retourne `{ _id, name, status, ... } | null` — fait en Étape 1.
- **H3** La mutation `joinTable` est idempotente côté UX : si le user est déjà assis, on n'affiche pas d'erreur bloquante (le `User already in table` actuel doit être catché silencieusement par le flow auto-join).

## Suite

Après validation user + smoke OK, invoquer `superpowers:brainstorming` pour la phase **Étape 3 — 0.C Audit production-ready** (sécurité S1/S2/S3, perf, déconnexions).
