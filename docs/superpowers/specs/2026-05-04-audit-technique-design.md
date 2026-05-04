# Spec — Audit technique 0.A

**Date** : 2026-05-04
**Phase** : 0.A (recherche, pas d'implémentation)
**Phase suivante** : 1.A — fix technique (sera planifiée à partir du rapport produit ici)

## Contexte

Le projet `claude-code-poker` est une application Texas Hold'em No Limit multi-joueur basée sur Convex + Vite/React + TypeScript. Le code est en cours de stabilisation MVP.

Avant d'attaquer les modules manquants (Invitations, Notifications, Tournaments) ou d'améliorer le `GameEngine`, on doit s'assurer que **les bases techniques sont saines** : typecheck, lint, tests, cohérence schéma/code.

Cet audit est la première de trois passes (technique → fonctionnelle → production-ready). Il produit un rapport priorisé qui alimentera le plan d'implémentation `1.A` (fix technique).

## Objectif

Produire un **rapport priorisé** de toutes les anomalies techniques bloquant un état "code propre" du repo, avec un niveau de détail suffisant pour que le plan de fix `1.A` puisse être écrit sans nouvelle investigation.

**Critère de sortie** : `npm run typecheck && npm run lint && npm run test` doivent pouvoir passer au vert après les corrections recommandées par le rapport.

## Périmètre

### Inclus
- `convex/` (sauf `_generated/`)
- `src/` (sauf `@types/` si auto-générés)
- `tests/poker-integrity.test.js`
- Configs racine : `tsconfig.json`, `tsconfig.node.json`, `.eslintrc.cjs`, `vite.config.ts`, `vitest.config.js`, `tailwind.config.js`, `postcss.config.js`, `package.json`

### Exclus
- `tests/legacy/` (déjà archivé)
- `docs/` (texte, hors scope technique)
- `node_modules/`, `.convex/`, `convex/_generated/`
- Aspects sécurité, perf, UX, déconnexions → reportés en `0.C`
- Tests fonctionnels E2E manuels → reportés en `0.B`

## Dimensions auditées

| # | Axe | Méthode | Output attendu |
|---|---|---|---|
| 1 | Typecheck | `npm run typecheck` | Liste exhaustive des erreurs `tsc` avec `fichier:ligne:colonne` et message |
| 2 | Lint | `npm run lint` | Warnings + errors ESLint avec règle déclenchée |
| 3 | Tests | `npm run test` | Tests passants/échouants ; modules critiques sans test (gameEngine, handEvaluator, validation) |
| 4 | Code mort & doublons | Explore agent + grep | Exports inutilisés, fonctions dupliquées, fichiers orphelins |
| 5 | Cohérence schéma ↔ code | Lecture `convex/schema.ts` vs fonctions Convex + frontend | Champs schéma inutilisés, fonctions référençant des champs absents, divergences `inferredSchema` |
| 6 | Imports cassés / cycles | Inspection + détection cycles | Imports brisés, dépendances circulaires |
| 7 | Config & dépendances | Lecture configs + `npm outdated` | Configs obsolètes, deps obsolètes critiques, scripts manquants ou cassés |

## Exécution

L'audit est mené par l'agent principal qui orchestre des sous-agents en parallèle.

| Acteur | Responsabilité |
|---|---|
| Agent principal (Bash direct) | Axes 1, 2, 3, 7 — commandes scriptées et lecture des configs |
| Sub-agent Explore #1 | Axe 4 sur `convex/` — code mort backend, doublons |
| Sub-agent Explore #2 | Axe 4 sur `src/` + axe 6 — code mort frontend, imports cassés, cycles |
| Sub-agent Explore #3 | Axe 5 — cohérence schéma Convex ↔ utilisations back+front |

Les sub-agents sont dispatchés **en parallèle** (un seul message avec plusieurs appels) pour minimiser la latence. Chacun retourne un rapport structuré que l'agent principal consolide.

## Livrables

### 1. Rapport d'audit
**Chemin** : `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`

**Structure** :

1. **Résumé exécutif** — un paragraphe : nombre total de findings, répartition par sévérité, verdict global
2. **Findings par axe** — un section par axe (1 à 7), chaque finding au format :
   - **Titre** court
   - **Sévérité** : 🔴 bloquant (empêche typecheck/lint/test de passer) / 🟡 à corriger (qualité, dette) / 🟢 cosmétique
   - **Localisation** : `fichier:ligne` ou pattern
   - **Description** : 1-3 phrases
   - **Recommandation** : action concrète à prendre
3. **Tableau récapitulatif** — toutes les findings triées par sévérité, avec ID stable (A1, A2, …) pour référencement dans le plan `1.A`
4. **Recommandations pour `1.A`** — proposition d'ordre des fixes, regroupements logiques, estimation grossière

### 2. Commit
Le rapport est commit avec un message descriptif référençant la phase 0.A.

## Hors-scope

- ❌ Aucune correction de code pendant l'audit (sauf trivial < 1 ligne nécessaire pour faire tourner une commande de mesure — à signaler)
- ❌ Sécurité approfondie (validation serveur exhaustive, anti-cheat) → phase **0.C**
- ❌ Tests E2E manuels du parcours utilisateur → phase **0.B**
- ❌ Performance, UX, gestion déconnexions → phase **0.C**
- ❌ Implémentation de modules manquants (Invitations, Notifications) → phases **2-5**

## Risques & hypothèses

- **H1** : Les commandes `npm run typecheck/lint/test` sont fonctionnelles. Si elles sont elles-mêmes cassées (config corrompue), l'audit consigne ça comme finding 🔴 prioritaire et continue avec ce qui est mesurable.
- **H2** : Le `convex dev` n'a pas besoin d'être lancé pour l'audit. Si `_generated/` est manquant, signaler comme finding (la régénération est une action de fix, pas d'audit).
- **R1** : L'audit pourrait révéler des problèmes hors scope technique (ex : faille sécurité critique). Dans ce cas, signaler dans une section "Hors-scope mais critique" du rapport et laisser le user décider d'avancer ou bifurquer en `0.C`.

## Suite

Une fois le rapport validé par le user, invoquer la skill `superpowers:writing-plans` pour produire le plan d'implémentation de la phase `1.A`.
