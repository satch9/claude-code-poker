# Spec — Fix deps majeures C5

**Date** : 2026-05-06
**Phase** : C5 (implémentation)
**Source** : `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md` — Lot C5 + suite C4
**Phase précédente** : C4 (perf, terminée)
**Phase suivante** : Module Tournaments, ou C6 (Vite 5→8 + React 19 + Tailwind 4)

## Contexte

Après les phases sécu (1.C) et perf (C4), le repo a :
- 4 deps avec un major retard significatif : `convex` (12 patches), `eslint` 8 (EOL), `typescript` 5.8, `vitest` 3.2
- 2 vulnérabilités moderate restantes via `vite <=6.4.1` (esbuild) — Vite hors scope ici
- Override `@auth/core` 0.37.4 / Latest 0.34.3 suspect (drapeau S3 du 0.A)
- 4 deps majeures supplémentaires hors scope C5 : `vite`, `react`, `tailwindcss`, `eslint-plugin-react-hooks` 7

C5 cible la dette dev/runtime hors-Vite/React/Tailwind. Vite, React 19 et Tailwind 4 sont reportés en C6 (sprint dédié).

## Objectif

Mettre à jour `convex`, `eslint`, `typescript`, `vitest` à leur dernière major stable. À la fin de C5 :
- `convex` 1.37 (12 patches)
- `eslint` 9 + flat config (`eslint.config.js`)
- `typescript` 6
- `vitest` 4

Sans régression fonctionnelle (signup/signin, jeu heads-up complet, showdown), 0 HIGH/CRITICAL CVE, working tree clean.

## Périmètre — IN

- `convex` 1.25 → 1.37
- `eslint` 8 → 9 + migration `.eslintrc.cjs` → `eslint.config.js`
- `typescript` 5.8 → 6
- `vitest` 3.2 → 4 + `@vitest/ui` 4
- `eslint-plugin-react-hooks` et `eslint-plugin-react-refresh` adapatés à ESLint 9 si nécessaire
- Retrait de l'override `@auth/core` si le grep confirme qu'il n'est pas requis (S3 du 0.A)

## Périmètre — OUT (reporté à C6 ou plus tard)

- `vite` 5 → 8 (3 majors, breaking changes)
- `react` 18 → 19, `react-dom` 18 → 19, `@types/react*` 18 → 19
- `tailwindcss` 3 → 4
- `eslint-plugin-react-hooks` 4 → 7 (3 majors, peut nécessiter migration en parallèle de React 19)
- `@vitejs/plugin-react` 4 → 6 (lié à Vite)
- `zod` 3 → 4
- 2 vulnérabilités moderate restantes via vite/esbuild — résolues automatiquement quand Vite passera en C6

## Décisions clés (locks brainstorm)

| Lock | Choix |
|---|---|
| Scope | Convex + ESLint + TypeScript + Vitest |
| Stratégie ESLint | Migration complète vers flat config (`eslint.config.js`) |
| Ordre | Convex → ESLint → TypeScript → Vitest |
| Smoke navigateur | Uniquement après étape 1 (Convex) — les 3 autres sont devtools |

## Décomposition en 4 étapes

À chaque étape : `npm run typecheck && npm run lint && npx vitest run` exit 0. Un commit par étape.

| # | Upgrade | Effort |
|---|---|---|
| 1 | `convex` 1.25 → 1.37 + `npx convex dev --once` + smoke navigateur poker | ~45min |
| 2 | `eslint` 8 → 9 + flat config + plugins compat | ~1h30 |
| 3 | `typescript` 5.8 → 6 + correction des nouvelles erreurs strict | ~45min |
| 4 | `vitest` 3.2 → 4 + `@vitest/ui` 4 + adaptation config si besoin | ~30min |

**Total estimé : ~3h30.**

## Critères de sortie

### Automatiques (par étape)

```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npx vitest run      # exit 0, 13/15 ou 14/15 tests sécu C1
npm audit --audit-level=high   # 0 HIGH/CRITICAL
```

### Smoke navigateur (après étape 1 uniquement)

Sur `https://home-poker.vjdev.tech` après rebuild et hard-refresh :
1. Signin avec ton compte → session restaurée
2. Créer une table heads-up → signup compte 2 (ou autre nav privée) → rejoindre → jouer une main complète → showdown
3. Network DevTools : payload Convex sain
4. Pas d'erreur console front

### Critères globaux

- 4 commits distincts sur `master`
- `npm outdated` : `convex`, `eslint`, `typescript`, `vitest` à jour (Latest = Current)
- `npm audit --audit-level=high` : 0 HIGH/CRITICAL
- Working tree clean

## Stratégie de commits

Un commit par étape :

- `chore(deps): upgrade convex 1.25 → 1.37 (12 patches)`
- `chore(deps): upgrade eslint 8 → 9 + migration flat config`
- `chore(deps): upgrade typescript 5.8 → 6`
- `chore(deps): upgrade vitest 3 → 4`

Chaque commit signe avec `viny1976@gmail.com` / `satch9`. Pas de `--no-verify`.

## Risques

- **R1 — Convex 1.37 breaking subtil sur API mutation/query.** Mitigation : `npx convex dev --once` détecte les incompatibilités schéma/codegen. Si typecheck rouge après upgrade, lire le CHANGELOG, adapter. Si > 1h sans avancée, revert et reporter.
- **R2 — ESLint 9 flat config casse l'intégration plugins.** Mitigation : `@eslint/compat`/`@eslint/eslintrc` en dernier recours. Privilégier l'adaptation directe.
- **R3 — TypeScript 6 strict révèle des erreurs latentes.** Mitigation : traiter par lot si > 10 erreurs. Fixer les vrais bugs plutôt que `@ts-ignore`.
- **R4 — Vitest 4 change l'API de configuration.** Mitigation : CHANGELOG Vitest 3→4. Le harness sécu est standard, peu de risque.
- **R5 — Override `@auth/core` revient.** Mitigation : grep pour confirmer pas d'import direct, retirer du `package.json` si possible. Si transitif, garder mais documenter pourquoi.

## Hypothèses

- **H1** — Tests sécu C1 stables à 13-14/15 (test 5 obsolète, test 15 limite structurelle). Pas des régressions C5.
- **H2** — Pas de migration de schéma Convex requise par 1.37 (12 patches, pas un major).
- **H3** — Le déploiement Convex dev accepte le nouveau client 1.37 sans changer de plan.

## Suite

Après C5 validé :
- **Module Tournaments** (annoncé CLAUDE.md, jamais implémenté)
- **C6** : Vite 5→8 + React 19 + Tailwind 4 (sprint dédié)
- Triage final des 🟢 résiduels
- Préparation pré-prod (passage `incredible-hedgehog-551` dev → `accurate-nightingale-834` prod)
