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

## Findings runtime supplémentaires (collectés pendant la checklist smoke)

#### B-runtime.1 — UI table cassée sur mobile (portrait + paysage)
- **Sévérité** : 🟡
- **Source** : smoke checklist case 2.3
- **Localisation** : `src/core/components/Game/PokerTable.tsx` (responsiveClasses, useSeatPositioning, useResponsiveClasses)
- **Description** : Sur mobile (portrait et paysage), tout l'UI de la table (sièges, cartes, sidebar) est collé en haut de l'écran. Pas de tapis vert oval visible. Desktop OK.
- **Reproduction** : ouvrir `https://home-poker.vjdev.tech` sur mobile, créer une table, cliquer sur un siège.
- **Recommandation** : auditer les classes `pokerTableContainer`, `tableContainer`, `pokerTableFelt` dans `useResponsiveClasses` ; vérifier les positions absolutes des `PlayerSeat` calculées par `useSeatPositioning` à des largeurs <768px.

#### B-runtime.2 — Table privée listée dans le lobby public
- **Sévérité** : 🟡
- **Source** : smoke checklist case 3.1
- **Localisation** : `convex/tables.ts:getPublicTables` (ou `getTablesWithUserInfo`)
- **Description** : Une table créée avec `isPrivate: true` apparaît tout de même dans la liste publique du lobby, accessible à tout user. Le flag `isPrivate` n'est pas filtré.
- **Recommandation** : filtrer côté query `q.eq("isPrivate", false)` pour les listes publiques.

#### B-runtime.3 — Bouton "Démarrer la partie" visible par tous les joueurs assis
- **Sévérité** : 🟡
- **Source** : smoke checklist case 4.1 (avancé)
- **Localisation** : `src/core/components/Game/PokerTable.tsx:325-337`
- **Description** : La condition d'affichage du bouton est `phase=waiting && players.length>=2 && currentPlayer` — aucun check sur `userId === table.creatorId`. N'importe quel joueur assis peut démarrer la partie.
- **Recommandation** : ajouter `currentPlayer.userId === table.creatorId` à la condition. Côté serveur, ajouter aussi le check dans `startGame` mutation.

#### B-runtime.4 — Message "en attente de joueurs" persiste après que la 2e place soit prise
- **Sévérité** : 🟡
- **Source** : smoke checklist case 4.1
- **Localisation** : à identifier (probablement `PokerTable.tsx` ou un composant de header info)
- **Description** : Le message d'info "en attente de joueurs" reste affiché alors que `players.length === maxPlayers === 2`. Le démarrage de la partie marche mais le message ne disparaît pas (ou ne disparaît qu'après un événement ultérieur).
- **Recommandation** : conditionner le message sur `players.length < table.maxPlayers`.

#### B-runtime.5 — Détermination du gagnant fausse (split à tort en showdown 2 paires)
- **Sévérité** : 🔴
- **Source** : smoke checklist case 4.9
- **Localisation** : `convex/utils/handEvaluator.ts` (mapping rank pokersolver introduit en commit 3844844 / Task 7 du fix 1.A) et/ou `convex/core/gameEngine.ts:determineWinners`
- **Description** : Reproduction concrète :
  - Joueur Eliott : cartes privées A♠ 6
  - Joueur Satch9 : cartes privées 4 Q
  - Board (community) : A 9 10 Q 10
  - Résultat affiché : **partage du pot**
  - Résultat correct : **Eliott gagne** (2 paires AA + 1010, kicker Q) face à Satch9 (2 paires QQ + 1010, kicker A) — la paire haute A > Q tranche.
  - Hypothèse forte : le mapping `rank - 1` ajouté pour le bug Royal Flush (commit 3844844) a peut-être cassé la comparaison entre 2 mains de même `rank` mais avec kickers différents. Ou `determineWinners` ne compare pas correctement les kickers en cas d'égalité de rank.
- **Reproduction** :
  - Lancer `home-poker.vjdev.tech` avec 2 comptes
  - Provoquer un showdown avec ces cartes (difficile à reproduire sans deck contrôlé — voir si harness peut forcer un scénario)
  - OU : test unitaire ciblé sur `evaluateHandRobust` + `determineWinners` avec ces 2 mains
- **Recommandation** :
  - Reproduire en test unitaire d'abord (ajouter dans `tests/poker-integrity.test.js` ou nouveau fichier)
  - Vérifier la chaîne `evaluateHandRobust` → score → comparaison
  - Probablement un revert partiel du mapping `rank - 1` ou correction du calcul de score qui tient compte des kickers

#### B-runtime.6 — Bouton "Continuer" au showdown visible aux 2 joueurs
- **Sévérité** : 🟡
- **Source** : smoke checklist case 4.9 (remarque user)
- **Localisation** : `src/core/components/Game/ShowdownResults.tsx` ou `PokerTable.tsx`
- **Description** : Au showdown, un bouton "Continuer" s'affiche aux 2 joueurs, alors qu'il devrait être réservé au créateur (cohérent avec B-runtime.3 sur le bouton démarrer).
- **Recommandation** : ajouter check `currentPlayer.userId === table.creatorId` (et idem côté serveur dans la mutation correspondante).

#### B-runtime.7 — Pot non réparti équitablement malgré annonce de split
- **Sévérité** : 🔴
- **Source** : smoke checklist case 4.10
- **Localisation** : `convex/core/gameEngine.ts:determineWinner` + distribution du pot
- **Description** : Le système annonce un partage du pot ("split") au showdown, mais les jetons ne sont pas répartis équitablement entre les 2 joueurs. Incohérence directe entre le message affiché et la distribution effective.
- **Reproduction** : couplé à B-runtime.5 (gagnant faux annoncé split), résultat des stacks finaux inégaux entre les 2 joueurs.
- **Recommandation** : faire converger l'annonce et la distribution. Probable cause : `determineWinners` retourne plusieurs `playerIds` (split), mais la fonction de distribution écrase/perd le détail. À auditer ensemble avec B-runtime.5.

## Suite

À la reprise de 0.B :
1. User exécute la checklist `2026-05-04-audit-fonctionnel-checklist.md` et remonte les anomalies de smoke (qui peuvent confirmer/affiner ces findings ou en ajouter).
2. Agent lance le harness `tests/legacy/audit-harness/index.mjs` (S1, S2, S3) et collecte les findings B7.S1.x, B7.S2.x, B7.S3.x.
3. Consolidation finale dans `2026-05-04-audit-fonctionnel-rapport.md`.
