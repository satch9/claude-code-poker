# Rapport d'audit fonctionnel — Phase 0.B

## Métadonnées

| Champ | Valeur |
|---|---|
| Date début | 2026-05-04 |
| Date fin | 2026-05-05 |
| Phase | 0.B — Audit fonctionnel |
| Spec source | `docs/superpowers/specs/2026-05-04-audit-fonctionnel-design.md` |
| Plan d'exécution | `docs/superpowers/plans/2026-05-04-audit-fonctionnel-0B.md` |
| Branche | `master` |
| Commit de référence (post-1.A) | `cb48258` (chore(vitest): retrait bail:1) |
| Déploiement Convex | dev `incredible-hedgehog-551` |
| URL testée | https://home-poker.vjdev.tech (déployée le 2026-05-04) |
| Méthode | Hybride : audit statique + smoke tests manuels (user) + harness Node multi-joueurs |

## Résumé exécutif

**Verdict global : 🔴 ROUGE.**

Une partie heads-up se déroule **partiellement** : auth, création de table, action de jeu, transitions de phase et showdown fonctionnent dans le cas nominal. **Mais** la détermination du gagnant est cassée (split annoncé à tort, pot non réparti équitablement), des cas critiques côté UX bloquent ou désynchronisent l'expérience (pas de rebuy en cash, départ de joueur invisible côté restant, message "en attente" persistant), et plusieurs validations serveur sont absentes. Le parcours "rejoindre par code" annoncé dans CLAUDE.md n'est pas implémenté.

**Total findings : 38** — 🔴 9 / 🟡 23 / 🟢 6.

Sources :
- 29 findings d'audit statique (sub-agent + grep ciblé) — parcours B1 à B6
- 9 findings runtime issus du smoke manuel (B-runtime.1 à B-runtime.9)
- Le harness multi-joueurs a confirmé un finding existant (B5.1) et n'en a pas révélé de nouveau (limitations harness pour les 2 autres scénarios)

Smoke checklist : **20 ✅ / 3 ⚠️ / 7 ❌ / 7 cases non testées** (bloqués ou hors flux reproductible).

Les fixes doivent être enchaînés en 5 lots (cf. section *Recommandations*). Le **lot B1** (5 findings 🔴 sur le moteur de jeu) débloque le MVP heads-up et conditionne le reste.

---

## Findings par parcours

### Parcours 1 — Auth (`convex/auth.ts`, `src/core/hooks/useAuth.ts`)

#### B1.1 — Hash password sans salt par utilisateur
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/auth.ts:78`
- **Description** : `data = encoder.encode(password + "salt")` — salt statique global, vulnérable rainbow tables.
- **Recommandation** : bcrypt/argon2 ou salt aléatoire par user.

#### B1.2 — Aucune validation format email / longueur password
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/auth.ts:5-10`
- **Description** : `signUpWithPassword` accepte n'importe quelle string.
- **Recommandation** : valider via Zod côté serveur.

#### B1.3 — `signOut` purement client
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `src/core/hooks/useAuth.ts:148-151`
- **Description** : Pas de mutation côté serveur, `lastSeen` non mis à jour.
- **Recommandation** : mutation `signOut`.

#### B1.4 — Pas de gestion d'erreur UI dans signUp/signIn (CONFIRMÉ runtime)
- **Sévérité** : 🟡
- **Source** : statique + smoke (cases 1.5, 1.6)
- **Localisation** : `src/core/hooks/useAuth.ts:96-142`
- **Description** : Les erreurs serveur (`Invalid email or password`, `User already exists`) ne sont **pas affichées dans l'UI** ; seulement visibles dans la console navigateur. Confirmé en runtime sur les 2 cas.
- **Recommandation** : centraliser le feedback (toast / inline).

#### B1.5 — `isLoading` ne reflète pas `userQuery` initial
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `src/core/hooks/useAuth.ts`
- **Description** : Flash de l'écran login au F5.
- **Recommandation** : intégrer `userQuery === undefined`.

---

### Parcours 2 — Création table (`convex/tables.ts`, `CreateTableForm.tsx`)

#### B2.1 — Aucune validation serveur des arguments
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/tables.ts:5-55`
- **Description** : `createTable` accepte `smallBlind=0`, `bigBlind<smallBlind`, `maxPlayers=1`, `startingStack≤0`. Validation seulement UI.
- **Recommandation** : valider au niveau de la mutation.

#### B2.2 — `inviteCode` faiblement aléatoire
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/tables.ts:22`
- **Description** : `Math.random().toString(36).substring(2,8).toUpperCase()`, pas crypto, pas d'unicité.
- **Recommandation** : `crypto.randomUUID()` tronqué + check unicité.

#### B2.3 — `inviteCode` non généré pour table publique
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/tables.ts:18-23`
- **Description** : Pas de moyen de partager une table publique par code.
- **Recommandation** : toujours générer.

#### B2.4 — Pas d'auto-seat du créateur (CONFIRMÉ runtime)
- **Sévérité** : 🟢
- **Source** : statique + smoke (case 2.3)
- **Localisation** : `convex/tables.ts` + `src/core/components/App/AppMain.tsx:45-61`
- **Description** : `handleTableCreated` ne fait pas `joinTable` ; le créateur doit cliquer un siège libre. UX dégradé.
- **Recommandation** : auto-join le créateur dans la même mutation `createTable` ou immédiatement après côté front.

---

### Parcours 3 — Rejoindre table (`convex/players.ts`)

#### B3.1 — Parcours « rejoindre par code » non implémenté (CONFIRMÉ runtime)
- **Sévérité** : 🔴
- **Source** : statique + smoke (case 3.1)
- **Localisation** : aucune query `getTableByInviteCode`, aucun écran de saisie côté front
- **Description** : Fonctionnalité annoncée dans CLAUDE.md mais absente. Workaround utilisé en smoke : la table privée listée à tort dans le lobby (cf. B-runtime.2) permet au 2e joueur de cliquer dessus.
- **Recommandation** : query `getTableByInviteCode` + écran de saisie + auto-join.

#### B3.2 — Race condition sur le dernier siège
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:joinTable`
- **Description** : 2 joins concurrents peuvent atterrir sur le même siège.
- **Recommandation** : index unique `(tableId, seatPosition)`.

#### B3.3 — `buyInAmount` non validé
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:67`
- **Description** : Pas de plafonnement vs `startingStack`.
- **Recommandation** : clamp côté serveur.

#### B3.4 — Erreurs en français mélangées avec messages anglais
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/players.ts`
- **Description** : Hétérogénéité i18n.
- **Recommandation** : harmoniser.

---

### Parcours 4 — Partie heads-up (`convex/core/gameEngine.ts`)

#### B4.1 — Cartes communautaires depuis un nouveau deck à chaque phase
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:642` et `:1431`
- **Description** : Chaque transition (`advanceToNextPhase`, `advanceToNextPhaseWithStateMachine`) fait `const deck = shuffleDeck(createDeck());` → flop/turn/river peuvent **dupliquer les hole cards**.
- **Reproduction harness** : non observé dans S1/S2/S3 (mains courtes / fold rapide). À reproduire en test unitaire.
- **Recommandation** : conserver `remainingDeck` dans `gameStates` au `startGame`.

#### B4.2 — `forcePlayerFold` cible une référence introuvable
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:1295`
- **Description** : `internal["internal/gameEngine"]` n'existe pas (le module s'appelle `core/gameEngine`). Le timeout fold côté serveur va crasher.
- **Recommandation** : corriger en `internal["core/gameEngine"]`.

#### B4.3 — `setTimeout` dans une mutation Convex
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:788`
- **Description** : Les mutations Convex ne peuvent pas invoquer du code après commit.
- **Recommandation** : `ctx.scheduler.runAfter`.

#### B4.4 — `setHandNumber` instable côté client
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `src/core/hooks/useGameLogic.ts:283-287`
- **Description** : Incrément à chaque entrée preflop avec `pot===0`, instable au réordonnancement.
- **Recommandation** : source unique côté serveur (cf. B5.5).

#### B4.5 — Détermination du gagnant heads-up coûteuse
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:828-838`
- **Description** : Sort O(n²) non-stable.
- **Recommandation** : trier une seule fois.

#### B4.6 — Logs verbeux en prod
- **Sévérité** : 🟢
- **Source** : statique + harness (visibles partout dans S1/S2/S3)
- **Localisation** : `convex/core/gameEngine.ts`
- **Description** : Emoji + dump full state à chaque action.
- **Recommandation** : guard `if (DEBUG)`.

---

### Parcours 5 — Multi-mains et élimination (`gameEngine.ts:944-1027`, `:1336-1367`)

#### B5.1 — `endHand` enchaîne `prepareNextHand` synchrone (CONFIRMÉ partiellement runtime)
- **Sévérité** : 🔴
- **Source** : statique + harness S2
- **Localisation** : `convex/core/gameEngine.ts:968-971`
- **Description** : Si ≥2 joueurs ont des chips, la main suivante démarre immédiatement. **Confirmé partiellement par S2** : après all-in 3-way, la phase passe directement de `preflop` à `waiting` (pot=0, sidePots=[]) sans repasser visiblement par `showdown`. À l'inverse, S3 (fold + checks → showdown) reste bien en phase `showdown` (`autoAdvance:false`), donc le bug ne touche que le path all-in.
- **Recommandation** : flag `nextHandReadyAt` ou délai serveur via `ctx.scheduler.runAfter`. Distinguer le path all-in (qui auto-advance) du path showdown standard.

#### B5.2 — Joueur à 0 chips reste assis (CONFIRMÉ runtime)
- **Sévérité** : 🟡
- **Source** : statique + smoke (case 5.5)
- **Localisation** : `convex/core/gameEngine.ts:986`
- **Description** : `prepareNextHand` ne supprime pas le joueur fauché. Confirmé en runtime : le perdant reste à 0 chips.
- **Recommandation** : filtrer `chips > 0` ou marquer `eliminated` (cf. aussi B-runtime.8).

#### B5.3 — Rotation dealer cassée après élimination en cash heads-up
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:1008-1011` + `:1195`
- **Description** : `endGame` reset le dealer à 0 — la rotation de la prochaine session est cassée.
- **Recommandation** : ne reset le dealer qu'à création nouvelle session.

#### B5.4 — Aucun message « élimination »
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:prepareNextHand`
- **Description** : Pas d'`addActionToFeed` quand un joueur tombe à 0.
- **Recommandation** : ajouter `eliminated` dans `gameActions`.

#### B5.5 — `handNumber` incrémenté côté client ET serveur
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `src/core/hooks/useGameLogic.ts:285` vs `convex/core/gameEngine.ts:196`
- **Description** : Source double.
- **Recommandation** : source unique côté serveur.

---

### Parcours 6 — Sortir de la table (`convex/players.ts:88-119`)

#### B6.1 — Impossible de quitter pendant une main
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/players.ts:110-112`
- **Description** : `leaveTable` jette si `phase !== "waiting"`. Combiné à B4.2 (forcePlayerFold cassé), la table peut rester bloquée sur un joueur déconnecté.
- **Recommandation** : autoriser leave avec fold automatique.

#### B6.2 — Pas de gestion du créateur qui quitte
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:leaveTable`
- **Description** : `tables.creatorId` non patché. Confirmé partiellement runtime (B-runtime.5 du parcours créateur OK, table conservée).
- **Recommandation** : transférer la propriété au joueur restant le plus ancien, ou fermer la table.

#### B6.3 — Pas de retour visuel « joueur parti » (CONFIRMÉ runtime)
- **Sévérité** : 🟡
- **Source** : statique + smoke (case 6.2)
- **Localisation** : `convex/players.ts:leaveTable`
- **Description** : Pas d'`addActionToFeed`. Confirmé runtime : voir B-runtime.9.
- **Recommandation** : `addActionToFeed` avec event `left`.

#### B6.4 — État solitaire après leave (CONFIRMÉ runtime)
- **Sévérité** : 🟡
- **Source** : statique + smoke (case 6.3)
- **Localisation** : `convex/players.ts:leaveTable`
- **Description** : Confirmé : message "en attente de joueurs" affiché côté restant, donc `players.length` baisse bien. Mais l'UI ne réagit pas correctement (cf. B-runtime.9).
- **Recommandation** : reset cohérent + propagation UI.

#### B6.5 — Aucune confirmation avant quit
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `src/core/components/Game/PokerTable.tsx:824`
- **Description** : Appel direct à `onLeaveTable()`.
- **Recommandation** : confirm modal.

---

## Findings runtime (smoke)

#### B-runtime.1 — UI table cassée sur mobile (portrait + paysage)
- **Sévérité** : 🟡
- **Source** : smoke (case 2.3)
- **Localisation** : `src/core/components/Game/PokerTable.tsx`, `useResponsiveClasses`, `useSeatPositioning`
- **Description** : Sur mobile (portrait et paysage), tout l'UI est collé en haut. Pas de tapis vert visible. Desktop OK.
- **Recommandation** : auditer les positions absolutes des `PlayerSeat` à <768px ; revoir `pokerTableContainer`/`tableContainer`/`pokerTableFelt`.

#### B-runtime.2 — Table privée listée dans le lobby public
- **Sévérité** : 🟡
- **Source** : smoke (case 3.1)
- **Localisation** : `convex/tables.ts:getPublicTables` ou `getTablesWithUserInfo`
- **Description** : `isPrivate: true` non filtré côté query.
- **Recommandation** : `q.eq("isPrivate", false)` pour les listes publiques.

#### B-runtime.3 — Bouton « Démarrer la partie » visible par tous les joueurs assis
- **Sévérité** : 🟡
- **Source** : smoke (case 4.1)
- **Localisation** : `src/core/components/Game/PokerTable.tsx:325-337`
- **Description** : Aucun check `currentPlayer.userId === table.creatorId`.
- **Recommandation** : restreindre côté UI **et** côté serveur.

#### B-runtime.4 — Message « en attente de joueurs » persiste à 2 joueurs
- **Sévérité** : 🟡
- **Source** : smoke (case 4.1)
- **Localisation** : à identifier dans `PokerTable.tsx`
- **Description** : Le message reste affiché malgré `players.length === maxPlayers`.
- **Recommandation** : conditionner sur `players.length < table.maxPlayers`.

#### B-runtime.5 — Détermination du gagnant fausse (split à tort en showdown 2 paires)
- **Sévérité** : 🔴
- **Source** : smoke (case 4.9)
- **Localisation** : `convex/utils/handEvaluator.ts` (mapping rank introduit en commit `3844844` du fix 1.A) et/ou `convex/core/gameEngine.ts:determineWinners`
- **Description** : Reproduction concrète :
  - Eliott : A♠ 6 (privées)
  - Satch9 : 4 Q (privées)
  - Board : A 9 10 Q 10
  - Résultat affiché : split du pot
  - Résultat correct : Eliott gagne (2 paires AA + 1010, kicker Q vs 2 paires QQ + 1010, kicker A — paire haute A > Q)
- **Hypothèse forte** : le mapping `rank - 1` ajouté pour le bug Royal Flush (commit 3844844) a cassé la comparaison entre 2 mains de même rank avec kickers différents.
- **Recommandation** : test unitaire reproducteur dans `tests/poker-integrity.test.js`, puis correction de la chaîne `evaluateHandRobust` → `determineWinners` (probablement revert partiel du mapping).

#### B-runtime.6 — Bouton « Continuer » au showdown visible aux 2 joueurs
- **Sévérité** : 🟡
- **Source** : smoke (case 4.9)
- **Localisation** : `src/core/components/Game/ShowdownResults.tsx` ou `PokerTable.tsx`
- **Description** : Bouton réservé au créateur en théorie, visible à tous (idem B-runtime.3).
- **Recommandation** : check `userId === creatorId` UI + serveur.

#### B-runtime.7 — Pot non réparti équitablement malgré annonce de split
- **Sévérité** : 🔴
- **Source** : smoke (case 4.10)
- **Localisation** : `convex/core/gameEngine.ts:determineWinner` + distribution du pot
- **Description** : Annonce split mais distribution effective inégale entre les 2 joueurs. Incohérence message UI ↔ DB.
- **Recommandation** : à auditer ensemble avec B-runtime.5. `determineWinners` retourne probablement plusieurs `playerIds` mais la fonction de distribution ne les traite pas correctement.

#### B-runtime.8 — Pas de rebuy en cash game après élimination
- **Sévérité** : 🟡
- **Source** : smoke (cases 5.5, 5.6)
- **Localisation** : `convex/core/gameEngine.ts` + UI post-showdown
- **Description** : Joueur à 0 jetons en cash bloqué (pas de rebuy proposé).
- **Recommandation** : mutation `rebuy(tableId, userId, amount)` + bouton UI conditionné par `gameType === "cash"`. Distinguer cash vs tournament dans la logique de fin de main.

#### B-runtime.9 — Départ d'un joueur non répercuté dans l'UI du joueur restant
- **Sévérité** : 🟡
- **Source** : smoke (case 6.2)
- **Localisation** : `src/core/components/Game/PokerTable.tsx` + `convex/players.ts:leaveTable`
- **Description** : DB supprime le doc `players` (le message "en attente de joueurs" apparaît) mais le siège du parti reste affiché côté restant. Désynchro.
- **Recommandation** : vérifier le rafraîchissement de `useQuery(getTablePlayers)` ou le mémo des `seats`. Ajouter event `left` (cf. B6.3).

---

## Findings harness multi-joueurs

#### B7.S1.1 — Postflop ordering non testé (limitation harness)
- **Sévérité** : 🟢 (info)
- **Source** : harness S1
- **Description** : En préflop, la BB se voit refuser une action `call` quand `currentBet === player.bet` (`Nothing to call`). Le moteur attend un `check` (l'option de la BB). Le harness n'a pas de fallback, donc le tour ne se clôt pas et le postflop n'est pas atteint. **Comportement engine correct**, limitation harness.
- **Recommandation** : améliorer le harness pour basculer vers `check` quand `call` est refusé pour cause de "Nothing to call".

#### B7.S2.1 — Side pots non testés faute de stacks différenciés (limitation harness)
- **Sévérité** : 🟢 (info)
- **Source** : harness S2
- **Description** : Tous les bots créés avec `startingStack=200`, donc les 3 all-ins produisent un pot unique (pas de side pot). Pas de bug constaté, mais le scénario S2 ne valide pas la gestion réelle des side pots.
- **Recommandation** : étendre le harness avec une étape "creuser les stacks" (jouer X mains pour différencier) avant de tester les all-ins.

#### B7.S3.1 — Comportement post-fold correct
- **Sévérité** : ✅ (info)
- **Source** : harness S3
- **Description** : Après un fold du premier joueur, le moteur ne reconvoque pas le foldé, fait passer correctement le tour aux 2 restants jusqu'à `showdown`. État `showdown` préservé (`autoAdvance:false`). Bon comportement sur ce path.

---

## Tableau récapitulatif

| ID | Sév. | Source | Titre | Localisation |
|----|------|--------|-------|--------------|
| B1.1 | 🔴 | statique | Hash password sans salt par user | `convex/auth.ts:78` |
| B2.1 | 🔴 | statique | Aucune validation serveur createTable | `convex/tables.ts:5-55` |
| B3.1 | 🔴 | statique + smoke | Parcours rejoindre par code non implémenté | front + `convex/tables.ts` |
| B4.1 | 🔴 | statique | Cartes communautaires nouveau deck par phase | `gameEngine.ts:642,1431` |
| B4.2 | 🔴 | statique | forcePlayerFold référence introuvable | `gameEngine.ts:1295` |
| B5.1 | 🔴 | statique + harness | Showdown invisible (path all-in) | `gameEngine.ts:968-971` |
| B6.1 | 🔴 | statique | Impossible de quitter pendant main | `players.ts:110-112` |
| B-runtime.5 | 🔴 | smoke | Gagnant faux (split à tort 2 paires) | `handEvaluator.ts` (régression 3844844) |
| B-runtime.7 | 🔴 | smoke | Pot non réparti équitablement | `gameEngine.ts:determineWinner` |
| B1.2 | 🟡 | statique | Validation email/password manquante | `auth.ts:5-10` |
| B1.3 | 🟡 | statique | signOut purement client | `useAuth.ts:148-151` |
| B1.4 | 🟡 | statique + smoke | Pas de gestion erreur UI auth | `useAuth.ts:96-142` |
| B2.2 | 🟡 | statique | inviteCode non crypto | `tables.ts:22` |
| B2.3 | 🟡 | statique | inviteCode pas généré pour public | `tables.ts:18-23` |
| B3.2 | 🟡 | statique | Race condition siège | `players.ts:joinTable` |
| B3.3 | 🟡 | statique | buyInAmount non validé | `players.ts:67` |
| B4.3 | 🟡 | statique | setTimeout dans mutation | `gameEngine.ts:788` |
| B4.4 | 🟡 | statique | handNumber instable client | `useGameLogic.ts:283-287` |
| B4.5 | 🟡 | statique | determineWinners O(n²) | `gameEngine.ts:828-838` |
| B5.2 | 🟡 | statique + smoke | Joueur 0 chips reste assis | `gameEngine.ts:986` |
| B5.3 | 🟡 | statique | Rotation dealer cassée post élimination | `gameEngine.ts:1008-1011` |
| B5.4 | 🟡 | statique | Pas de message élimination | `prepareNextHand` |
| B6.2 | 🟡 | statique | Pas de gestion créateur quitte | `players.ts:leaveTable` |
| B6.3 | 🟡 | statique + smoke | Pas de retour visuel joueur parti | `players.ts:leaveTable` |
| B6.4 | 🟡 | statique + smoke | État solitaire après leave | `players.ts:leaveTable` |
| B-runtime.1 | 🟡 | smoke | UI table cassée mobile | `PokerTable.tsx` responsive |
| B-runtime.2 | 🟡 | smoke | Table privée dans lobby public | `tables.ts:getPublicTables` |
| B-runtime.3 | 🟡 | smoke | Bouton Démarrer visible par tous | `PokerTable.tsx:325-337` |
| B-runtime.4 | 🟡 | smoke | Message "en attente" persiste | `PokerTable.tsx` |
| B-runtime.6 | 🟡 | smoke | Bouton Continuer showdown visible par tous | `ShowdownResults.tsx` |
| B-runtime.8 | 🟡 | smoke | Pas de rebuy en cash game | `gameEngine.ts` + UI |
| B-runtime.9 | 🟡 | smoke | Départ joueur non répercuté UI | `PokerTable.tsx` + `leaveTable` |
| B1.5 | 🟢 | statique | isLoading pas reflète userQuery | `useAuth.ts` |
| B2.4 | 🟢 | statique + smoke | Pas d'auto-seat créateur | `AppMain.tsx:45-61` |
| B3.4 | 🟢 | statique | Erreurs i18n hétérogènes | `players.ts` |
| B4.6 | 🟢 | statique + harness | Logs verbeux en prod | `gameEngine.ts` |
| B5.5 | 🟢 | statique | handNumber double source | `useGameLogic.ts` + `gameEngine.ts` |
| B6.5 | 🟢 | statique | Pas de confirmation quit | `PokerTable.tsx:824` |
| B7.S1.1 | 🟢 | harness | Limitation harness postflop | — |
| B7.S2.1 | 🟢 | harness | Limitation harness stacks égaux | — |

---

## Recommandations pour le plan 1.B

5 lots proposés. Le **lot B1** est prioritaire absolu : il débloque le MVP heads-up.

### Lot B1 — Moteur de jeu (priorité absolue, ~6-8h)

**Findings** : B-runtime.5 (régression handEvaluator), B-runtime.7 (pot non distribué), B4.1 (deck par phase), B4.2 (forcePlayerFold cassé), B5.1 (showdown invisible all-in), B6.1 (leave bloqué pendant main).

**Objectif** : faire qu'une partie heads-up se déroule du préflop au showdown avec gagnant correct, distribution correcte, et états cohérents.

**Étapes recommandées** :
1. **Test unitaire reproducteur** pour B-runtime.5 (Eliott vs Satch9). Le test doit échouer avant correction.
2. **Investigation `handEvaluator.ts`** : revérifier le mapping `rank - 1` introduit en `3844844`. Si la régression est confirmée, soit revert + autre approche pour le Royal Flush, soit corriger les comparaisons.
3. **Vérifier la distribution du pot** dans `determineWinner` : si plusieurs gagnants, partage entier équitable + reste au premier joueur après dealer.
4. **B4.1** : conserver `remainingDeck` dans `gameStates` au `startGame`, tirer les community cards depuis ce deck.
5. **B4.2** : corriger la référence `internal["core/gameEngine"]`.
6. **B5.1** : faire converger les paths all-in et showdown standard (passage explicite par `phase: showdown` avec `autoAdvance:false`, ou délai `ctx.scheduler.runAfter`).
7. **B6.1** : autoriser `leaveTable` pendant main avec fold auto.

### Lot B2 — Auth & validation serveur (~2-3h)

**Findings** : B1.1 (hash sans salt), B2.1 (validation createTable), B3.3 (buyInAmount non validé), B1.2 (validation email/password), B1.4 (gestion erreur UI auth), B1.3 (signOut serveur).

**Objectif** : sécurité minimum + retours UI propres sur toutes les actions auth/table.

### Lot B3 — UX & cohérence créateur (~2-3h)

**Findings** : B-runtime.3 (Démarrer visible par tous), B-runtime.6 (Continuer visible par tous), B-runtime.4 (message en attente), B-runtime.9 (départ joueur non répercuté), B6.3, B6.4, B2.4 (auto-seat créateur), B-runtime.2 (table privée dans lobby).

**Objectif** : cohérence UI ↔ DB et droits du créateur clarifiés.

### Lot B4 — Module rejoindre par code + invitation (~2-3h)

**Findings** : B3.1, B2.3, B2.2.

**Objectif** : compléter le parcours de jonction par code annoncé dans CLAUDE.md (recoupe avec module Invitations futur — au minimum implémenter la jonction directe via code).

### Lot B5 — Cash game complet (rebuy + élimination) (~3-4h)

**Findings** : B-runtime.8 (rebuy), B5.2 (joueur 0 chips), B5.3 (rotation dealer), B5.4 (message élimination), B6.2 (créateur quitte).

**Objectif** : distinguer cash vs tournament dans la logique fin de main, gérer rebuy et états post-élimination correctement.

### Hors lot 1.B — à reporter

- **B-runtime.1** (mobile) → lot UI mobile dédié (~3-4h, hors MVP heads-up sur desktop)
- **B4.3, B4.4, B4.5, B4.6, B5.5, B6.5, B1.5, B3.4** → dette technique mineure, à grouper en lot polish ultérieur
- **B7.S1.1, B7.S2.1** → améliorations du harness pour la phase tests étendus

### Estimation globale lots B1-B5 : ~15-21h

Le lot B1 reste le critère de sortie strict de la phase 1.B.

---

## Hors-scope mais critique

### Sécurité (rappel des findings 0.A non traités)

- **S1** (du rapport 0.A) : `players.cards` exposé côté client → audit Convex queries `getTablePlayers` etc.
- **S2** : `users.password` stocké en table standard → vérifier qu'aucune query ne renvoie le hash
- **S3** : override version `@auth/core 0.37.4` suspect

Phase **0.C / 1.C** dédiée à venir.

### Régression du fix 1.A

Le finding 🔴 **B-runtime.5** semble être une **régression** introduite par le commit `3844844` du fix 1.A (ajout du mapping `rank - 1` pour corriger le bug Royal Flush). Cela illustre l'importance de tests unitaires pour les changements de logique poker — à intégrer dans les retombées du Lot B1.

---

*Fin du rapport. Prêt pour le brainstorm de la phase 1.B.*
