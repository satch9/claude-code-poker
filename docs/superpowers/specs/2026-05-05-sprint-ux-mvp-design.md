# Spec — Sprint UX MVP (Étape 1)

**Date** : 2026-05-05
**Phase** : Étape 1 du plan de remontée d'exp utilisateur (avant Étape 2 Module Invitations et Étape 3 Sécurité 0.C)
**Source** : recommandations 1.B + findings reportés (B3.1, B-runtime.1, B-runtime.8)
**Phase précédente** : 1.B fix fonctionnel (24 commits, MVP heads-up techniquement OK)
**Phase suivante** : Module Invitations (Étape 2)

## Contexte

Avec 1.B, le MVP heads-up est techniquement jouable end-to-end. Mais 3 manques bloquent l'usage réel en famille :

1. **Pas de moyen pratique d'inviter** — le 2e joueur doit aller sur le lobby et chercher la table dans la liste publique. CLAUDE.md parle de codes d'invitation qui n'ont jamais été câblés côté front (B3.1).
2. **App cassée sur mobile** — toute l'UI table est collée en haut de l'écran, impossible de jouer au téléphone (B-runtime.1).
3. **Cash game sans rebuy** — un joueur fauché reste assis à 0 jetons sans option de recharger (B-runtime.8). Comportement de tournoi appliqué à du cash.

Cet sprint regroupe les 3 fixes en 1 cycle car ils visent le même objectif (rendre l'app jouable en famille) et sont indépendants au niveau code.

## Objectif

Rendre le MVP heads-up confortablement jouable en famille :
- Bea envoie un code à 6 chars à Lena, Lena le saisit, elles jouent
- Les deux peuvent jouer depuis leur téléphone en mode portrait
- En cash game, un joueur fauché peut se recaver entre 2 mains

## Périmètre

### IN
- **Fix 1** Rejoindre par code (B3.1) — backend query + UI form lobby
- **Fix 2** Mobile responsive heads-up (B-runtime.1) — CSS responsive 2 joueurs
- **Fix 3** Rebuy cash game (B-runtime.8) — mutation + UI bouton

### OUT (reporté)
- Multi-joueurs mobile (3+ joueurs sur mobile) → phase ultérieure
- QR code sur le code → Module Invitations étape 2
- Email d'invitation → Module Invitations étape 2
- Rebuy en tournoi → logique tournoi dédiée
- Rebuy au runtime (pendant le tour du joueur) → trop risqué, autorisé uniquement entre mains

## Décisions de design

### Fix 1 — Rejoindre par code (B3.1)

#### Backend
- **Nouvelle query** `convex/tables.ts:getTableByInviteCode(code: string)`
  - Lookup via index existant `by_invite_code`
  - Code converti en uppercase avant lookup (UX permissive)
  - Retourne le doc `tables` complet ou `null`
  - Pas de validation Zod stricte côté query (lecture, pas mutation)
- **Vérification** : confirmer que les tables publiques génèrent bien un `inviteCode` (B2.3 normalement fixé en 1.B). Si non, corriger dans `createTable`.

#### Frontend
- **Composant nouveau** `src/core/components/Lobby/JoinByCodeForm.tsx` :
  - Input contrôlé, format auto-uppercase 6 chars max, regex `[A-Z0-9]`
  - Bouton "Rejoindre" disabled si input < 6 chars
  - State `error: string | null` pour feedback
  - Sur submit :
    1. Appelle `useQuery(api.tables.getTableByInviteCode, { code })` ou via mutation pour éviter le loading state lobby
    2. Si null → `setError("Code invalide")`
    3. Si OK → `onJoinTable(tableId)` (callback existant qui fait setSelectedTableId + setCurrentView)
    4. Reset input
- **Intégration** dans `Lobby.tsx` : section juste au-dessus ou en parallèle de la liste des tables publiques
- **Stratégie d'appel** : utiliser `useQuery` avec `"skip"` quand input pas complet, ou `useAction` pour appel one-shot. Choix simple : `useQuery({ code }) si code.length === 6, sinon "skip"`.

### Fix 2 — Mobile responsive (B-runtime.1)

#### Diagnostic
Le finding statique B-runtime.1 indique que la table est cassée sur mobile portrait + paysage. La cause exacte n'a pas été identifiée — l'audit suspecte `useResponsiveClasses`/`useSeatPositioning` à <768px. Première étape : diagnostic ciblé en devtools.

#### Stratégie
- **Cible heads-up uniquement** (`maxPlayers === 2`). Multi-joueurs mobile reporté.
- **Layout mobile portrait** :
  - Header minimal en haut (nom table + jetons)
  - Joueur adverse en haut (avatar, nom, jetons, cartes hidden)
  - Cartes communautaires + pot au centre
  - Joueur courant + ses cartes en bas
  - Boutons d'action (call/fold/raise) en bas, fixed
- **Pas de tapis vert oval** sur mobile portrait — trop petit. Utiliser un layout vertical simple.
- **Tailwind responsive** : `sm:`, `md:`, `lg:` breakpoints. Sur `<sm` (mobile portrait) → layout simplifié. Sur `>=sm` → layout actuel oval.
- **LandscapeWarning** : composant existe, vérifier qu'il s'affiche en mobile portrait pour proposer la rotation. Si l'utilisateur préfère portrait, le layout mobile portrait doit fonctionner aussi.
- **Decision** : ne pas désactiver le mode portrait. Layout portrait simplifié.

#### Critères de sortie Fix 2
- Sur iPhone/Android **portrait** : tapis (ou layout vertical) visible plein écran, 2 sièges placés top + bottom, cartes lisibles, boutons accessibles, pas de scroll inattendu
- Sur iPhone/Android **paysage** : layout oval comme desktop (le LandscapeWarning n'apparaît plus)
- L'utilisateur peut jouer une main complète au tel sans frustration

### Fix 3 — Rebuy cash game (B-runtime.8)

#### Backend
- **Nouvelle mutation** `convex/players.ts:rebuy(tableId, userId, amount)` :
  - Validation Zod : `amount > 0 && amount <= table.startingStack`
  - Vérifie `table.gameType === "cash"` (sinon throw)
  - Vérifie que le joueur existe à la table (sinon throw)
  - Vérifie que `gameState.phase ∈ {"waiting", "showdown"}` OU `player.isFolded === true` (sinon throw "Cannot rebuy during your turn")
  - **Décision A** : `chips = amount` (remplace le stack, pas additif). Simple, conforme aux conventions.
  - Log dans `gameActions` : `"${user.name} se recave pour ${amount} jetons"`

#### Frontend
- **Bouton "Recharger"** dans `PokerTable.tsx` visible quand :
  - `table.gameType === "cash"` **et**
  - `currentPlayer && currentPlayer.chips < table.bigBlind` (joueur ne peut plus payer la BB) **et**
  - `gameState.phase ∈ {"waiting", "showdown"}` ou `currentPlayer.isFolded`
- **Modale `RebuyDialog.tsx`** (nouveau composant `src/core/components/Game/RebuyDialog.tsx`) :
  - Input numérique, default = `table.startingStack`
  - Bornes : 1 à `table.startingStack`
  - Slider optionnel pour confort
  - Bouton "Confirmer" → appelle `useMutation(api.players.rebuy)`
  - Bouton "Annuler" pour fermer
- Refresh des queries Convex est automatique → la nouvelle stack apparaît immédiatement

#### Schéma
Pas de modification de schéma (champ `chips` déjà mutable).

## Ordre d'exécution

L'ordre est choisi par risque croissant :

1. **Fix 3 Rebuy** (~2-3h) — backend simple, UI petite modale, pas de risque de casser le moteur
2. **Fix 1 Join code** (~2h) — backend query + UI form, indépendant du reste
3. **Fix 2 Mobile** (~3-4h) — CSS-heavy, le plus risqué car peut casser desktop si mal fait

## Critères de sortie sprint

### Automatiques
```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npx vitest run      # exit 0, tests existants intacts
```

### Manuel (smoke par le user)
1. Bea crée table cash, **publique**, blindes 5/10, stack 1000
2. Bea note le code d'invitation affiché
3. Lena, depuis son **téléphone en portrait**, ouvre l'app et utilise "Rejoindre par code" pour entrer
4. La table s'affiche correctement chez Lena (mobile)
5. Une main est jouée jusqu'au showdown — UI mobile et desktop fonctionnent
6. Bea perd tous ses jetons en all-in
7. Entre les mains, bea voit le bouton "Recharger" et reprend 1000 jetons

## Stratégie de commits

1 commit par fix logique (~6-8 commits total) :
- `feat(tables): query getTableByInviteCode + génération inviteCode pour tables publiques`
- `feat(ui): JoinByCodeForm dans le lobby`
- `fix(ui): layout mobile portrait pour heads-up`
- `feat(players): mutation rebuy pour cash game`
- `feat(ui): bouton Recharger + RebuyDialog`

Chaque commit signe avec `viny1976@gmail.com` / `satch9`.

## Risques

- **R1 (Fix 2)** Le layout mobile peut casser desktop si on touche aux classes partagées. Politique : isoler les classes mobile via breakpoints Tailwind, ne pas modifier les classes desktop existantes.
- **R2 (Fix 1)** L'index `by_invite_code` peut être absent ou nommé différemment. Vérifier dans `convex/schema.ts` au début. Si absent, l'ajouter (mais le rapport audit confirme sa présence).
- **R3 (Fix 3)** Si le bouton "Recharger" apparaît au mauvais moment (pendant le tour du joueur) → état tordu. La condition d'affichage est doublée par la validation backend (mutation throw si phase pas adaptée).

## Hypothèses

- **H1** Les tables existantes en DB ont déjà `inviteCode` pour les tables publiques (1.B Lot B2 a normalement fixé B2.3). Si ce n'est pas le cas, le Fix 1 ajoute la logique.
- **H2** L'utilisateur (Vincent) est dispo pour le smoke manuel mobile (~10 min) à la fin du sprint.
- **H3** Le tableau actuel `<sm` mobile portrait est inutilisable mais n'est pas dans une infinite loop ou crash — il est juste mal positionné.

## Suite

Une fois le sprint validé (auto + smoke), invoquer `superpowers:brainstorming` pour la phase **Module Invitations (Étape 2)**.
