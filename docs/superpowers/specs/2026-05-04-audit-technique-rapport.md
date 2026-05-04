# Rapport d'audit technique — Phase 0.A

## Métadonnées

| Champ | Valeur |
|---|---|
| Date | 2026-05-04 |
| Phase | 0.A — Audit technique |
| Spec source | `docs/superpowers/specs/2026-05-04-audit-technique-design.md` |
| Plan d'exécution | `docs/superpowers/plans/2026-05-04-audit-technique-0A.md` |
| Branche | `master` |
| Commit de référence | `e2af4e6` (chore(audit): ignorer .audit-tmp/) |
| Périmètre | `src/` + `convex/` (hors `convex/_generated/`, `tests/legacy/`, `docs/`) |
| Outils | tsc 5.8.3, eslint 8.57.1, vitest 3.2.4 |

## Résumé exécutif

**Verdict global : 🔴 ROUGE.**

Aucune des 5 commandes critiques (`typecheck`, `lint`, `test`, `build`, `dev`) ne passe en l'état. Le `lint` est cassé par une mauvaise référence dans `.eslintrc.cjs`, le `typecheck` remonte 24 erreurs (dont 4 vraies erreurs de typage, le reste `noUnusedLocals/Parameters`), 1 test échoue (Royal Flush), et le `build` (qui chaîne `tsc && vite build`) échoue donc aussi. Plusieurs zones de code mort (modules `convex/utils/` orphelins, configurations `src/config/*` jamais consommées) gonflent la surface du projet sans bénéfice. Le schéma Convex déclare une table `invitations` totalement inutilisée et un sous-objet `modules.tournament` mort-né.

**Total findings : 38** — 🔴 12 / 🟡 22 / 🟢 4.

Les fixes doivent être enchaînés en 5 lots (cf. section Recommandations). Le lot 1 (5 findings 🔴 stratégiques) débloque toutes les commandes en ~1h-1h30 et conditionne le reste.

---

## Findings par axe

### Axe 1 — Typecheck

`npm run typecheck` → exit 2, **24 erreurs TS** (`.audit-tmp/typecheck.log`).

#### A1.1 — Type `GameState`/`Player` non importé dans `convex/utils/validation.ts`
- **Sévérité** : 🔴
- **Localisation** : `convex/utils/validation.ts:16,17,212,243` (TS2304 ×6)
- **Description** : Le fichier référence `GameState` et `Player` sans aucun `import`. Bloque `tsc`.
- **Recommandation** : Soit importer ces types (ex. depuis `src/shared/types/index.ts` adapté au contexte Convex, ou créer des types backend dans `convex/shared/types.ts`), soit supprimer ce fichier (cf. A4.3 — orphelin).

#### A1.2 — Prop `style` invalide sur `<PlayingCard>` (GameAnimations)
- **Sévérité** : 🔴
- **Localisation** : `src/core/components/Game/GameAnimations.tsx:190` (TS2322)
- **Description** : `<PlayingCard style={...}>` mais `PlayingCardProps` n'accepte pas `style`. Bloque `tsc` et `build`.
- **Recommandation** : Étendre `PlayingCardProps` avec `style?: React.CSSProperties` ou retirer l'attribut, selon l'intention visuelle de l'animation.

#### A1.3 — Variables/imports `noUnusedLocals` (15 occurrences, src + convex)
- **Sévérité** : 🔴
- **Localisation** :
  - `convex/auth.ts:91` (`ctx`)
  - `convex/utils/handEvaluator.ts:122,212,241,464` (`handString`, `evaluateShortDeckFallback`, `isShortDeck`, `game`)
  - `convex/utils/poker.ts:146` (`maxPlayers`)
  - `convex/utils/raceConditionPrevention.ts:202,240` (`versionManager`, `target`)
  - `convex/utils/validation.ts:30,83,157` (`table`, `context`, `minRaise`)
  - `src/core/components/App/AppMain.tsx:1` (`useMemo`)
  - `src/core/components/Auth/SignInButton.tsx:13` (`login`)
  - `src/core/components/Auth/UserProfile.tsx:20` (`isTablet`)
  - `src/core/components/Game/BettingControls.tsx:28` (`currentBet`)
  - `src/core/hooks/useBreakpoint.ts:25` (`forceMobileForIOS`)
  - `src/core/hooks/useGameLogic.ts:21` (`timeoutIds`)
- **Description** : `tsconfig.json` active `noUnusedLocals` et `noUnusedParameters`. Chaque occurrence fait échouer `tsc`. Sévérité 🔴 car bloque réellement `typecheck`/`build`.
- **Recommandation** : Préfixer par `_` ce qui est volontairement gardé (`_ctx`, `_table`), supprimer le reste. À traiter en une passe au lot 1.

---

### Axe 2 — Lint

`npm run lint` → exit 2, **0 fichier analysé** (échec config). `.audit-tmp/lint.log`.

#### A2.1 — Référence config `@typescript-eslint/recommended` introuvable
- **Sévérité** : 🔴
- **Localisation** : `.eslintrc.cjs:6`
- **Description** : ESLint cherche `@typescript-eslint/recommended` mais la syntaxe correcte pour étendre une config issue d'un plugin est `'plugin:@typescript-eslint/recommended'`. Aucun fichier n'est jamais lint, donc `--max-warnings 0` rejette tout.
- **Recommandation** : Remplacer la chaîne par `'plugin:@typescript-eslint/recommended'`. Re-lancer `npm run lint` pour découvrir les vrais warnings (couverts par le lot 2 après ce fix).

#### A2.2 — Plugin `@typescript-eslint` non listé dans `plugins`
- **Sévérité** : 🟡
- **Localisation** : `.eslintrc.cjs` (clé `plugins`)
- **Description** : Le `plugins: ['react-refresh']` ne déclare pas explicitement `@typescript-eslint`. Avec ESLint 8 + parser `@typescript-eslint/parser`, ce n'est pas bloquant si l'`extends` charge le plugin, mais c'est fragile et risque d'amplifier le problème A2.1 après fix.
- **Recommandation** : Ajouter `'@typescript-eslint'` à `plugins`.

#### A2.3 — `react-refresh/only-export-components` à warn + `--max-warnings 0`
- **Sévérité** : 🟡
- **Localisation** : `.eslintrc.cjs:14-17` + `package.json` script `lint`
- **Description** : Combinaison auto-bloquante : la moindre violation de la règle (warning) fait échouer le script.
- **Recommandation** : Soit relâcher `--max-warnings 0` à `--max-warnings 5`, soit promouvoir/ignorer la règle en connaissance de cause. À traiter une fois A2.1 corrigé.

> Note : la liste exhaustive des findings ESLint réels ne pourra être établie qu'après A2.1+A2.2. Ce rapport ne préjuge pas du nombre de violations restantes.

---

### Axe 3 — Tests

`npx vitest run` → exit 1. **23 tests dans `tests/poker-integrity.test.js`, 1 échec, 22 skippés à cause de `bail: 1`** (`.audit-tmp/test.log`).

#### A3.1 — Test "Royal Flush" échoue (handEvaluator)
- **Sévérité** : 🔴
- **Localisation** : `tests/poker-integrity.test.js:38` ↔ `convex/utils/handEvaluator.ts`
- **Description** : `evaluateHandRobust(...)` retourne `Straight Flush` au lieu de `Royal Flush`. Le test échoue, et `bail: 1` (cf. `vitest.config.js`) interrompt l'exécution.
- **Recommandation** : Bug réel à corriger dans `handEvaluator.ts` (logique de détection du Royal Flush). À investiguer dans le lot dédié (logique métier — hors lot 1 typecheck/lint).

#### A3.2 — `bail: 1` masque l'état réel des 22 autres tests
- **Sévérité** : 🟡
- **Localisation** : `vitest.config.js:9`
- **Description** : Un seul échec arrête tout : impossible de savoir si les 22 tests restants passent ou échouent. Pour un audit, c'est aveuglant.
- **Recommandation** : Retirer `bail: 1` ou le passer à un seuil > 5. Visibilité avant productivité en CI.

#### A3.3 — Module critique `gameEngine` sans test direct
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts` (1300+ lignes), `convex/internal/gameEngine.ts`
- **Description** : Aucun fichier `*.test.*` n'importe `core/gameEngine` ou `internal/gameEngine`. Seul `tests/legacy/scripts/automated-9player-test.js` (archivé, hors-scope) y faisait référence. Les transitions de phases (preflop→flop→turn→river→showdown) ne sont pas testées en cours.
- **Recommandation** : Créer `tests/gameEngine.test.ts` couvrant au minimum : démarrage de main, flow d'actions, transition de phase, side pots — cible Phase 1 ou plus tard.

#### A3.4 — Module `convex/auth.ts` sans test
- **Sévérité** : 🟡
- **Localisation** : `convex/auth.ts`
- **Description** : `signUpWithPassword`, `signInWithPassword`, hashage password : zéro test. Risque sécurité.
- **Recommandation** : Ajouter tests unitaires pour hash/verify et flux d'erreur.

#### A3.5 — Modules `tables.ts`, `players.ts`, `users.ts`, `users/stats.ts` sans test
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts`, `convex/players.ts`, `convex/users.ts`, `convex/users/stats.ts`
- **Description** : Toutes les mutations CRUD (joinTable, leaveTable, createTable, etc.) sont non testées. Couverture < 20% sur la surface métier critique.
- **Recommandation** : Cible CLAUDE.md = > 80% sur logique métier ; gap massif. À planifier sur une phase dédiée tests post-fix.

#### A3.6 — Tests écrits en JavaScript pur, pas TypeScript
- **Sévérité** : 🟢
- **Localisation** : `tests/poker-integrity.test.js`
- **Description** : Le projet est TypeScript mais les tests sont `.js`. Pas de vérification de typage des assertions. `vitest.config.js` filtre uniquement `tests/**/*.test.js`.
- **Recommandation** : Renommer en `.test.ts` et étendre `include` à `*.test.ts` pour bénéficier du typage. Faible priorité.

---

### Axe 4 — Code mort & doublons

#### A4.1 — Module `convex/utils/raceConditionPrevention.ts` orphelin
- **Sévérité** : 🟡
- **Localisation** : `convex/utils/raceConditionPrevention.ts` (entier)
- **Description** : Aucun import dans `src/` ni `convex/` (hors `_generated`). Exports `versionManager`, `target` non utilisés (cf. A1.3). Module mort.
- **Recommandation** : Supprimer le fichier, ou si la logique est destinée à un futur usage, l'isoler dans un dossier `convex/_drafts/` non inclus par `tsconfig`.

#### A4.2 — Module `convex/utils/enhancedSidePots.ts` orphelin
- **Sévérité** : 🟡
- **Localisation** : `convex/utils/enhancedSidePots.ts`
- **Description** : Aucun import dans le repo. Fichier mort.
- **Recommandation** : Supprimer ou fusionner avec `convex/utils/poker.ts` si la logique apporte une valeur (à vérifier avant suppression).

#### A4.3 — Module `convex/utils/validation.ts` orphelin
- **Sévérité** : 🟡
- **Localisation** : `convex/utils/validation.ts`
- **Description** : Aucun import. Cause aussi A1.1 (types non importés). Sa suppression résoudrait A1.1 et 3 occurrences de A1.3 d'un coup.
- **Recommandation** : Supprimer le fichier (la logique de validation effective vit ailleurs : `convex/core/gameEngine.ts`). Si la sécurité serveur évoquée doit revivre, la réécrire correctement plus tard.

#### A4.4 — `src/core/utils/timeoutManager.ts` orphelin
- **Sévérité** : 🟡
- **Localisation** : `src/core/utils/timeoutManager.ts`
- **Description** : Aucun import. Classes `TimeoutManager`, `PokerTimeoutManager`, hook `useTimeoutManager` jamais utilisés.
- **Recommandation** : Supprimer.

#### A4.5 — `src/shared/utils/moduleLoader.ts` orphelin (chaîne avec config/modules)
- **Sévérité** : 🟡
- **Localisation** : `src/shared/utils/moduleLoader.ts` + `src/config/modules.ts` + `src/config/features.ts`
- **Description** : `moduleLoader.ts` importe `config/modules.ts`, mais aucun composant final n'importe `moduleLoader`, `MODULE_CONFIG`, `FEATURE_FLAGS`, `useModule`, `ConditionalFeature`. Toute la "module/feature plumbing" est inactive.
- **Recommandation** : Soit supprimer cette chaîne (3 fichiers) si Phase 1 ne l'active pas immédiatement, soit la câbler dans `App.tsx`. Décision produit avant décision technique.

#### A4.6 — `src/demo.tsx` + `src/core/components/UI/UIDemo.tsx` orphelins
- **Sévérité** : 🟢
- **Localisation** : `src/demo.tsx`, `src/core/components/UI/UIDemo.tsx`
- **Description** : `demo.tsx` n'est référencé par aucun entry-point (`main.tsx` charge `App`, pas `Demo`). `UIDemo` n'est utilisé que par `demo.tsx`.
- **Recommandation** : Soit ajouter une route dev (ex. `/demo`), soit supprimer ces 2 fichiers.

#### A4.7 — Exports backend morts dans `convex/users.ts`
- **Sévérité** : 🟡
- **Localisation** : `convex/users.ts`
- **Description** : `getCurrentUser`, `createUser`, `createOrUpdateUser`, `getUserByEmail`, `updateLastSeen` ne sont appelés ni côté front (`src/`) ni côté Convex (autres fichiers). Le front utilise `api.users.getUser`, `api.users.updateUserProfile`, `api.users.generateAvatarUploadUrl`, `api.users.getAvatarImageUrl` uniquement.
- **Recommandation** : Supprimer les exports inutilisés (5 fonctions). Garder `getUser`, `updateUserProfile`, `generateAvatarUploadUrl`, `getAvatarImageUrl`.

#### A4.8 — Export mort dans `convex/auth.ts` : `getCurrentSession`
- **Sévérité** : 🟡
- **Localisation** : `convex/auth.ts:90`
- **Description** : `getCurrentSession` (query) n'est jamais consommé.
- **Recommandation** : Supprimer ou documenter le cas d'usage prévu.

#### A4.9 — Export mort dans `convex/players.ts` : `resetPlayersForNewHand`
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:211`
- **Description** : Mutation jamais appelée (le reset se fait inline dans `gameEngine.ts`).
- **Recommandation** : Supprimer si redondante avec la logique de `gameEngine`, ou y rerouter `gameEngine` si plus claire.

#### A4.10 — Export mort dans `convex/tables.ts` : `getTableByInviteCode`
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts:128`
- **Description** : Aucun consommateur. Sera nécessaire pour le système d'invitations (Phase 2 selon CLAUDE.md), mais aujourd'hui mort.
- **Recommandation** : Conserver si la phase invitations démarre bientôt, sinon supprimer.

#### A4.11 — Helpers/utils mineurs dans `convex/utils/poker.ts`, `handEvaluator.ts`
- **Sévérité** : 🟢
- **Localisation** : `convex/utils/handEvaluator.ts:212` (`evaluateShortDeckFallback`), `convex/utils/poker.ts:146` (`maxPlayers` arg)
- **Description** : Fonctions/paramètres jamais consommés. Déjà repérés dans A1.3.
- **Recommandation** : Supprimer simultanément avec A1.3 (lot 1).

> **Pas de doublons détectés** : la fonction `getUserStats` n'existe que dans `convex/users/stats.ts` (le doublon historique évoqué dans la spec a déjà été nettoyé).

---

### Axe 5 — Cohérence schéma Convex

#### A5.1 — Table `invitations` déclarée mais jamais utilisée
- **Sévérité** : 🟡
- **Localisation** : `convex/schema.ts:112-130`
- **Description** : Aucun `db.insert("invitations")`, aucun `db.query("invitations")`, aucun `db.patch` sur cette table. Référencée uniquement comme type `Id<"invitations">` dans `src/shared/types/index.ts` et dans `tables.modules.invitations.pendingInvitations` (jamais alimenté). Système d'invitations non implémenté côté logique.
- **Recommandation** : Conserver le schéma SI la Phase 2 (invitations) démarre dans les semaines à venir, sinon retirer la table pour réduire la surface du déploiement.

#### A5.2 — Sous-objet `tables.modules.tournament` jamais alimenté
- **Sévérité** : 🟡
- **Localisation** : `convex/schema.ts:36-50`
- **Description** : Le bloc `modules.tournament` (blindStructure, currentBlindLevel, prizeStructure) n'est jamais inséré ni patché.
- **Recommandation** : Idem A5.1 : conserver si tournois imminents, sinon simplifier le schéma.

#### A5.3 — Sous-objet `tables.modules.invitations` jamais alimenté
- **Sévérité** : 🟡
- **Localisation** : `convex/schema.ts:51-54`
- **Description** : Idem A5.2 sur le sous-objet `invitations`.
- **Recommandation** : À corréler avec décision A5.1.

#### A5.4 — Champ `players.cards` lu côté client (fuite cartes privées)
- **Sévérité** : 🟡
- **Localisation** : `convex/schema.ts:67` + lectures côté front
- **Description** : Le champ `cards` (cartes privées) est dans la table `players` lue par les composants front. Selon CLAUDE.md "Card Security", les cartes privées doivent être protégées. À vérifier si la lecture est filtrée serveur-side selon l'utilisateur.
- **Recommandation** : Auditer les queries `players` (`getTablePlayers`, `getActivePlayers`, `getPlayerByUserAndTable`) pour confirmer que `cards` est masqué pour les autres joueurs. Hors-scope strict (sécurité, pas typecheck/lint) mais critique — voir section finale.

#### A5.5 — Index présents mais pas tous exploités
- **Sévérité** : 🟢
- **Localisation** : `convex/schema.ts` (indexes)
- **Description** : Les index `invitations.by_table`, `by_recipient`, `by_email`, `by_code` sont déclarés mais jamais utilisés (table A5.1 morte).
- **Recommandation** : Tomberont avec A5.1 si on supprime la table.

> **Pas de divergence inferredSchema détectée par audit statique** ; vérification réelle nécessite `npx convex dev` (hors-scope ici, signalé dans Axe 7).

---

### Axe 6 — Imports / cycles / fichiers orphelins frontend

#### A6.1 — Aucun import cassé détecté
- **Sévérité** : 🟢 (info)
- **Description** : Vérification statique de tous les imports relatifs dans `src/` et `convex/` : 100% résolus.

#### A6.2 — Aucun cycle détecté
- **Sévérité** : 🟢 (info)
- **Description** : Pas de cycle d'imports trouvé entre les modules `src/`. Architecture relativement plate.

#### A6.3 — Fichiers orphelins frontend (récap)
- **Sévérité** : 🟡 (déjà traités axe 4)
- **Description** : `src/demo.tsx`, `src/core/components/UI/UIDemo.tsx`, `src/core/utils/timeoutManager.ts`, `src/shared/utils/moduleLoader.ts`, `src/config/features.ts`, `src/config/modules.ts` (la chaîne config/modules est interconnectée mais l'ensemble est orphelin). Cf. A4.4, A4.5, A4.6.

---

### Axe 7 — Config & dépendances

#### A7.1 — Script `lint` cassé (cf. A2.1)
- **Sévérité** : 🔴
- **Localisation** : `.eslintrc.cjs`
- **Description** : Reporté ici pour le cadrage Config. Voir A2.1.

#### A7.2 — Script `build` non testable (cf. A1.x)
- **Sévérité** : 🔴
- **Localisation** : `package.json:7` (`"build": "tsc && vite build"`)
- **Description** : `build` chaîne `tsc` ; tant que A1.1/A1.2/A1.3 ne sont pas fixés, `build` échoue.
- **Recommandation** : Aucun fix propre — A1.x débloque automatiquement.

#### A7.3 — Dépendance `@auth/core` déclarée mais jamais importée
- **Sévérité** : 🟡
- **Localisation** : `package.json:dependencies`
- **Description** : Aucun `from "@auth/core"` dans `src/` ni `convex/`. Possiblement chargée transitivement par `@convex-dev/auth`, mais l'`overridden` `0.37.4` (vs `wanted` `0.34.3`) suggère un override manuel suspect.
- **Recommandation** : Vérifier si `@convex-dev/auth` la requiert vraiment, sinon retirer. Si elle est nécessaire, retirer l'override de version.

#### A7.4 — Dépendance `zod` déclarée mais jamais importée
- **Sévérité** : 🟡
- **Localisation** : `package.json:dependencies`
- **Description** : Zéro import. Le projet utilise `convex/values` à la place. CLAUDE.md évoque Zod comme intention initiale.
- **Recommandation** : Retirer si l'usage de `zod` n'est pas planifié. Sinon, l'introduire dans `convex/shared/validation.ts` (à créer).

#### A7.5 — Dépendances majeures en retard (Convex, Vite, ESLint, TypeScript-ESLint, React 19)
- **Sévérité** : 🟡
- **Localisation** : `.audit-tmp/outdated.log`
- **Description** : Liste résumée :
  - `convex` 1.25.2 → 1.37.0 (12 minors)
  - `vite` 5.4.19 → 8.0.10 (3 majors)
  - `eslint` 8.57.1 → 10.3.0 (2 majors, 8.x EOL)
  - `@typescript-eslint/*` 6.21.0 → 8.59.1 (2 majors)
  - `react/react-dom` 18.3.1 → 19.2.5 (1 major)
  - `tailwindcss` 3.4.17 → 4.2.4 (1 major)
  - `vitest` 3.2.4 → 4.1.5 (1 major)
- **Recommandation** : Lot 5 dédié, hors lot 1. Fixer Convex en priorité (production-critique), puis ESLint 8 → 9 (8.x EOL). React 19 et Vite 7+ peuvent attendre.

#### A7.6 — Dépendances mineures/patch en retard
- **Sévérité** : 🟢
- **Localisation** : `.audit-tmp/outdated.log`
- **Description** : `@fontsource/inter`, `tailwind-merge`, `postcss`, `zod` (patch), `autoprefixer` (patch).
- **Recommandation** : `npm update` en fin d'audit, faible risque.

#### A7.7 — `tsconfig.json` `include: ["src", "convex"]` couvre `convex/_generated/`
- **Sévérité** : 🟢
- **Localisation** : `tsconfig.json:32`
- **Description** : Pas un bug mais peut faire vibrer `noUnusedLocals` sur du code généré si Convex change. À surveiller.
- **Recommandation** : Optionnel : exclure `convex/_generated/` si problèmes futurs.

#### A7.8 — `tsconfig.node.json` n'inclut que `vite.config.ts` mais pas `vitest.config.js`
- **Sévérité** : 🟢
- **Localisation** : `tsconfig.node.json:7`
- **Description** : `vitest.config.js` n'est pas type-checké (extension `.js` + non inclus). Cosmétique.
- **Recommandation** : Renommer en `vitest.config.ts` et l'ajouter à `include`.

#### A7.9 — `convex/_generated/` présent
- **Sévérité** : 🟢 (info)
- **Description** : Contrairement à l'hypothèse du plan, `_generated` est présent (api/dataModel/server). Le typecheck peut donc tourner sans `convex dev`. Bon.

---

## Tableau récapitulatif

| ID | Sév. | Axe | Titre | Localisation |
|----|------|-----|-------|--------------|
| A1.1 | 🔴 | 1 | Types `GameState`/`Player` non importés | `convex/utils/validation.ts:16-243` |
| A1.2 | 🔴 | 1 | Prop `style` invalide sur PlayingCard | `src/core/components/Game/GameAnimations.tsx:190` |
| A1.3 | 🔴 | 1 | 15 unused locals/params (`noUnusedLocals`) | src + convex (15 lignes) |
| A2.1 | 🔴 | 2 | ESLint config `@typescript-eslint/recommended` introuvable | `.eslintrc.cjs:6` |
| A3.1 | 🔴 | 3 | Test "Royal Flush" échoue | `tests/poker-integrity.test.js:38` |
| A4.3 | 🟡 | 4 | `convex/utils/validation.ts` orphelin | `convex/utils/validation.ts` |
| A7.1 | 🔴 | 7 | Script `lint` cassé (alias A2.1) | `.eslintrc.cjs` |
| A7.2 | 🔴 | 7 | Script `build` cassé tant que A1.x non fixé | `package.json:7` |
| A2.2 | 🟡 | 2 | Plugin `@typescript-eslint` non listé | `.eslintrc.cjs` |
| A2.3 | 🟡 | 2 | `--max-warnings 0` + warn `react-refresh` | `.eslintrc.cjs` + `package.json` |
| A3.2 | 🟡 | 3 | `bail: 1` masque l'état des tests | `vitest.config.js:9` |
| A3.3 | 🟡 | 3 | `gameEngine` sans test | `convex/core/gameEngine.ts` |
| A3.4 | 🟡 | 3 | `auth.ts` sans test | `convex/auth.ts` |
| A3.5 | 🟡 | 3 | tables/players/users sans test | convex |
| A4.1 | 🟡 | 4 | `raceConditionPrevention.ts` orphelin | `convex/utils/raceConditionPrevention.ts` |
| A4.2 | 🟡 | 4 | `enhancedSidePots.ts` orphelin | `convex/utils/enhancedSidePots.ts` |
| A4.4 | 🟡 | 4 | `timeoutManager.ts` orphelin | `src/core/utils/timeoutManager.ts` |
| A4.5 | 🟡 | 4 | Chaîne `moduleLoader/config/*` orpheline | `src/shared/utils/moduleLoader.ts` + `src/config/*` |
| A4.7 | 🟡 | 4 | 5 exports morts dans `convex/users.ts` | `convex/users.ts` |
| A4.8 | 🟡 | 4 | `getCurrentSession` mort | `convex/auth.ts:90` |
| A4.9 | 🟡 | 4 | `resetPlayersForNewHand` mort | `convex/players.ts:211` |
| A4.10 | 🟡 | 4 | `getTableByInviteCode` mort | `convex/tables.ts:128` |
| A5.1 | 🟡 | 5 | Table `invitations` jamais utilisée | `convex/schema.ts:112` |
| A5.2 | 🟡 | 5 | `modules.tournament` jamais utilisé | `convex/schema.ts:36` |
| A5.3 | 🟡 | 5 | `modules.invitations` jamais utilisé | `convex/schema.ts:51` |
| A5.4 | 🟡 | 5 | `players.cards` potentielle fuite client | `convex/schema.ts:67` |
| A7.3 | 🟡 | 7 | `@auth/core` déclaré non importé | `package.json` |
| A7.4 | 🟡 | 7 | `zod` déclaré non importé | `package.json` |
| A7.5 | 🟡 | 7 | Deps majeures obsolètes (convex, eslint, vite, react, tailwind, vitest) | `package.json` |
| A3.6 | 🟢 | 3 | Tests en `.js` au lieu de `.ts` | `tests/poker-integrity.test.js` |
| A4.6 | 🟢 | 4 | `demo.tsx` + `UIDemo.tsx` orphelins | `src/demo.tsx`, `src/core/components/UI/UIDemo.tsx` |
| A4.11 | 🟢 | 4 | Helpers mineurs morts dans poker/handEvaluator | `convex/utils/*` |
| A5.5 | 🟢 | 5 | Index `invitations.*` morts | `convex/schema.ts` |
| A6.1 | 🟢 | 6 | Aucun import cassé (info) | — |
| A6.2 | 🟢 | 6 | Aucun cycle d'imports (info) | — |
| A6.3 | 🟢 | 6 | Orphelins frontend (déjà axe 4) | — |
| A7.6 | 🟢 | 7 | Deps patch obsolètes | `package.json` |
| A7.7 | 🟢 | 7 | `tsconfig.json` couvre `_generated` | `tsconfig.json:32` |
| A7.8 | 🟢 | 7 | `vitest.config.js` non type-checké | `tsconfig.node.json` |
| A7.9 | 🟢 | 7 | `convex/_generated/` présent (info) | — |

---

## Recommandations pour le plan 1.A

### Lot 1 — Débloquer les commandes (priorité absolue, ~1h-1h30)

**Findings** : A1.1, A1.2, A1.3, A2.1, A2.2, A2.3, A7.1, A7.2.

**Objectif** : faire passer `typecheck`, `lint`, `build` (le `dev` suit automatiquement).

Étapes :
1. Fix `.eslintrc.cjs` : `'plugin:@typescript-eslint/recommended'` + ajouter `@typescript-eslint` à `plugins` (A2.1, A2.2).
2. Décider de garder ou non `validation.ts`. Si suppression (recommandé) → A1.1 + 3 occurrences A1.3 résolues d'un coup, doublonne A4.3.
3. Étendre `PlayingCardProps` ou retirer `style` (A1.2).
4. Préfixer les locals/params inutilisés par `_` ou les supprimer (A1.3 restant).
5. Décider du seuil `--max-warnings` (A2.3).
6. Rerunner `typecheck`, `lint`, `build` → vert.

### Lot 2 — Nettoyage code mort backend (1h30, post-lint vert)

**Findings** : A4.1, A4.2, A4.3 (si pas dans lot 1), A4.7, A4.8, A4.9, A4.10, A4.11.

**Objectif** : retirer ~5 fichiers + ~8 exports morts dans `convex/`. Réduit la surface avant les fixes plus risqués.

⚠️ Précaution : avant chaque suppression, vérifier qu'aucune mention ne subsiste (rg). Garder un commit par fichier supprimé pour faciliter le revert.

### Lot 3 — Nettoyage code mort frontend (1h)

**Findings** : A4.4, A4.5, A4.6, A6.3.

**Objectif** : Aligner front avec produit réel. Décision produit nécessaire pour `src/config/modules.ts` + `moduleLoader.ts` (Phase 1 active le système de modules ?).

### Lot 4 — Cohérence schéma Convex (2h, décision produit)

**Findings** : A5.1, A5.2, A5.3, A5.5.

**Objectif** : Aligner `schema.ts` sur ce qui est réellement utilisé. Décision binaire :
- Option A — Conserver les tables/champs en attente d'implémentation (Phase 2/Tournois). Documenter dans un README schéma.
- Option B — Retirer maintenant, ré-introduire à la phase ad-hoc.

### Lot 5 — Couverture de tests + Bug Royal Flush (3h-4h)

**Findings** : A3.1 (bug logique handEvaluator), A3.2 (`bail: 1`), A3.3, A3.4, A3.5, A3.6.

**Objectif** : 
1. Fix A3.1 (vrai bug métier dans handEvaluator).
2. Retirer `bail: 1` pour avoir une vue complète.
3. Ajouter tests pour `gameEngine`, `auth`, `tables`, `players` (sans viser >80% en un coup, viser le smoke test critique : 10-15 tests par module).

### Lot 6 — Dépendances (1h-2h, à isoler)

**Findings** : A7.3, A7.4, A7.5, A7.6, A7.7, A7.8.

**Objectif** : Mettre à jour ce qui est sûr (patches), upgrader Convex en priorité, retirer `@auth/core` et `zod` si confirmés inutiles. Ne PAS upgrader React 19 / Vite 7+ / Tailwind 4 / ESLint 9 dans ce lot — chaque major nécessite un mini-projet dédié (breaking changes documentés).

### Estimation globale lots 1-6 : ~9h-12h

Sur 70 fichiers TS/TSX, c'est cohérent avec la nature des findings (peu de gros refactoring, beaucoup de petites coupures).

---

## Hors-scope mais critique

### S1 — `players.cards` exposé côté client (sécurité)

`players.cards` (cartes privées) est dans une table standard, lue par les hooks `usePlayers`. Selon CLAUDE.md (Security Considerations / Card Security), les cartes privées doivent être inaccessibles aux autres joueurs. **Action urgente recommandée** :
- Auditer manuellement les queries `getTablePlayers`, `getActivePlayers`, `getPlayerByUserAndTable` (`convex/players.ts`).
- Confirmer que le `cards` field est masqué (renvoyer `[]` ou ne pas inclure le champ) pour les `userId !== ctx.auth.getUserIdentity()`.
- Si la fuite est confirmée → c'est un bug 🔴 sécurité, à traiter avant tout déploiement public.

### S2 — Schéma `users.password` stocké en table standard

`users.password` est dans la table `users` (donc lisible par toute query qui retourne un user). Vérifier que toutes les queries renvoyant un user élident `password`. Risque de leak de hash via `getUser`, `getUserByEmail`, etc.

### S3 — Override de version `@auth/core 0.37.4` vers `wanted 0.34.3`

`npm outdated` indique `Latest: 0.34.3` < `Current: 0.37.4`. Override manuel suspect. Possible risque de version non-publiée ou tag `latest` obsolète. À investiguer.

---

*Fin du rapport. Prêt pour le brainstorm de la phase 1.A.*
