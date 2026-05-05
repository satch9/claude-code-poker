# Spec — Audit production-ready 0.C

**Date** : 2026-05-05
**Phase** : 0.C (audit, livre un rapport — pas de fix)
**Phase précédente** : 1.B (fix fonctionnel, terminée)
**Phase suivante** : 1.C (fix sécu + perf, à brainstormer après validation du rapport 0.C)

## Contexte

Les phases 0.A (audit technique) et 0.B (audit fonctionnel) ont produit deux rapports avec 38 findings chacun, suivis des fixes 1.A et 1.B. Trois zones critiques avaient été explicitement reportées en hors-scope :

- `players.cards` lu côté client (S1 du 0.A)
- `users.password` stocké en table standard (S2 du 0.A)
- Override version `@auth/core 0.37.4` (S3 du 0.A)

Entre 1.B et aujourd'hui, le module Invitations a été livré (mutations `joinByCode`, QR/lien partageables, codes 6 chars), le lobby a été retravaillé (Mes tables / Tables publiques), et l'UI mobile responsive a été ajoutée. Aucune de ces zones n'a été auditée. L'app est déployée sur `home-poker.vjdev.tech`.

La phase 0.C couvre **sécurité + performance** sur **tout le repo dans son état actuel**, avec un modèle de menace **public restreint authentifié** (n'importe qui peut signup, mais l'app n'est pas marketée publiquement).

## Objectif

Produire un rapport `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md` listant les findings sécu + perf, classés par sévérité 🔴/🟡/🟢, avec ID stable, localisation, description, reproduction (si runtime), et recommandation de fix. Le rapport est commité. Pas de fix dans cette phase.

## Périmètre — IN

Tout le repo dans son état au commit de référence (master, post-`0eba0c3`), incluant :
- Code stable post-1.B (`convex/auth.ts`, `convex/core/gameEngine.ts`, `convex/players.ts`, `convex/tables.ts`, `convex/utils/handEvaluator.ts`)
- Module Invitations (mutations + UI : `InviteDialog`, `JoinByCodeForm`, `usePendingJoin`)
- Lobby v2 (sections Mes tables / Tables publiques)
- UI mobile responsive
- Schéma Convex (`convex/schema.ts`) : indexes, exposition champs sensibles
- `package.json` : deps, overrides, scripts

## Périmètre — OUT (reporté)

- **RGPD / légal** (right to delete, data retention, password reset complet) — threat model retenu = B (public restreint), pas C
- **Observabilité côté client** (Sentry, error tracking front, telemetry) — phase 0.D si besoin
- **CI/CD pipeline** (GitHub Actions, déploiement automatisé, tests d'intégration en pipeline) — orthogonal sécu/perf
- **i18n homogène** — déjà signalé en 0.B, hors périmètre 0.C
- **Refactoring qualité code** (taille des fichiers, séparation des responsabilités) — non lié à sécu/perf

## Modèle de menace

**B — public restreint authentifié.** L'application est accessible à n'importe qui qui devine ou reçoit l'URL `home-poker.vjdev.tech`. Le signup est ouvert. L'app n'est pas indexée/marketée mais doit résister à :

- Un utilisateur authentifié malicieux (DevTools, requêtes Convex forgées)
- Un scraper / bot opportuniste (signup spam, brute-force codes invitation)
- Un joueur qui veut tricher au poker (lecture cartes adverses, manipulation chips, prédiction shuffle)

Hors menace : attaquants étatiques, attaques DDoS sophistiquées, vol de fonds (pas d'argent réel).

## Axes d'audit (9 axes)

### Sécurité (axes 1-5) — sub-agent "Sécu"

| # | Axe | Technique | Approche |
|---|---|---|---|
| 1 | Auth & sessions | Statique + runtime | Lecture `convex/auth.ts`, `useAuth.ts`. Runtime : signOut → reuse session, multi-device, password reset (existe ?), bruteforce signin (10 tentatives) |
| 2 | Autorisation Convex | Statique exhaustif | Grep toutes les `query`/`mutation` dans `convex/` → check `ctx.auth.getUserIdentity()` + validation `userId` arg. Runtime : DevTools, appeler `playerAction` avec `userId` d'un autre joueur |
| 3 | Validation entrées | Statique | Lister chaque mutation, vérifier `v.*` ou Zod. Tester XSS sur `name`/`username` côté UI (rendu sans escape ?) |
| 4 | Anti-triche jeu | Statique + runtime critique | Audit `shuffleDeck` (RNG), audit toutes les queries `players`/`gameStates` → `cards` masquées ? `remainingDeck` masqué ? Runtime : DevTools, lire `useQuery(getTablePlayers)` et chercher cartes adverses |
| 5 | Rate limiting & abus | Statique + runtime | Cherche rate-limit/throttle dans le repo. Runtime : 50 signups bot, 20 invitations brute-force (codes 6 chars = 36⁶ espace = ~2 milliards), spam `playerAction` |

### Performance (axes 6-8) — sub-agent "Perf"

| # | Axe | Technique | Approche |
|---|---|---|---|
| 6 | Queries Convex | Statique + runtime | Lire `schema.ts` (indexes), grep `withIndex`, identifier queries sans index. Runtime : DevTools Network, mesurer payload size par query, repérer N+1 |
| 7 | Rerenders front | Statique + runtime | React DevTools Profiler sur PokerTable + 6 PlayerSeat, mesurer rerenders / action. Statique : grep `useMemo`/`useCallback` deps, repérer objets recréés |
| 8 | Charge & scalabilité | Load test | Harness Node étendu : 9 bots simultanés, mesurer P50/P95 latence par action sur 50 mains. Bundle size via `npm run build` |

### Production-ready (axe 9) — sub-agent "Prod"

| # | Axe | Technique | Approche |
|---|---|---|---|
| 9 | Secrets, env, deps | Statique | `.env*` tracked dans git ? Clés Convex/Resend en clair côté front ? `npm audit`, vérifier override `@auth/core` (S3 0.A) |

## Méthode d'exécution

### Approche : sub-agents parallèles (3)

Trois sub-agents indépendants, dispatch en parallèle :
- **Sécu** : axes 1-5 → `.audit-tmp/0C/secu.md`
- **Perf** : axes 6-8 → `.audit-tmp/0C/perf.md`
- **Prod** : axe 9 → `.audit-tmp/0C/prod.md`

Chaque sub-agent opère en read-only sur le repo, dépose ses findings bruts dans `.audit-tmp/0C/` (gitignored). Le main agent consolide ensuite.

### Smoke runtime (non délégable aux sub-agents)

Le main agent réalise lui-même via DevTools navigateur sur `https://home-poker.vjdev.tech` :
- Axe 2 — bypass auth (forge `userId`)
- Axe 4 — leak cartes (lecture queries d'autres joueurs)
- Confirmer ou infirmer les findings runtime des sub-agents

### Load test (axe 8)

Étendre le harness multi-joueurs utilisé en 0.B (ou ses résidus dans `tests/legacy/scripts/`) à 9 bots, mesurer P50/P95 sur 50 mains. Métriques dump dans `.audit-tmp/0C/load.json`. Si le harness existant n'est pas réutilisable, créer un harness léger neuf sous `tests/load/0C-9player-bench.js` (commité).

### Ordre d'exécution

```
[1] Setup
    └─ git clean check, npm install OK, npx convex dev disponible
    └─ Créer .audit-tmp/0C/

[2] Dispatch parallèle sub-agents (Sécu, Perf, Prod)

[3] Smoke runtime main agent (DevTools sur prod)
    └─ Confirmer/infirmer findings runtime

[4] Load test (extension harness, 9 bots, 50 mains)
    └─ Dump métriques

[5] Consolidation
    └─ Merger les 3 .md + load.json → rapport final
    └─ Renumérotation IDs cohérente (C1.x, C2.x, ...)
    └─ Tableau récap + section "Recommandations pour 1.C"

[6] Commit
    └─ feat(audit): rapport 0.C — production-ready (sécu + perf)
```

## Format des findings

Chaque finding suit le format 0.A/0.B :

```
#### C<axe>.<num> — Titre court
- **Sévérité** : 🔴 / 🟡 / 🟢
- **Source** : statique / runtime / load
- **Localisation** : `chemin/fichier.ts:ligne`
- **Description** : 2-3 lignes, fact-based
- **Reproduction** (si runtime) : étapes minimales
- **Recommandation** : direction de fix
```

### Échelle de sévérité

- 🔴 **Critique** — exploit utilisateur direct OU dégradation perf >2× empêchant le jeu (ex. user lit cartes adverses, query >2s à 6 joueurs, password reset cassé permettant takeover)
- 🟡 **Important** — risque réel mais nécessite conditions particulières OU dégradation perf perceptible <2× (ex. rate limiting absent mais pas exploité aujourd'hui, payload 50KB inutile)
- 🟢 **Mineur** — bonnes pratiques, hardening défensif, dette technique non urgente

## Livrables

1. **Rapport** : `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md` (obligatoire, commité)
2. **Logs bruts** : `.audit-tmp/0C/{secu,perf,prod}.md` + `load.json` (gitignored, conservés en local)
3. **Load test scripts** : `tests/load/0C-*.js` (commités si harness neuf créé)

## Critères de sortie

- Le rapport est commité avec un tableau récapitulatif des findings (ID, sévérité, axe, titre, localisation)
- Section "Recommandations pour 1.C" présente avec lots de fix proposés (C1 critiques sécu, C2 critiques perf, C3 hardening sécu, C4 optimisations perf, C5 hardening prod)
- Tous les findings runtime ont une reproduction reproductible (par moi ou par toi en suivant les étapes)
- Les hors-scope sont explicites dans le rapport

## Stratégie de commits

Granularité : commits intermédiaires pendant l'audit, puis commit final du rapport :

- `chore(audit): setup .audit-tmp/0C/` (si besoin)
- `chore(audit): harness load test 9 joueurs` (si harness neuf)
- `feat(audit): rapport 0.C — production-ready (sécu + perf)`

Chaque commit signe avec `viny1976@gmail.com` / `satch9`. Pas de `--no-verify`.

## Risques

- **R1 — Bruit sur axe 2 (autorisation Convex).** Risque de 30+ findings 🟡 sur helpers internes. **Mitigation** : sub-agent consolide par module (1 finding "auth manquante dans 5 mutations de `players.ts`" plutôt que 5 findings séparés). Critère = utilité de fix, pas exhaustivité.
- **R2 — Load test révèle des bugs fonctionnels (pas perf).** Probable. **Mitigation** : tout finding fonctionnel détecté pendant le load test est basculé en backlog 1.B-tail (ou 1.D), pas inséré dans 0.C. Le rapport 0.C reste sécu+perf strict.
- **R3 — Smoke runtime nécessite comptes tiers sur prod.** **Mitigation** : préfixer les comptes test `audit0c-*`, fournir liste de cleanup ou mutation admin temporaire en fin d'audit.
- **R4 — Déploiement Convex dev sature sous 9 connexions simultanées.** **Mitigation** : si le load test échoue par timeout Convex (pas par bug applicatif), documenter comme finding C8.x et trancher en 1.C (plan Convex supérieur ou optimisation).
- **R5 — Module Invitations non audité, risque 🔴 majeur (brute-force codes 6 chars).** **Mitigation** : c'est précisément pourquoi on l'inclut. Le finding sera prioritaire en 1.C.

## Hypothèses

- **H1** — `npx convex dev` est lançable (déploiement `incredible-hedgehog-551` toujours actif).
- **H2** — `home-poker.vjdev.tech` reflète bien `master` au moment de l'audit.
- **H3** — Tu es disponible ~30 min cumulées pendant l'audit (étape 3 + risques R3/R4).
- **H4** — Le harness multi-joueurs de 0.B (sub-agent) ou ses scripts résiduels sous `tests/legacy/scripts/` sont utilisables comme base pour le load test.

## Points de sollicitation

- **Avant smoke runtime** (étape 3) : confirmation que 1-2 comptes test sont utilisables sur prod, sinon création de comptes jetables `audit0c-*`.
- **Si load test impose Convex prod** : confirmation que 9 connexions simultanées sur le déploiement dev `incredible-hedgehog-551` est OK (sinon déploiement dev séparé).
- **Si découverte d'un 🔴 critique trivialement exploitable** : arrêt immédiat, ping, discussion sur patch d'urgence avant fin du rapport.

## Suite

Une fois le rapport 0.C validé, invoquer `superpowers:brainstorming` pour la phase **1.C** (spec de fix sécu + perf), puis `writing-plans` pour le plan d'exécution. Pattern identique à 0.A→1.A et 0.B→1.B.
