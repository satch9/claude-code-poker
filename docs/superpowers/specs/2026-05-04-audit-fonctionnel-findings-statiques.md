# Findings audit statique 0.B — parcours B1 à B6

> Document **intermédiaire**. Produit par l'audit statique des 6 parcours MVP heads-up
> (Task 1 du plan 0.B). Sera consolidé dans le rapport final
> `2026-05-04-audit-fonctionnel-rapport.md` une fois la checklist smoke et le harness
> exécutés.

**Date** : 2026-05-04
**Source** : sub-agent statique (grep + lecture fichiers convex/, src/)
**Commit de référence** : `3216e58` (harness + checklist 0.B)

## Synthèse

| Parcours | 🔴 | 🟡 | 🟢 | Total |
|---|---|---|---|---|
| B1 — Auth | 1 | 3 | 1 | 5 |
| B2 — Création table | 1 | 2 | 1 | 4 |
| B3 — Rejoindre table | 1 | 2 | 1 | 4 |
| B4 — Partie heads-up | 2 | 3 | 1 | 6 |
| B5 — Multi-mains / élimination | 1 | 3 | 1 | 5 |
| B6 — Sortir de la table | 1 | 3 | 1 | 5 |
| **Total** | **7** | **16** | **6** | **29** |

---

## B1 — Auth (`convex/auth.ts`, `src/core/hooks/useAuth.ts`)

#### B1.1 — Hash password sans salt par utilisateur
- **Sévérité** : 🔴
- **Localisation** : `convex/auth.ts:78`
- **Description** : `data = encoder.encode(password + "salt")` — salt statique global, vulnérable aux attaques par rainbow tables.
- **Recommandation** : utiliser bcrypt/argon2, ou au minimum un salt aléatoire par user stocké séparément.

#### B1.2 — Aucune validation format email / longueur password
- **Sévérité** : 🟡
- **Localisation** : `convex/auth.ts:5-10`
- **Description** : `signUpWithPassword` accepte n'importe quelle string pour email et password.
- **Recommandation** : valider via Zod côté serveur (regex email, password ≥ 8 chars).

#### B1.3 — `signOut` purement client
- **Sévérité** : 🟡
- **Localisation** : `src/core/hooks/useAuth.ts:148-151`
- **Description** : Le serveur ne révoque rien (pas de session token), `lastSeen` non mis à jour.
- **Recommandation** : mutation `signOut` qui patch `lastSeen` et invalide une éventuelle session côté serveur.

#### B1.4 — Pas de gestion d'erreur UI dans `signUp`/`signIn`
- **Sévérité** : 🟡
- **Localisation** : `src/core/hooks/useAuth.ts:96-142`
- **Description** : L'exception est propagée au composant, à confirmer côté `EmailPasswordForm.tsx`.
- **Recommandation** : centraliser le feedback d'erreur (toast / inline form error).

#### B1.5 — `isLoading` ne reflète pas `userQuery` initial
- **Sévérité** : 🟢
- **Localisation** : `src/core/hooks/useAuth.ts`
- **Description** : Peut faire flasher l'écran login au F5 le temps que la query Convex revienne.
- **Recommandation** : intégrer `userQuery === undefined` dans le calcul de `isLoading`.

---

## B2 — Création table (`convex/tables.ts:5-55`, `CreateTableForm.tsx`)

#### B2.1 — Aucune validation serveur des arguments
- **Sévérité** : 🔴
- **Localisation** : `convex/tables.ts:5-55`
- **Description** : `createTable` accepte `smallBlind=0`, `bigBlind<smallBlind`, `maxPlayers=1`, `startingStack≤0`. La validation existe seulement côté UI (`CreateTableForm.tsx:39-69`). Un client malveillant peut créer une table cassée.
- **Recommandation** : valider les arguments au niveau de la mutation Convex (Zod ou checks manuels).

#### B2.2 — `inviteCode` faiblement aléatoire
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts:22`
- **Description** : `Math.random().toString(36).substring(2,8).toUpperCase()` (~36⁶ ≈ 2 G combos), pas cryptographique, pas de check d'unicité.
- **Recommandation** : utiliser `crypto.randomUUID()` tronqué et vérifier l'unicité via index.

#### B2.3 — `inviteCode` non généré pour table publique
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts:18-23`
- **Description** : Pas de moyen direct de partager une table publique par code (le code n'est généré que si `isPrivate=true`).
- **Recommandation** : toujours générer un code, indépendamment de la visibilité.

#### B2.4 — Pas d'auto-seat du créateur
- **Sévérité** : 🟢
- **Localisation** : `convex/tables.ts` + `AppMain.tsx`
- **Description** : Il faut faire `joinTable` après `createTable` (à confirmer).
- **Recommandation** : créer le siège du créateur dans la même mutation `createTable`.

---

## B3 — Rejoindre table par code (`convex/players.ts:5-85`)

#### B3.1 — Parcours « rejoindre par code » non implémenté
- **Sévérité** : 🔴
- **Localisation** : pas de query `getTableByInviteCode` ni d'écran de saisie côté front
- **Description** : `grep` retourne 0 référence frontend (`inviteCode` utilisé uniquement dans `types/index.ts`). La fonctionnalité de partage par code annoncée dans CLAUDE.md n'existe pas.
- **Recommandation** : ajouter la query `getTableByInviteCode` (qui avait été supprimée en 1.A car morte) + l'écran de saisie + l'auto-join sur succès.

#### B3.2 — Race condition sur le dernier siège
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:joinTable`
- **Description** : `joinTable` ne pose pas de lock ; deux joins concurrents peuvent lire le même `occupiedSeats` et atterrir sur le même siège.
- **Recommandation** : ajouter un index unique `(tableId, seatPosition)` ou refuser si conflit détecté en fin de mutation.

#### B3.3 — `buyInAmount` non validé
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:67`
- **Description** : Accepte n'importe quelle valeur, pas de plafonnement vs `startingStack`.
- **Recommandation** : clamp `0 < buyInAmount ≤ startingStack`.

#### B3.4 — Erreurs en français mélangées avec messages anglais
- **Sévérité** : 🟢
- **Localisation** : `convex/players.ts`
- **Description** : `"Table is full"`, `"User already in table"` non traduits.
- **Recommandation** : harmoniser i18n (codes d'erreur côté serveur, traduction côté front).

---

## B4 — Partie heads-up (`convex/core/gameEngine.ts`)

#### B4.1 — Cartes communautaires depuis un nouveau deck à chaque phase
- **Sévérité** : 🔴
- **Localisation** : `convex/core/gameEngine.ts:642` (`advanceToNextPhase`) et `:1431` (`advanceToNextPhaseWithStateMachine`)
- **Description** : Chaque transition fait `const deck = shuffleDeck(createDeck());`. Conséquence : flop / turn / river peuvent **dupliquer les hole cards** des joueurs. Bug d'intégrité critique du moteur.
- **Recommandation** : conserver le `remainingDeck` dans `gameStates` au moment du `startGame` et tirer les community cards depuis ce deck unique.

#### B4.2 — `forcePlayerFold` cible une référence introuvable
- **Sévérité** : 🔴
- **Localisation** : `convex/core/gameEngine.ts:1295`
- **Description** : `internal["internal/gameEngine"]` n'existe pas — le module s'appelle `core/gameEngine`. Le timeout fold côté serveur va crasher.
- **Recommandation** : corriger en `internal["core/gameEngine"]`.

#### B4.3 — `setTimeout` dans une mutation Convex
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:788` (dans `determineWinner`)
- **Description** : Programme `prepareNextHand` via `setTimeout(3000)`. Or les mutations Convex ne peuvent pas invoquer du code après le commit. Le timer est probablement perdu.
- **Recommandation** : utiliser `ctx.scheduler.runAfter`.

#### B4.4 — `setSelectedAction(null)` + double `setHandNumber`
- **Sévérité** : 🟡
- **Localisation** : `src/core/hooks/useGameLogic.ts:283-287`
- **Description** : Incrémente `handNumber` à chaque entrée preflop avec `pot===0`. Instable lors du réordonnancement de queries Convex.
- **Recommandation** : source unique de `handNumber` côté serveur (cf. B5.5).

#### B4.5 — Détermination du gagnant heads-up coûteuse
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:828-838`
- **Description** : La comparaison de kickers part d'un tableau de 2 hands seulement, OK fonctionnellement, mais le sort est non-stable et recompute `determineWinners` pour chaque pair, O(n²).
- **Recommandation** : trier une seule fois.

#### B4.6 — Logs `console.log` verbeux en prod
- **Sévérité** : 🟢
- **Localisation** : `convex/core/gameEngine.ts` (plusieurs)
- **Description** : Russe-emoji partout dans le moteur, pollue les logs Convex.
- **Recommandation** : guard `if (DEBUG)` ou retirer en prod.

---

## B5 — Multi-mains / élimination (`gameEngine.ts:944-1027`, `:1336-1367`)

#### B5.1 — `endHand` enchaîne `prepareNextHand` + `startNextHandInternal` synchrone
- **Sévérité** : 🔴
- **Localisation** : `convex/core/gameEngine.ts:968-971`
- **Description** : Si ≥2 joueurs ont des chips, on démarre la main suivante immédiatement après `determineWinner`. Le client n'a pas le temps d'afficher les cartes du showdown. Le user voit les cartes 100ms puis la main repart.
- **Recommandation** : flag `nextHandReadyAt` dans `gameStates` + bouton manuel ou délai serveur via `ctx.scheduler.runAfter`.

#### B5.2 — Joueur à 0 chips reste assis
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:986` (`prepareNextHand`)
- **Description** : `prepareNextHand` reset les `cards`/`currentBet` mais ne supprime pas le joueur fauché. Au `startGameInternal:84`, il est compté dans `players.length` et peut recevoir des cartes.
- **Recommandation** : filtrer `chips > 0` avant deal, ou marquer `eliminated`.

#### B5.3 — Rotation dealer cassée après élimination en cash heads-up
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:1008-1011` + `:1195` (`endGame`)
- **Description** : `prepareNextHand` saute correctement les éliminés. Mais en heads-up cash après élimination, `playersWithChips.length<2` → `endGame` qui reset dealer à 0 : la rotation de la prochaine session est cassée.
- **Recommandation** : ne reset le dealer qu'à la création d'une nouvelle session, pas en `endGame`.

#### B5.4 — Aucun message « élimination »
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:prepareNextHand`
- **Description** : Pas d'`addActionToFeed` quand un joueur tombe à 0.
- **Recommandation** : ajouter un événement `eliminated` dans `gameActions`.

#### B5.5 — `handNumber` incrémenté côté client ET côté serveur
- **Sévérité** : 🟢
- **Localisation** : `src/core/hooks/useGameLogic.ts:285` vs `convex/core/gameEngine.ts:196`
- **Description** : Incohérence possible.
- **Recommandation** : source unique côté serveur.

---

## B6 — Sortir de la table (`convex/players.ts:88-119`)

#### B6.1 — Impossible de quitter pendant une main
- **Sévérité** : 🔴
- **Localisation** : `convex/players.ts:110-112`
- **Description** : `leaveTable` jette `"Cannot leave table during active game"` dès que `phase !== "waiting"`. Si un joueur déconnecte / ferme l'onglet, il reste bloqué dans la main, le tour s'arrête sur lui jusqu'au timeout (qui repose sur `forcePlayerFold` cassé, cf. B4.2).
- **Recommandation** : autoriser `leaveTable` avec fold automatique.

#### B6.2 — Pas de gestion du créateur qui quitte
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:leaveTable`
- **Description** : Supprime juste le doc `players` ; `tables.creatorId` n'est pas patché. Sémantique floue (à vérifier dans `startGame` si check explicite).
- **Recommandation** : transférer la propriété au joueur restant le plus ancien, ou fermer la table.

#### B6.3 — Pas de retour visuel « joueur parti »
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:leaveTable`
- **Description** : `leaveTable` ne logge rien dans `gameActions`. L'autre joueur voit juste son siège disparaître.
- **Recommandation** : `addActionToFeed` avec event `left`.

#### B6.4 — État solitaire après leave
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:leaveTable`
- **Description** : Si A reste seul après que B parte, `gameStates.phase` reste tel quel, pas de retour à `waiting`.
- **Recommandation** : reset si `< 2 joueurs`.

#### B6.5 — Aucune confirmation avant quit
- **Sévérité** : 🟢
- **Localisation** : `src/core/components/Game/PokerTable.tsx:824`
- **Description** : Appelle directement `onLeaveTable()` sans dialog.
- **Recommandation** : confirm modal.

---

## Suite

À la reprise de 0.B :
1. User exécute la checklist `2026-05-04-audit-fonctionnel-checklist.md` et remonte les anomalies de smoke (qui peuvent confirmer/affiner ces findings ou en ajouter).
2. Agent lance le harness `tests/legacy/audit-harness/index.mjs` (S1, S2, S3) et collecte les findings B7.S1.x, B7.S2.x, B7.S3.x.
3. Consolidation finale dans `2026-05-04-audit-fonctionnel-rapport.md`.
