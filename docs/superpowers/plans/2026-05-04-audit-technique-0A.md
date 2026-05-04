# Audit Technique 0.A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire un rapport d'audit technique priorisé qui alimentera le plan de fix `1.A`.

**Architecture:** L'agent principal exécute les commandes scriptées (typecheck, lint, test, deps) et dispatche 3 sous-agents Explore en parallèle pour les axes nécessitant lecture/raisonnement (code mort, cohérence schéma, imports). Les findings sont consolidés dans un rapport markdown unique avec sévérités (🔴/🟡/🟢) et IDs stables (A1, A2, …).

**Tech Stack:** Node.js, npm scripts (vitest, eslint, tsc), Convex CLI, agents Claude (Explore subagent_type), Bash.

**Spec source:** `docs/superpowers/specs/2026-05-04-audit-technique-design.md`

**Livrable:** `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md` (commit inclus)

---

## File Structure

| Fichier | Rôle |
|---|---|
| `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md` | Rapport final (créé) |
| `.audit-tmp/typecheck.log` | Sortie brute de `npm run typecheck` (créé, ignoré git) |
| `.audit-tmp/lint.log` | Sortie brute de `npm run lint` (créé, ignoré git) |
| `.audit-tmp/test.log` | Sortie brute de `npm run test` (créé, ignoré git) |
| `.audit-tmp/outdated.log` | Sortie brute de `npm outdated` (créé, ignoré git) |
| `.gitignore` | Modifier — ajouter `.audit-tmp/` |

Les `.log` servent de matière première et sont consultables à plusieurs reprises sans relancer les commandes. Ils ne sont pas commit.

---

### Task 1: Préparation — répertoire de travail et gitignore

**Files:**
- Create: `.audit-tmp/` (répertoire)
- Modify: `.gitignore`

- [ ] **Step 1: Créer le répertoire temporaire**

```bash
mkdir -p .audit-tmp
```

- [ ] **Step 2: Ajouter à .gitignore**

Lire `.gitignore`. Ajouter à la fin si absent :

```
.audit-tmp/
```

- [ ] **Step 3: Vérifier**

```bash
git check-ignore -v .audit-tmp/test.log
```

Expected: la sortie doit indiquer que `.gitignore` ignore le fichier.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(audit): ignorer .audit-tmp/ pendant l'audit technique 0.A"
```

---

### Task 2: Axe 1 — Typecheck

**Files:**
- Create: `.audit-tmp/typecheck.log`

- [ ] **Step 1: Vérifier la présence de _generated**

```bash
ls convex/_generated/ 2>&1 | head -5
```

Expected: fichiers `api.d.ts`, `dataModel.d.ts`, etc. présents. Si absents, signaler comme finding 🔴 prioritaire dans le rapport (axe 7) et continuer.

- [ ] **Step 2: Lancer typecheck et capturer**

```bash
npm run typecheck > .audit-tmp/typecheck.log 2>&1
echo "exit=$?" >> .audit-tmp/typecheck.log
```

- [ ] **Step 3: Compter les erreurs**

```bash
grep -c "error TS" .audit-tmp/typecheck.log || echo "0"
```

Noter le total. Si 0 → axe 1 = ✅ green.

- [ ] **Step 4: Extraire et catégoriser**

Lire `.audit-tmp/typecheck.log`. Pour chaque erreur, noter :
- Fichier:ligne
- Code TS (TS6133 = unused, TS2304 = cannot find name, TS2322 = type mismatch, etc.)
- Message court

Regrouper par code TS. Sévérité par défaut :
- 🔴 erreurs de compilation (TS2304, TS2322, TS2339…) qui bloquent `tsc`
- 🟡 unused (TS6133) — non-bloquant en soi mais script lint en `--max-warnings 0` les fera échouer

- [ ] **Step 5: Stocker les findings en mémoire pour la consolidation finale**

(Pas de commit ici — les findings sont consolidés dans Task 8)

---

### Task 3: Axe 2 — Lint

**Files:**
- Create: `.audit-tmp/lint.log`

- [ ] **Step 1: Lancer lint et capturer**

```bash
npm run lint > .audit-tmp/lint.log 2>&1
echo "exit=$?" >> .audit-tmp/lint.log
```

- [ ] **Step 2: Compter les problèmes**

```bash
grep -E "problem|error|warning" .audit-tmp/lint.log | tail -5
```

- [ ] **Step 3: Extraire et catégoriser**

Lire `.audit-tmp/lint.log`. Pour chaque finding ESLint :
- Fichier:ligne
- Règle (`@typescript-eslint/...`, `react-hooks/exhaustive-deps`, etc.)
- Severity ESLint (error / warning)

Sévérité audit :
- 🔴 errors ESLint (script échoue avec `--max-warnings 0`)
- 🟡 warnings
- 🟢 cosmétique uniquement si la règle est purement stylistique

---

### Task 4: Axe 3 — Tests

**Files:**
- Create: `.audit-tmp/test.log`

- [ ] **Step 1: Lancer les tests sans watch**

```bash
npx vitest run > .audit-tmp/test.log 2>&1
echo "exit=$?" >> .audit-tmp/test.log
```

- [ ] **Step 2: Vérifier le résultat global**

```bash
grep -E "Test Files|Tests" .audit-tmp/test.log | tail -5
```

- [ ] **Step 3: Lister les tests existants**

```bash
find tests src convex -type f \( -name "*.test.*" -o -name "*.spec.*" \) | grep -v node_modules | grep -v _generated
```

- [ ] **Step 4: Identifier modules critiques sans test**

Modules considérés critiques (cf. CLAUDE.md "Testing Strategy") :
- `convex/core/gameEngine.ts`
- `convex/utils/handEvaluator.ts`
- `convex/utils/poker.ts`
- `convex/utils/validation.ts`
- `convex/auth.ts`
- `convex/players.ts`

Pour chacun : un test existe-t-il ? (chercher import du fichier dans les `.test.*`)

```bash
for f in core/gameEngine utils/handEvaluator utils/poker utils/validation auth players; do
  echo -n "$f: "
  grep -rl "from.*$f" tests/ src/**/*.test.* 2>/dev/null | head -1 || echo "AUCUN TEST"
done
```

- [ ] **Step 5: Catégoriser**

Sévérité :
- 🔴 tests existants qui échouent
- 🟡 module critique sans test
- 🟢 module non-critique sans test

---

### Task 5: Axe 7 — Config & dépendances

**Files:**
- Create: `.audit-tmp/outdated.log`
- Read: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `.eslintrc.cjs`, `vite.config.ts`, `vitest.config.js`, `tailwind.config.js`, `postcss.config.js`

- [ ] **Step 1: Lister les deps obsolètes**

```bash
npm outdated > .audit-tmp/outdated.log 2>&1 || true
cat .audit-tmp/outdated.log | head -40
```

- [ ] **Step 2: Lire chaque config et lister anomalies**

Pour chaque fichier de config, vérifier :
- Présence des champs critiques
- Cohérence avec les autres configs (ex : `tsconfig.json` paths vs `vite.config.ts` alias)
- Scripts npm pointent vers des outils installés
- Pas de références à des fichiers/dossiers inexistants

Noter chaque incohérence comme finding.

- [ ] **Step 3: Vérifier les scripts**

```bash
node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts))"
```

Vérifier que `dev`, `build`, `lint`, `typecheck`, `test` existent et sont fonctionnels.

- [ ] **Step 4: Vérifier deps déclarées vs utilisées**

Lister les deps dans `package.json` et vérifier qu'elles sont bien importées dans le code :

```bash
node -e "const p=require('./package.json'); Object.keys({...p.dependencies,...p.devDependencies}).forEach(d=>console.log(d))" > .audit-tmp/deps.txt

while read dep; do
  count=$(grep -rl "from ['\"]$dep" src convex 2>/dev/null | wc -l)
  echo "$dep: $count usages"
done < .audit-tmp/deps.txt | grep ": 0 usages"
```

Les deps avec 0 usage sont candidates à suppression (sauf si utilisées par config — vérifier).

- [ ] **Step 5: Catégoriser**

Sévérité :
- 🔴 script ou config cassé empêchant build/dev
- 🟡 dep majeure obsolète (versions majeures de retard) ou dep non utilisée
- 🟢 patch/minor outdated

---

### Task 6: Axes 4, 5, 6 — Dispatch des Explore agents en parallèle

**Files:** aucun fichier créé directement (les agents retournent leurs findings dans la conversation)

- [ ] **Step 1: Préparer les 3 prompts d'agents**

Préparer 3 prompts auto-suffisants (l'agent ne voit pas la conversation actuelle).

**Agent #1 — Code mort & doublons backend :**

> Audit du code mort dans `convex/` (sauf `_generated/`). Pour chaque fichier `.ts` :
> 1. Lister les exports (functions, consts) qui ne sont pas importés ailleurs dans le repo (chercher `from "convex/..."` ou `from "./..."` dans `src/` et `convex/`).
> 2. Détecter les doublons : fonctions avec même nom exportées dans plusieurs fichiers (cf. cas récent `getUserStats` dans `users.ts` et `users/stats.ts`).
> 3. Détecter les fichiers orphelins (aucun import).
> Format de sortie : tableau markdown avec colonnes `Fichier | Symbole | Type (mort/doublon/orphelin) | Note`. Sois exhaustif. Sous 400 mots.

**Agent #2 — Code mort & imports frontend :**

> Audit du code mort et imports cassés dans `src/`. Pour chaque fichier `.ts/.tsx` :
> 1. Lister les exports inutilisés (composants, hooks, utils non importés ailleurs).
> 2. Lister les imports cassés : `from "..."` qui pointent vers des chemins inexistants.
> 3. Détecter les dépendances circulaires entre modules `src/`.
> 4. Détecter les fichiers orphelins.
> Format de sortie : 4 sections markdown (Exports inutilisés / Imports cassés / Cycles / Orphelins) avec localisation précise. Sous 400 mots.

**Agent #3 — Cohérence schéma Convex :**

> Audit de cohérence entre `convex/schema.ts` et son utilisation. Pour chaque table déclarée dans `schema.ts` :
> 1. Lister les champs déclarés.
> 2. Vérifier que chaque champ est utilisé quelque part : `ctx.db.insert/patch` côté backend, ou lecture côté frontend.
> 3. Vérifier que toute lecture/écriture de champ correspond à un champ déclaré dans le schéma.
> 4. Pour les tables où `inferredSchema` diverge de `schema` (cf. tables `notifications` et `users` dans le déploiement dev), identifier les champs concernés.
> Format de sortie : tableau markdown `Table | Champ | Statut (OK / déclaré-non-utilisé / utilisé-non-déclaré / divergent inferredSchema)`. Sous 500 mots.

- [ ] **Step 2: Lancer les 3 agents en un seul message multi-tool-call**

Utiliser **un seul message** avec 3 appels `Agent` (subagent_type=Explore), `description` court par agent.

- [ ] **Step 3: Collecter les retours**

Chaque agent retourne un rapport. Conserver les 3 retours bruts pour la consolidation.

- [ ] **Step 4: Catégoriser**

Sévérité par défaut :
- 🔴 import cassé, dépendance circulaire bloquant le build
- 🟡 code mort, doublon, schéma divergent
- 🟢 export probablement inutilisé mais incertain (à valider)

---

### Task 7: Consolider — rédiger le rapport

**Files:**
- Create: `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`

- [ ] **Step 1: Créer la structure du rapport**

Le rapport DOIT contenir ces sections dans cet ordre :

1. **Métadonnées** : date, phase, spec source, branch, commit de référence
2. **Résumé exécutif** : 1 paragraphe — total findings, répartition par sévérité, verdict global (vert/orange/rouge), lien vers section "Recommandations"
3. **Findings par axe** — 7 sections (1.Typecheck, 2.Lint, 3.Tests, 4.Code mort & doublons, 5.Cohérence schéma, 6.Imports/cycles, 7.Config & deps). Chaque finding au format :

```markdown
#### A{N}.{m} — {Titre}
- **Sévérité** : 🔴 | 🟡 | 🟢
- **Localisation** : `fichier:ligne` ou `pattern`
- **Description** : 1-3 phrases
- **Recommandation** : action concrète
```

4. **Tableau récapitulatif** — toutes les findings, triées par sévérité puis ID, format :

```markdown
| ID | Sévérité | Axe | Titre | Localisation |
|----|----------|-----|-------|--------------|
```

5. **Recommandations pour 1.A** — proposition de regroupement et d'ordre des fixes
6. **Hors-scope mais critique** (optionnel) — si l'audit a révélé des problèmes hors périmètre technique

- [ ] **Step 2: Remplir le rapport avec les findings collectés**

Pour chaque axe, transcrire les findings collectés aux Tasks 2-6 dans la structure ci-dessus. ID stables : `A1.1`, `A1.2` (axe 1), `A2.1`, `A2.2` (axe 2), etc.

- [ ] **Step 3: Rédiger le résumé exécutif en dernier**

Une fois tous les findings consolidés, rédiger le paragraphe d'intro qui donne le verdict global et compte les findings par sévérité.

- [ ] **Step 4: Rédiger les recommandations 1.A**

Proposer un regroupement logique des fixes en 3-5 lots :
- **Lot 1** : blocants typecheck/lint (priorité absolue, sans quoi rien ne tourne)
- **Lot 2** : nettoyage code mort & doublons (réduit la surface avant les fixes plus risqués)
- **Lot 3** : cohérence schéma (plus invasif)
- **Lot 4** : tests manquants modules critiques
- **Lot 5** : deps obsolètes (en dernier — à isoler car peut casser autre chose)

Estimation grossière en heures pour chaque lot (basée sur le nombre/complexité des findings).

---

### Task 8: Self-review du rapport

**Files:** lecture seule du rapport généré

- [ ] **Step 1: Vérifier exhaustivité**

Pour chaque axe (1 à 7), vérifier qu'il y a au moins une section dans le rapport (même si "✅ aucun finding").

- [ ] **Step 2: Vérifier sévérités cohérentes**

- Tout finding 🔴 doit empêcher au moins une commande (`typecheck`, `lint`, `test`, `build`, `dev`) de passer. Sinon → rétrograder en 🟡.
- Tout finding 🟡 doit représenter de la dette ou un risque clair. Sinon → 🟢.

- [ ] **Step 3: Vérifier IDs stables et tableau récap**

Le tableau récap doit lister 100% des findings avec leur ID. Les IDs ne doivent pas avoir de trous (A1.1, A1.2, A1.3, pas A1.1, A1.3).

- [ ] **Step 4: Vérifier section Recommandations**

Chaque lot doit référencer des IDs de findings (ex : "Lot 1 contient A1.1, A1.3, A2.1").

- [ ] **Step 5: Fixer inline si nécessaire**

Corriger directement les anomalies détectées. Pas besoin de re-review après fix.

---

### Task 9: Commit & nettoyage

**Files:**
- Commit: `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`
- Delete: `.audit-tmp/`

- [ ] **Step 1: Vérifier git status**

```bash
git status
```

Expected: seul le rapport est nouveau (`.audit-tmp/` est ignoré).

- [ ] **Step 2: Commit du rapport**

```bash
git add docs/superpowers/specs/2026-05-04-audit-technique-rapport.md
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "docs(audit): rapport audit technique 0.A

Findings priorisés sur les 7 axes (typecheck, lint, tests, code mort,
cohérence schéma, imports, config/deps). Recommandations regroupées en
lots pour le plan de fix 1.A."
```

- [ ] **Step 3: Nettoyer .audit-tmp**

```bash
rm -rf .audit-tmp
```

- [ ] **Step 4: Vérifier le commit**

```bash
git log -1 --stat
```

Expected: 1 fichier ajouté, le rapport.

---

### Task 10: Présenter le rapport et passer à 1.A

- [ ] **Step 1: Annoncer au user**

Message au user :

> Audit technique 0.A terminé. Rapport disponible dans `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`.
>
> Verdict global : [🟢 vert / 🟡 orange / 🔴 rouge]
> Findings : N🔴 / N🟡 / N🟢
>
> Lots de fix proposés pour 1.A : [résumé en 1 ligne par lot]
>
> Tu valides le rapport ? On peut enchaîner sur le brainstorm de la phase 1.A (fix technique).

- [ ] **Step 2: Attendre validation user**

Ne pas invoquer brainstorming/writing-plans pour 1.A avant validation explicite.

---

## Self-Review

**Spec coverage** :
- ✅ Périmètre (inclus/exclus) → Tasks 2-6 respectent les exclusions (`tests/legacy/`, `docs/`, `_generated/`)
- ✅ 7 axes → Task 2 (axe 1), Task 3 (axe 2), Task 4 (axe 3), Task 6 (axes 4/5/6), Task 5 (axe 7)
- ✅ Exécution avec 3 sub-agents Explore en parallèle → Task 6 step 2 ("un seul message multi-tool-call")
- ✅ Livrable rapport au chemin spécifié → Task 7
- ✅ Sévérités 🔴/🟡/🟢 et IDs stables → Task 7 step 1, Task 8 step 3
- ✅ Tableau récap + recommandations 1.A → Task 7 steps 1, 4
- ✅ Commit du rapport → Task 9
- ✅ Hors-scope respecté (pas de fix de code) → aucune Task ne modifie le code applicatif (uniquement `.gitignore`)
- ✅ R1 (problèmes hors-scope critiques) → Task 7 step 1 prévoit la section "Hors-scope mais critique"
- ✅ H1 (commandes cassées) → Task 2 step 1 prévoit ce cas

**Placeholder scan** : aucun "TBD/TODO/à compléter". Toutes les commandes et structures sont concrètes.

**Type consistency** : les noms des fichiers `.audit-tmp/*.log` sont cohérents entre Task 1 (création), Tasks 2-5 (écriture) et Task 9 (suppression). Les IDs `A1.1, A2.1, ...` sont définis Task 7 step 2 et utilisés Tasks 8/10.

Plan complet.
