# Spec — Fix technique 1.A

**Date** : 2026-05-04
**Phase** : 1.A (implémentation)
**Source** : rapport audit `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`
**Phase suivante** : 0.B (audit fonctionnel)

## Contexte

L'audit technique 0.A a révélé 38 findings, dont 7 🔴 qui empêchent les commandes critiques (`typecheck`, `lint`, `test`) de passer. La phase 1.A corrige ces blocants pour que le repo soit techniquement sain avant les phases fonctionnelles et production-ready.

## Objectif

Atteindre un état où `npm run typecheck && npm run lint && npx vitest run` retourne exit 0, et nettoyer le code mort identifié dans le rapport.

## Périmètre — IN

- **Lot 1** Déblocage commandes (axes 1, 2)
- **Lot 2** Nettoyage code mort backend (axe 4 partie back)
- **Lot 3** Nettoyage code mort frontend (axe 4 partie front)
- **Bug Royal Flush** (finding A3.1) + retrait du `bail: 1` (A3.2)

## Périmètre — OUT (reporté)

- Couverture de tests modules critiques (Lot 5 sans le bug Royal Flush) → lot dédié plus tard
- Renommage `.test.js` → `.test.ts` (A3.6) → plus tard
- Cohérence schéma Convex (Lot 4 / axe 5) → phase 0.B/1.B (décisions produit)
- Deps majeures obsolètes (Lot 6 / A7.5, A7.6) → lot autonome plus tard
- Sécurité (S1, S2, S3) → phase 0.C/1.C

## Décisions de fix

### Lot 1 — Déblocage commandes

| ID finding | Décision |
|---|---|
| A2.1, A2.2 | **Patch minimal ESLint** : ajouter `plugin:` devant `@typescript-eslint/recommended` dans `extends`, et ajouter `'@typescript-eslint'` dans `plugins`. Pas d'upgrade vers ESLint v9. |
| A2.3 | **Retirer `--max-warnings 0`** du script `lint` dans `package.json`. Trop strict pour MVP. Les warnings restent affichés. |
| A1.1 | **Sans objet** — fichier `validation.ts` supprimé en Lot 2. |
| A1.2 | **Étendre les props de `<PlayingCard>`** pour accepter `style?: React.CSSProperties`. Vérifier que la prop est bien passée au DOM. |
| A1.3 | **Cas par cas** : suppression si non utilisé, préfixe `_` si param d'API publique conservée. À traiter après les Lots 2-3 (qui en éliminent une partie). |

### Lot 2 — Code mort backend

**Suppressions de fichiers** :
- `convex/utils/validation.ts` (orphelin + cassé)
- `convex/utils/raceConditionPrevention.ts` (orphelin)
- `convex/utils/enhancedSidePots.ts` (orphelin)

**Suppressions d'exports morts dans fichiers conservés** :
- `convex/users.ts` : exports listés en A4.7 du rapport
- `convex/auth.ts` : `getCurrentSession`
- `convex/players.ts` : `resetPlayersForNewHand`
- `convex/tables.ts` : `getTableByInviteCode`
- Helpers mineurs morts dans `convex/utils/poker.ts`, `convex/utils/handEvaluator.ts` (cf. A4.11)

**Vérification obligatoire avant chaque suppression** : grep dans `src/` ET `convex/` pour confirmer 0 import réel au moment du fix (pas de référence depuis du code à supprimer plus tard).

### Lot 3 — Code mort frontend

**Suppressions** :
- `src/demo.tsx`
- `src/core/components/UI/UIDemo.tsx`
- `src/core/utils/timeoutManager.ts`
- `src/shared/utils/moduleLoader.ts`
- `src/config/modules.ts` (chaîne morte avec moduleLoader)
- Imports vers ces fichiers (notamment dans `src/main.tsx` ou `src/App.tsx` si présents)

**Vérification obligatoire** : `npm run dev` démarre toujours après suppressions (pas dans le périmètre des tests automatisés mais smoke check manuel).

### Bug Royal Flush (A3.1) + retrait bail (A3.2)

**Approche** :
1. Reproduire le test cassant en isolation (`vitest run -t "Royal Flush"`)
2. Lire la logique de `convex/utils/handEvaluator.ts` autour de l'évaluation de mains
3. Identifier la divergence avec `pokersolver` (le rapport signale "Straight Flush retourné à la place")
4. Fix minimal — pas de refactoring opportuniste
5. Vérifier que tous les autres tests handEvaluator passent toujours
6. **Seulement après** : retirer `bail: 1` de `vitest.config.js`
7. Lancer `npx vitest run` complet

**Si > 2h de diag sans avancée** : escalade au user, possibilité d'ajout au scope du plan (refactor ciblé) ou report.

## Ordre d'exécution

L'ordre est important — chaque étape débloque la suivante.

1. Fix ESLint config (A2.1, A2.2)
2. Retrait `--max-warnings 0` (A2.3)
3. Suppressions Lot 2 (backend) — validation.ts en premier (corrige A1.1)
4. Suppressions Lot 3 (frontend)
5. Fix unused locals restants (A1.3)
6. Fix prop `style` PlayingCard (A1.2)
7. Vérification `npm run typecheck` → exit 0
8. Vérification `npm run lint` → exit 0
9. Diagnostic + fix Royal Flush (A3.1)
10. Retrait `bail: 1` (A3.2)
11. Vérification `npx vitest run` → exit 0

## Critères de sortie

```bash
npm run typecheck   # exit 0, 0 erreur
npm run lint        # exit 0
npx vitest run      # exit 0, tous tests visibles passent
```

Si un nouveau test démasqué par le retrait de `bail` casse, voir R1 ci-dessous.

## Stratégie de commits

Un commit par sous-étape logique pour faciliter la review et le rollback :
- `fix(eslint): corriger la config et retirer --max-warnings`
- `chore(convex): supprimer modules backend morts (validation, raceConditionPrevention, enhancedSidePots)`
- `chore(convex): supprimer exports morts (users, auth, players, tables)`
- `chore(src): supprimer modules frontend morts (demo, UIDemo, timeoutManager, moduleLoader, config/modules)`
- `fix(types): nettoyer unused locals restants`
- `fix(ui): autoriser prop style sur PlayingCard`
- `fix(handEvaluator): corriger détection Royal Flush`
- `chore(vitest): retirer bail:1 pour exécuter tous les tests`

Chaque commit signe avec `viny1976@gmail.com` / `satch9`.

## Risques

- **R1** — Retrait de `bail: 1` peut démasquer des tests cassants masqués. Politique : si > 3 tests cassent, **stop** et remontée au user (ajout au scope ou report).
- **R2** — Bug Royal Flush peut être profond (logique `pokersolver` ou comparaison de mains). Politique : > 2h de diag = escalade.
- **R3** — Les exports "morts" peuvent être appelés depuis du code frontend qu'on supprime au même moment. L'ordre Lot 2 → Lot 3 minimise mais ne supprime pas le risque ; vérifier au grep avant chaque suppression.
- **R4** — Suppression de `src/config/modules.ts` peut casser une init non testée. Smoke check `npm run dev` après Lot 3.

## Hypothèses

- **H1** — `npx convex dev` n'a pas besoin d'être lancé pour valider 1.A (le typecheck couvre la cohérence des types Convex via `_generated/`).
- **H2** — Le rapport d'audit est exact ; les findings d'imports cassés et de doublons ne reposent pas sur du code en cours d'édition externe.

## Suite

Après validation user du résultat (commandes vertes + repo nettoyé), invoquer `superpowers:brainstorming` pour la phase **0.B (audit fonctionnel)**.
