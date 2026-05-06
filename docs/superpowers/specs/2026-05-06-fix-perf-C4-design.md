# Spec — Fix perf C4

**Date** : 2026-05-06
**Phase** : C4 (implémentation)
**Source** : `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md` — Lot C4
**Phase précédente** : 1.C (fix sécu, terminée)
**Phase suivante** : C5 (deps majeures), modules (Tournaments), ou triage 🟢

## Contexte

L'audit 0.C a flaggé 9 findings 🟡 perf et 0 🔴. Le code est fonctionnel mais avec des inefficacités identifiées : N+1 sur les user lookups, payload bloaté en showdown, rerenders cascade depuis `PokerTable`, lobby et table bundled ensemble. Aucun n'est bloquant, tous sont à traiter pour préparer une ouverture publique.

La phase 1.C ayant migré l'auth et appliqué le filtrage cards/remainingDeck, certaines queries (`getTablePlayers`, `getShowdownResults`) sont en zone de réécriture récente — les fixes C4 doivent préserver les protections sécu mises en place.

## Objectif

Appliquer les 9 fixes 🟡 perf du Lot C4. À la fin de C4, l'app supporte sans dégradation perceptible un lobby de 50 tables et une partie 9 joueurs simultanés (objectif non chiffré, validé par smoke fonctionnel).

## Périmètre — IN

- C6.1 : N+1 user lookup `getTablePlayers` / `getActivePlayers`
- C6.2 : N+1 showdown 3 passes
- C6.3 : N+1 `getPublicTables` / `getTablesWithUserInfo` → dénormalisation `playerCount`
- C6.4 : payload bloaté `getShowdownResults` → projection ciblée
- C6.5 : `startGame` db.get en boucle post-blinds
- C7.2 : `seats` recréé PokerTable + cascade rerender → `React.memo(PlayerSeat)` + `useMemo(seats)`
- C7.4 : props inline instables (`seatGeom`, `seatAngle`)
- C7.5 : queries `useGameLogic` toutes actives → conditionner via `"skip"` selon phase
- C8.1 : lobby + PokerTable bundled → `React.lazy()` + Suspense

## Périmètre — OUT (reporté)

- Findings 🟢 (C7.1 quickRaiseAmounts memo, C7.3 helper blind position recréés, C8.3 lazy sub-composants Game, C8.4 vite manualChunks, C8.2 pokersolver côté serveur OK) : triage post-C4
- Mesure perf chiffrée (P50/P95, bundle size avant/après) : hors scope C4 (cf. décision Q2 = trust-the-fix)
- C5 (deps majeures `convex` 1.25→1.37, `vite` 5→8) : phase dédiée

## Décisions clés (locks brainstorm)

| Lock | Choix |
|---|---|
| Scope | Les 9 findings 🟡 perf |
| Stratégie de mesure | Trust-the-fix (patterns documentés safe), pas d'instrumentation |
| Smoke | Pragmatique — automatique typecheck/lint/test à chaque étape ; manuel ciblé après étapes à risque (3, 6+7, 9) |
| Tests TDD | Pas de tests perf dédiés ; les 14 tests sécu de 1.C servent de filet anti-régression |

## Décomposition en 9 étapes

À chaque étape, `npm run typecheck && npm run lint && npx vitest run` doit retourner exit 0. Un commit par étape.

| # | Finding | Fix | Effort |
|---|---|---|---|
| 1 | C6.1 | `Promise.all` sur les `db.get(userId)` dans `getTablePlayers` et `getActivePlayers` | ~20min |
| 2 | C6.2 | Pré-charger les `users` une fois en `Map<userId, user>` avant les boucles showdown, réutiliser dans les 3 passes | ~30min |
| 3 | C6.3 | Dénormaliser `playerCount: number` sur `tables`, mise à jour atomique au join/leave/wipeAccounts | ~45min |
| 4 | C6.4 | Projection ciblée `{ userId, name, handRank, cards, isWinner }` dans `getShowdownResults` | ~20min |
| 5 | C6.5 | `Promise.all` sur les db.get post-blinds dans `startGame` | ~10min |
| 6 | C7.2 | `React.memo(PlayerSeat)` + `useMemo(seats, [players, dealerPosition, currentPlayerPosition, ...])` | ~30min |
| 7 | C7.4 | Mémoriser `seatGeom`, `seatAngle` quand passés à PlayerSeat memoized (ou les calculer par seat dans le composant memoized) | ~20min |
| 8 | C7.5 | Conditionner `getAvailableActions`/`getShowdownResults` selon phase via `"skip"` Convex dans `useGameLogic` | ~20min |
| 9 | C8.1 | `React.lazy(PokerTable)` + `React.lazy(CreateTableForm)` dans `AppMain` + Suspense fallback (spinner centré) | ~30min |

**Total : ~3h45.**

L'ordre est conçu pour que :
- Les fixes backend (1-5) précèdent les fixes frontend (6-9). Si on régresse côté serveur, on le détecte avant de toucher au front.
- Étape 6 (memo PlayerSeat) avant étape 7 (props inline) : sans memo, les props inline n'impactent rien ; avec memo, les props inline cassent la mémorisation. L'ordre 6→7 verrouille progressivement.
- Étape 8 (skip queries) après étapes 1-5 : si on conditionne les queries trop tôt, on se prive de signal pendant qu'on modifie le backend.
- Étape 9 (lazy) en dernier : c'est la modification la plus visible et la plus risquée pour la navigation, à isoler du reste.

## Critères de sortie

### Automatiques (par étape)

```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npx vitest run      # exit 0, 14 tests sécu C1 toujours verts
```

### Smoke ciblé après étapes à risque

- **Après étape 3** (dénormalisation `playerCount`) : créer table, joindre 2è joueur, quitter — vérifier compteur cohérent côté lobby (pas de désync).
- **Après étapes 6+7** (memo PlayerSeat) : jouer une main heads-up complète, vérifier que cartes / animations push-to-pot / surbrillance joueur actif s'affichent correctement.
- **Après étape 9** (lazy load) : démarrer l'app, ouvrir lobby, créer/rejoindre table — vérifier qu'un Suspense fallback s'affiche brièvement et que la navigation lobby ↔ table fonctionne.

### Smoke final post-étape 9

1. Signin → créer table → 2è compte rejoint → jouer 1 main heads-up complète → showdown → main suivante démarre
2. DevTools Network : payload `getShowdownResults` ciblé (pas d'objets `player` complets), `getTablePlayers` raisonnable
3. DevTools Profiler (informel) : action "fold" ne re-render pas tous les `PlayerSeat` non concernés

## Stratégie de commits

Un commit par étape, format :

- `perf(convex): batch user lookups dans getTablePlayers/getActivePlayers`
- `perf(convex): pré-charger users une fois en showdown (3 passes → 1)`
- `perf(convex): dénormaliser playerCount sur tables (lobby N+1)`
- `perf(convex): projection ciblée getShowdownResults`
- `perf(convex): batch user lookups post-blinds startGame`
- `perf(ui): React.memo(PlayerSeat) + useMemo(seats) PokerTable`
- `perf(ui): mémoriser seatGeom/seatAngle pour stabilité memo PlayerSeat`
- `perf(ui): conditionner queries useGameLogic selon phase`
- `perf(ui): lazy-load PokerTable + CreateTableForm + Suspense`

Chaque commit signe avec `viny1976@gmail.com` / `satch9`. Pas de `--no-verify`.

## Risques

- **R1 — Memo PlayerSeat casse les animations CSS-in-JS.** Mitigation : tester push-to-pot après étapes 6+7. Si une animation ne déclenche plus, identifier la prop causale et la garder dans le diff (ne pas tout mémoriser aveuglément). En dernier recours, désactiver memo sur le composant qui anime.
- **R2 — Dénormalisation `playerCount` désynchronisée.** Mitigation : update atomique dans la même mutation que l'insert/delete du player. Convex single-mutation = transaction. Pas de path d'écriture concurrent à `tables.playerCount` autre que join/leave.
- **R3 — Lazy load casse la navigation.** Mitigation : `Suspense` au-dessus de toute la zone Game (pas par sous-composant), fallback rapide. Tester transition lobby → table sans flash.
- **R4 — `"skip"` sur queries useGameLogic casse l'auto-refresh.** Mitigation : tester transition turn → river → showdown ; les queries doivent reprendre vie automatiquement quand `phase === ...` redevient vrai. Convex queries reactives, donc trivial.
- **R5 — Régression sécu 1.C.** Le filtrage cards/sanitize touche les mêmes queries que C6.1/C6.2. Mitigation : `npx vitest run tests/security-c1.test.ts` après chaque étape qui touche les queries Convex (étapes 1, 2, 3, 4, 5).

## Hypothèses

- **H1** — Pas de migration de données nécessaire post-wipe pour étape 3 (table `tables` vide).
- **H2** — Suspense fallback simple suffit (spinner centré sur fond `poker-green-800`, pas de design particulier).
- **H3** — Convex `"skip"` (utiliser `"skip"` comme args pour `useQuery`) fonctionne avec la version 1.25 installée.

## Suite

Après validation user de C4 (auto + smoke final), invoquer `superpowers:brainstorming` pour la phase suivante :
- **C5** (deps majeures `convex` 1.25→1.37, `vite` 5→8)
- **Module Tournaments** (annoncé dans CLAUDE.md, jamais implémenté)
- Triage des 🟢 résiduels et préparation pré-prod
