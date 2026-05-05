# Spec — Fix fonctionnel 1.B

**Date** : 2026-05-05
**Phase** : 1.B (implémentation)
**Source** : `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md`
**Phase précédente** : 1.A (fix technique, terminée — 8 commits, typecheck/lint/test verts)
**Phase suivante** : 0.C (audit production-ready, sécurité, perf) ou modules (Invitations, Notifications, Tournaments)

## Contexte

L'audit fonctionnel 0.B a révélé **38 findings** (9 🔴 / 23 🟡 / 6 🟢) sur le MVP heads-up. Le finding 🔴 le plus critique (`B-runtime.5`) est une **régression introduite par le fix 1.A** (commit `3844844`) : le mapping `rank - 1` ajouté pour corriger le bug Royal Flush a cassé les comparaisons 2-paires entre joueurs. Cela illustre l'importance des tests unitaires de logique poker — qui seront posés en TDD strict comme premier pas de cette phase.

## Objectif

Atteindre un état où une partie heads-up se déroule de bout en bout :
- Auth propre avec retours UI sur les erreurs
- Création de table validée côté serveur
- Showdown visible avec gagnant correct et pot bien réparti
- Leave gérable même pendant une main
- UI cohérente avec l'état serveur (départ joueur visible, message d'attente correct)

## Périmètre — IN

- **Lot B1** Moteur de jeu (priorité absolue, ~6-8h)
- **Lot B2** Auth & validation serveur (~2-3h)
- **Lot B3** UX & cohérence créateur (~2-3h)

## Périmètre — OUT (reporté)

- **Lot B4** Module rejoindre par code → phase dédiée (parcours nouveau, pas un fix)
- **Lot B5** Cash game complet (rebuy, élimination cash) → phase dédiée
- Mobile responsive (`B-runtime.1`) → phase UI dédiée
- Logique tournoi (B5.x dette tournoi) → phase modules
- Sécurité approfondie (S1/S2/S3 du rapport 0.A, hash bcrypt) → phase 0.C

## Décisions de fix

### Lot B1 — Moteur de jeu

#### Approche TDD stricte (premier pas obligatoire)

Avant tout fix, écrire ~10 tests dans `tests/poker-integrity.test.js` qui doivent **échouer** sur le code actuel. Ces tests fixent la spécification du moteur :

| # | Test | Vérifie |
|---|---|---|
| 1 | Royal Flush A♠K♠Q♠J♠T♠ | `name === "Royal Flush"`, `rank === 9` |
| 2 | Wheel straight A-2-3-4-5 | détection correcte du straight |
| 3 | Reproduction B-runtime.5 (Eliott vs Satch9) | Eliott gagne, pas split |
| 4 | 2 paires AA-1010 (kicker Q) vs QQ-1010 (kicker A) | Eliott gagne (paire haute A > Q) |
| 5 | 1 paire AA + KQJ vs AA + KQ9 | comparaison séquentielle des kickers |
| 6 | Flush vs Straight | flush gagne |
| 7 | Full house Ks over 3s vs Js over 5s | full Ks gagne |
| 8 | Vrai split (2 mains identiques sur board public) | bien split |
| 9 | Trips A vs Trips K | trips A gagne |
| 10 | High card AKQJ9 vs AKQJ8 | comparaison séquentielle des cartes |

Une fois rouges, corriger `convex/utils/handEvaluator.ts` + `convex/core/gameEngine.ts:determineWinners` jusqu'à ce qu'ils passent.

**Stratégie de fix attendue** : la régression vient du mapping `rank - 1` ajouté en `3844844`. Probablement revert partiel ou détection du Royal Flush avant le mapping. À décider après lecture du code et exécution des tests rouges (le code parle).

#### Autres fixes B1 (séquentiels après tests poker verts)

| Finding | Décision |
|---|---|
| **B-runtime.7** pot non réparti | Dans `determineWinner`, si `winners.length > 1` : partage entier `pot / winners.length`, reste (`pot % winners.length`) au premier joueur après le dealer. Distribution explicite par boucle sur `winners`. |
| **B4.1** deck par phase | Conserver `remainingDeck: string[]` dans `gameStates` au `startGame` (après deal des hole cards). À chaque transition (`flop`, `turn`, `river`), `pop` les cartes nécessaires depuis `remainingDeck` au lieu de re-créer un deck. Migration : tables existantes ont `remainingDeck` vide → recalculé au prochain `startGame`. |
| **B4.2** forcePlayerFold cible introuvable | `convex/core/gameEngine.ts:1295` : `internal["internal/gameEngine"]` → `internal["core/gameEngine"]`. |
| **B5.1** showdown invisible | `ctx.scheduler.runAfter(3000, internal.core.gameEngine.startNextHandInternal, { tableId })`. La phase reste `showdown` pendant 3 secondes, puis le serveur démarre la main suivante automatiquement. Pas de bouton manuel. |
| **B6.1** leave pendant main | `leaveTable` ne jette plus si `phase !== "waiting"`. Si c'est le tour du joueur partant : déclenche un `playerAction(fold)` avant suppression du doc. Sinon : suppression directe. Cas heads-up : si plus qu'un joueur reste, transition vers `waiting`. |

### Lot B2 — Auth & validation serveur

| Finding | Décision |
|---|---|
| **B1.1** hash sans salt par user | SHA-256 avec **salt aléatoire 16 bytes** par user, généré via `crypto.getRandomValues`, stocké dans `users.passwordSalt: v.string()` (nouveau champ schéma). Migration : nouveaux signups = nouveau format. Vieux comptes (sans `passwordSalt`) ré-hashés au prochain signin réussi. Pas de bcrypt (lift trop gros, reporté en 0.C). |
| **B1.2** validation email/password | Création de `convex/shared/validation.ts` (nouveau fichier) avec schémas Zod : email regex, password ≥ 8 chars. Mutations `signUpWithPassword`, `signInWithPassword` validés via les schémas. |
| **B2.1** validation `createTable` | Mêmes schémas Zod côté mutation. Cas validés : `smallBlind > 0`, `bigBlind >= 2*smallBlind`, `maxPlayers ∈ [2, 9]`, `startingStack >= 10*bigBlind`, `name` non vide ≤ 50 chars. |
| **B3.3** `buyInAmount` non validé | Clamp dans `joinTable` : `0 < buyInAmount ≤ table.startingStack`. Si non fourni, default = `table.startingStack`. |
| **B1.3** `signOut` côté client | Nouvelle mutation `signOut(userId)` qui patch `lastSeen`. Frontend `useAuth.signOut()` l'appelle avant le state reset local. |
| **B1.4** pas de gestion erreur UI auth | `useAuth` catch les exceptions, expose `error: string \| null` dans son retour. Composants `LoginForm`, `EmailPasswordForm` affichent un message inline rouge sous le formulaire. |

### Lot B3 — UX & cohérence créateur

| Finding | Décision |
|---|---|
| **B-runtime.3** bouton Démarrer visible par tous | Front : ajouter `currentPlayer.userId === table.creatorId` à la condition d'affichage. Serveur : ajouter check d'autorisation dans `startGame` mutation. |
| **B-runtime.6** bouton Continuer showdown | **Retiré entièrement de l'UI**. Avec le scheduler du B1.5, le délai automatique de 3s suffit. |
| **B-runtime.4** message "en attente de joueurs" persiste | Conditionner sur `players.length < table.maxPlayers && gameState.phase === "waiting"`. |
| **B-runtime.9** départ joueur non répercuté UI | Audit du `useMemo seats` dans `PokerTable.tsx` : la dépendance doit inclure `players`. Si déjà OK, audit du `useQuery(getTablePlayers)` côté Convex. + Ajout de `addActionToFeed("left", playerName)` dans `leaveTable`. |
| **B6.3** pas de retour visuel joueur parti | Couvert par B-runtime.9 (`addActionToFeed`). |
| **B6.4** état solitaire après leave | Si `players.length < 2` après leave : reset `gameState` (phase=waiting, pot=0, communityCards=[], remainingDeck=[]). |
| **B2.4** auto-seat créateur | Côté front : `handleTableCreated` chaîne `createTable` → `joinTable(creatorId, seatPosition: 0)`. Pas de modif serveur. |
| **B-runtime.2** table privée dans lobby public | `convex/tables.ts:getPublicTables` et `getTablesWithUserInfo` : ajouter `q.eq("isPrivate", false)` dans le filtre. |

## Ordre d'exécution

L'ordre est important. Chaque étape débloque la suivante (ou n'introduit pas de régression sur ce qui marche).

1. **Lot B1 — Tests TDD poker** (les 10 tests rouges)
2. **Lot B1 — Fix handEvaluator + determineWinners** (les 10 tests verts)
3. **Lot B1 — Distribution du pot** (B-runtime.7)
4. **Lot B1 — Deck unique** (B4.1, schéma + logique)
5. **Lot B1 — forcePlayerFold** (B4.2)
6. **Lot B1 — Showdown delay scheduler** (B5.1)
7. **Lot B1 — Leave during hand** (B6.1)
8. **Lot B2 — Zod schemas** + validation auth (B1.2)
9. **Lot B2 — Validation createTable** (B2.1) + buyInAmount (B3.3)
10. **Lot B2 — Hash + salt par user** (B1.1)
11. **Lot B2 — signOut serveur** (B1.3)
12. **Lot B2 — UI errors auth** (B1.4)
13. **Lot B3 — Droits créateur** (B-runtime.3) + retrait Continuer (B-runtime.6)
14. **Lot B3 — UI cohérence** (B-runtime.4, B-runtime.9, B6.3, B6.4)
15. **Lot B3 — Auto-seat créateur** (B2.4)
16. **Lot B3 — Filtre table privée** (B-runtime.2)

## Critères de sortie 1.B

### Automatiques

```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npx vitest run      # exit 0, tous tests poker passent (les ~10 nouveaux + ceux existants)
```

### Manuel (smoke test)

Sur `https://home-poker.vjdev.tech`, 2 sessions navigateur :

1. Signup 2 comptes neufs (pas de compte préexistant à réutiliser)
2. Joueur A crée une table cash, 2 joueurs, blindes 5/10, stack 1000 → A est auto-assis siège 0
3. Joueur B rejoint via le lobby (la table privée n'apparaît pas, donc créer en publique pour ce smoke)
4. A clique "Démarrer la partie" (bouton visible seulement à A) → la main commence
5. Jouer 2 mains complètes : préflop → flop → turn → river → showdown visible 3s → main suivante
6. Vérifier sur 1 main : gagnant correct, pot crédité au bon joueur
7. Joueur B clique "Quitter" pendant une main → fold auto + leave + A voit l'événement dans l'action feed
8. Joueur A reste seul → message "en attente de joueurs"

## Stratégie de commits

Granularité : un commit par lot d'étape ou par étape majeure :

- `test(poker): ajouter 10 tests TDD pour la régression handEvaluator/determineWinners`
- `fix(handEvaluator): corriger la régression introduite par 3844844 (split à tort sur 2 paires)`
- `fix(gameEngine): distribution correcte du pot multi-gagnants`
- `fix(gameEngine): conserver le deck unique entre phases`
- `fix(gameEngine): corriger référence forcePlayerFold`
- `feat(gameEngine): showdown visible 3s via scheduler`
- `fix(players): autoriser leaveTable pendant une main avec fold auto`
- `feat(validation): Zod schemas pour auth et createTable`
- `feat(auth): salt aléatoire par user`
- `feat(auth): mutation signOut + UI error feedback`
- `fix(ui): droits créateur sur Démarrer + retrait Continuer`
- `fix(ui): cohérence message attente, départ joueur, état solitaire`
- `feat(ui): auto-seat du créateur + filtre table privée lobby`

Chaque commit signe avec `viny1976@gmail.com` / `satch9`. Pas de `--no-verify`.

## Risques

- **R1** Le mapping `rank - 1` cache d'autres bugs. Si les 10 tests TDD passent mais qu'une régression apparaît sur un cas absent, on étend la batterie de tests + scope. Politique : si > 3h supplémentaires nécessaires, escalade.
- **R2** `scheduler.runAfter` requiert que `internal.core.gameEngine.startNextHandInternal` existe et soit importable. À vérifier en lecture de `convex/_generated/api.d.ts` au début du Lot B1 step 6. Si absent, créer une mutation interne dédiée.
- **R3** Migration des hash : les comptes test existants (Eliott, Satch9, viny1976, audit-bot-*) ne pourront plus se logger avec leur ancien mot de passe. **Mitigation** : on les supprime via mutation admin temporaire au début du Lot B2 hash, le user refait des signups propres.
- **R4** Le finding `B-runtime.9` (départ non répercuté UI) peut nécessiter du débogage approfondi côté React (memo, dépendances). Si > 1h sans avancée, escalade.
- **R5** TDD ralentit les premières heures de B1. C'est voulu (cf. la leçon de la régression `3844844`).

## Hypothèses

- **H1** Le déploiement Convex dev `incredible-hedgehog-551` reste utilisable. Le harness 0.B y a créé des tables de test ; on les ignore (pas besoin de les nettoyer pour 1.B).
- **H2** `npx convex dev` est lancé pendant l'implémentation pour push-auto les modifs `convex/`.
- **H3** Le user (Vincent) est dispo pour le smoke test final (~15-20 min).

## Suite

Une fois 1.B validé par le user (auto + smoke), invoquer `superpowers:brainstorming` pour la phase **0.C (audit production-ready, sécurité, perf)** ou pour les **modules** (Invitations, Notifications, Tournaments).
