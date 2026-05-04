# Fix Technique 1.A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le repo techniquement sain — `npm run typecheck && npm run lint && npx vitest run` exit 0.

**Architecture:** 9 tasks séquentielles couvrant : fix config ESLint, suppression code mort backend (3 fichiers + tests dépendants + 8 exports), suppression code mort frontend (5 fichiers), nettoyage des unused locals/params restants, fix prop `style` PlayingCard, fix bug Royal Flush, retrait `bail: 1`. Chaque task se conclut par une vérification de la commande débloquée puis un commit.

**Tech Stack:** TypeScript 5.2, ESLint 8 + `@typescript-eslint`, vitest 3, Convex 1.15, React 18.

**Spec source:** `docs/superpowers/specs/2026-05-04-fix-technique-1A-design.md`
**Audit source:** `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure — Vue d'ensemble des changements

| Fichier | Action |
|---|---|
| `.eslintrc.cjs` | Modifier (Task 1) |
| `package.json` | Modifier — script `lint` (Task 1) |
| `convex/utils/validation.ts` | Supprimer (Task 2) |
| `convex/utils/raceConditionPrevention.ts` | Supprimer (Task 2) |
| `convex/utils/enhancedSidePots.ts` | Supprimer (Task 2) |
| `tests/poker-integrity.test.js` | Modifier — retirer tests + imports morts (Task 2) |
| `convex/users.ts` | Modifier — supprimer 5 exports morts (Task 3) |
| `convex/auth.ts` | Modifier — supprimer `getCurrentSession` + fix unused `ctx` (Task 3) |
| `convex/players.ts` | Modifier — supprimer `resetPlayersForNewHand` (Task 3) |
| `convex/tables.ts` | Modifier — supprimer `getTableByInviteCode` (Task 3) |
| `src/demo.tsx` | Supprimer (Task 4) |
| `src/core/components/UI/UIDemo.tsx` | Supprimer (Task 4) |
| `src/core/utils/timeoutManager.ts` | Supprimer (Task 4) |
| `src/shared/utils/moduleLoader.ts` | Supprimer (Task 4) |
| `src/config/modules.ts` | Supprimer (Task 4) |
| `src/config/features.ts` | Supprimer (Task 4) |
| `convex/utils/handEvaluator.ts` | Modifier — unused locals + fix Royal Flush (Tasks 5, 7) |
| `convex/utils/poker.ts` | Modifier — unused param (Task 5) |
| `src/core/components/App/AppMain.tsx` | Modifier — unused import (Task 5) |
| `src/core/components/Auth/SignInButton.tsx` | Modifier — unused var (Task 5) |
| `src/core/components/Auth/UserProfile.tsx` | Modifier — unused var (Task 5) |
| `src/core/components/Game/BettingControls.tsx` | Modifier — unused prop (Task 5) |
| `src/core/hooks/useBreakpoint.ts` | Modifier — unused var (Task 5) |
| `src/core/hooks/useGameLogic.ts` | Modifier — unused var (Task 5) |
| `src/core/components/UI/Card.tsx` | Modifier — étendre props (Task 6) |
| `src/core/components/Game/GameAnimations.tsx` | Modifier — utiliser `animationDelay` (Task 6) |
| `vitest.config.js` | Modifier — retirer `bail: 1` (Task 8) |

---

### Task 1: Fix config ESLint et script lint

**Findings résolus** : A2.1, A2.2, A2.3, A7.1.

**Files:**
- Modify: `.eslintrc.cjs`
- Modify: `package.json` (clé `scripts.lint`)

- [ ] **Step 1: État actuel du `.eslintrc.cjs`**

Lire le fichier pour confirmation. Contenu attendu :

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',     // ← cassé
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],              // ← incomplet
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
```

- [ ] **Step 2: Patch `.eslintrc.cjs`**

Remplacer le fichier par :

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'convex/_generated'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
```

Changements :
- `'@typescript-eslint/recommended'` → `'plugin:@typescript-eslint/recommended'`
- `plugins` ajout `'@typescript-eslint'`
- `ignorePatterns` ajout `'convex/_generated'` (préventif)

- [ ] **Step 3: Patch script `lint` dans `package.json`**

Remplacer la ligne :

```json
"lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
```

par :

```json
"lint": "eslint . --ext ts,tsx --report-unused-disable-directives",
```

(Retrait de `--max-warnings 0`.)

- [ ] **Step 4: Vérifier que ESLint parse au moins**

Run: `npm run lint 2>&1 | head -30`

Expected: ESLint démarre, analyse les fichiers. Il **peut** y avoir des erreurs ou warnings ESLint réels remontés (non vus jusqu'ici car la config était cassée). On les laissera pour l'instant — la priorité est que `tsc` passe d'abord. Si ESLint sort en erreur sur le **chargement de la config** (impossible de trouver un module/plugin), c'est que le fix est incomplet — corriger.

- [ ] **Step 5: Commit**

```bash
git add .eslintrc.cjs package.json
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(eslint): corriger la config et retirer --max-warnings 0

- 'plugin:@typescript-eslint/recommended' au lieu de '@typescript-eslint/recommended'
- ajout de '@typescript-eslint' dans plugins
- retrait de --max-warnings 0 (politique trop stricte pour MVP)
- ajout de convex/_generated dans ignorePatterns"
```

---

### Task 2: Suppression modules backend morts (validation, raceConditionPrevention, enhancedSidePots) + tests dépendants

**Findings résolus** : A4.1, A4.2, A4.3, A1.1 (entièrement), A1.3 partiellement (`raceConditionPrevention.ts:202,240` + `validation.ts:30,83,157`).

⚠️ **Particularité** : `tests/poker-integrity.test.js` importe `validation.ts` et `enhancedSidePots.ts`. Suppression des fichiers source + suppression des tests qui les exerçaient (le code testé étant mort).

**Files:**
- Delete: `convex/utils/validation.ts`
- Delete: `convex/utils/raceConditionPrevention.ts`
- Delete: `convex/utils/enhancedSidePots.ts`
- Modify: `tests/poker-integrity.test.js`

- [ ] **Step 1: Confirmer que rien hors tests n'utilise ces 3 fichiers**

Run:

```bash
grep -rn "from.*['\"].*\(validation\|raceConditionPrevention\|enhancedSidePots\)['\"]" src convex 2>/dev/null
```

Expected: 0 ligne. Si une ligne sort, **stop** et investigation : un nouveau consommateur est apparu depuis l'audit.

- [ ] **Step 2: Vérifier les imports côté tests**

Run:

```bash
grep -n "validation\|enhancedSidePots\|raceConditionPrevention" tests/poker-integrity.test.js
```

Expected: lignes 12-21 (imports) + utilisations dans tests `validatePlayerAction`, `validateGameState`, `sanitizeAmount`, `actionRateLimiter`, `calculateSidePotsEnhanced`, `validateSidePots`.

- [ ] **Step 3: Supprimer les 3 fichiers backend**

```bash
rm convex/utils/validation.ts convex/utils/raceConditionPrevention.ts convex/utils/enhancedSidePots.ts
```

- [ ] **Step 4: Nettoyer `tests/poker-integrity.test.js`**

Lire `tests/poker-integrity.test.js`. Effectuer ces modifications :

- **Retirer le bloc d'import** (lignes 11-21 environ) :
  ```javascript
  import { 
    validatePlayerAction, 
    validateGameState,
    sanitizeAmount,
    actionRateLimiter 
  } from '../convex/utils/validation';

  import { 
    calculateSidePotsEnhanced,
    validateSidePots 
  } from '../convex/utils/enhancedSidePots';
  ```

- **Retirer les `describe`/`it` qui exercent ces fonctions** :
  - Tous les `it(...)` qui appellent `validatePlayerAction`, `validateGameState`, `sanitizeAmount`, `actionRateLimiter`, `calculateSidePotsEnhanced`, `validateSidePots`.
  - Méthode : pour chaque ligne du grep `validatePlayerAction|validateGameState|sanitizeAmount|actionRateLimiter|calculateSidePotsEnhanced|validateSidePots`, identifier le `it(...)` ou `describe(...)` englobant et le supprimer en entier.
  - Si un `describe` se retrouve vide après retrait des `it`, supprimer aussi le `describe`.

- **Conserver** : tous les tests qui n'utilisent que `evaluateHandRobust`, `determineWinners`, `validateHand` (tests handEvaluator) et `getBlindPositions` (tests poker).

- [ ] **Step 5: Vérifier que le test file parse encore**

Run:

```bash
node --check tests/poker-integrity.test.js
```

Expected: aucune sortie (parse OK).

- [ ] **Step 6: Vérifier que `npx vitest run` ne casse pas par import**

Run:

```bash
npx vitest run --no-color 2>&1 | head -40
```

Expected: vitest démarre, analyse le fichier, lance les tests restants. Le test "Royal Flush" échouera toujours (Task 7), c'est attendu. Aucune erreur d'import (`Cannot find module '../convex/utils/validation'`) ne doit subsister.

- [ ] **Step 7: Commit**

```bash
git add -A
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(convex): supprimer modules backend morts (validation, raceConditionPrevention, enhancedSidePots)

Aucun consommateur en code applicatif. Les tests qui les exerçaient sont
également retirés (tests d'un code mort). Résout A1.1, A4.1, A4.2, A4.3 et
3 occurrences de A1.3."
```

---

### Task 3: Suppression exports morts dans convex/users.ts, auth.ts, players.ts, tables.ts + fix unused `ctx`

**Findings résolus** : A4.7, A4.8, A4.9, A4.10, A1.3 partiellement (`convex/auth.ts:91`).

**Files:**
- Modify: `convex/users.ts`
- Modify: `convex/auth.ts`
- Modify: `convex/players.ts`
- Modify: `convex/tables.ts`

- [ ] **Step 1: Vérifier 0 consommateur des exports à supprimer**

Run:

```bash
for sym in getCurrentUser createUser createOrUpdateUser getUserByEmail updateLastSeen getCurrentSession resetPlayersForNewHand getTableByInviteCode; do
  echo "=== $sym ==="
  grep -rn "$sym" src convex --include="*.ts" --include="*.tsx" | grep -v "_generated" | grep -v "convex/users.ts" | grep -v "convex/auth.ts" | grep -v "convex/players.ts" | grep -v "convex/tables.ts" | head -5
done
```

Expected: chaque section vide. Si une référence sort, **stop** : le symbole est en fait utilisé, à conserver et signaler dans le commit.

- [ ] **Step 2: Modifier `convex/users.ts`**

Supprimer les 5 exports : `getCurrentUser`, `createUser`, `createOrUpdateUser`, `getUserByEmail`, `updateLastSeen`. Conserver : `getUser`, `updateUserProfile`, `generateAvatarUploadUrl`, `getAvatarImageUrl`.

Pour chaque export à retirer, supprimer le bloc complet `export const X = mutation/query({...})`.

- [ ] **Step 3: Modifier `convex/auth.ts`**

Lire le fichier autour de la ligne 90 pour identifier `getCurrentSession`. Supprimer le bloc complet `export const getCurrentSession = ...`.

Aussi : finding A1.3 = unused `ctx` ligne 91. Si ce paramètre est dans `getCurrentSession`, il disparaît avec la suppression. Si c'est ailleurs, le préfixer en `_ctx` (param d'API public Convex qui doit garder sa position).

- [ ] **Step 4: Modifier `convex/players.ts`**

Supprimer `export const resetPlayersForNewHand = mutation({...})` (ligne ~211).

- [ ] **Step 5: Modifier `convex/tables.ts`**

Supprimer `export const getTableByInviteCode = query({...})` (ligne ~128).

- [ ] **Step 6: Vérifier typecheck**

Run:

```bash
npm run typecheck 2>&1 | tee .typecheck.tmp | tail -20
```

Expected: l'erreur `convex/auth.ts:91 'ctx' declared but never read` a disparu. Les 3 erreurs sur `convex/utils/validation.ts` ont disparu (Task 2). D'autres erreurs subsistent (Tasks 5, 6).

- [ ] **Step 7: Commit**

```bash
rm -f .typecheck.tmp
git add convex/users.ts convex/auth.ts convex/players.ts convex/tables.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(convex): supprimer exports morts (users, auth, players, tables)

- users.ts: getCurrentUser, createUser, createOrUpdateUser, getUserByEmail, updateLastSeen
- auth.ts: getCurrentSession
- players.ts: resetPlayersForNewHand
- tables.ts: getTableByInviteCode

Résout A4.7, A4.8, A4.9, A4.10 et A1.3 (ctx unused)."
```

---

### Task 4: Suppression modules frontend morts

**Findings résolus** : A4.4, A4.5, A4.6, A6.3.

**Files:**
- Delete: `src/demo.tsx`
- Delete: `src/core/components/UI/UIDemo.tsx`
- Delete: `src/core/utils/timeoutManager.ts`
- Delete: `src/shared/utils/moduleLoader.ts`
- Delete: `src/config/modules.ts`
- Delete: `src/config/features.ts`

- [ ] **Step 1: Vérifier 0 consommateur**

Run:

```bash
for f in "demo" "UIDemo" "timeoutManager" "moduleLoader" "config/modules" "config/features"; do
  echo "=== $f ==="
  grep -rn "from.*['\"].*$f['\"]" src --include="*.ts" --include="*.tsx" | grep -v "_generated" | head -5
done
```

Expected: pour chaque fichier, soit aucune sortie (orphelin total), soit uniquement des imports **internes à la chaîne morte** (ex : `moduleLoader` importe `config/modules`). Si un import vient d'ailleurs, **stop**.

- [ ] **Step 2: Vérifier que `src/main.tsx` ne charge pas `demo`**

Run:

```bash
grep -n "demo" src/main.tsx 2>/dev/null
```

Expected: aucune ligne (l'entry-point doit charger `App`, pas `Demo`).

- [ ] **Step 3: Supprimer les fichiers**

```bash
rm src/demo.tsx \
   src/core/components/UI/UIDemo.tsx \
   src/core/utils/timeoutManager.ts \
   src/shared/utils/moduleLoader.ts \
   src/config/modules.ts \
   src/config/features.ts
```

- [ ] **Step 4: Vérifier que `src/config/` n'est pas vide**

```bash
ls src/config/ 2>/dev/null
```

Si vide → `rmdir src/config/`. Sinon laisser tel quel.

- [ ] **Step 5: Vérifier typecheck**

Run:

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: aucune erreur "Cannot find module" introduite. Les erreurs restantes sont les unused locals frontend (Task 5) et `style` PlayingCard (Task 6).

- [ ] **Step 6: Vérifier que `npm run dev` démarre (smoke check)**

⚠️ **Optionnel mais recommandé** : si possible, lancer `npm run dev` 5 secondes en background, vérifier qu'il démarre sans erreur, puis tuer.

```bash
npx vite build --mode development 2>&1 | tail -10
```

Expected: build réussit ou échoue uniquement sur les erreurs déjà connues (Tasks 5, 6). Pas d'erreur "Cannot find module" sur les fichiers supprimés.

- [ ] **Step 7: Commit**

```bash
git add -A
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(src): supprimer modules frontend morts

- src/demo.tsx + src/core/components/UI/UIDemo.tsx (composants demo orphelins)
- src/core/utils/timeoutManager.ts (jamais importé)
- src/shared/utils/moduleLoader.ts + src/config/modules.ts + src/config/features.ts
  (chaîne module-loader complète orpheline)

Résout A4.4, A4.5, A4.6, A6.3."
```

---

### Task 5: Nettoyage unused locals/params restants

**Findings résolus** : A1.3 (occurrences restantes après Tasks 2-3).

**Files:**
- Modify: `convex/utils/handEvaluator.ts` (lignes ~122, 212, 241, 464)
- Modify: `convex/utils/poker.ts` (ligne ~146)
- Modify: `src/core/components/App/AppMain.tsx` (ligne 1)
- Modify: `src/core/components/Auth/SignInButton.tsx` (ligne 13)
- Modify: `src/core/components/Auth/UserProfile.tsx` (ligne 20)
- Modify: `src/core/components/Game/BettingControls.tsx` (ligne 28)
- Modify: `src/core/hooks/useBreakpoint.ts` (ligne 25)
- Modify: `src/core/hooks/useGameLogic.ts` (ligne 21)

**Règle de décision par finding** :
- Si une variable/import locale est inutile → **supprimer**
- Si un paramètre fait partie d'une API publique Convex/React où la position compte → **préfixer par `_`**
- Si une fonction est jamais utilisée → **supprimer**

- [ ] **Step 1: Lister les erreurs unused exactes**

Run:

```bash
npm run typecheck 2>&1 | grep -E "TS6133|noUnused" | head -30
```

Conserver cette liste pour traiter chaque ligne.

- [ ] **Step 2: Traiter `convex/utils/handEvaluator.ts`**

Lire les lignes ~122, 212, 241, 464.

- Ligne ~122 : variable locale `handString` jamais utilisée — la supprimer (la valeur n'est pas réutilisée après son calcul).
- Ligne ~212 : `evaluateShortDeckFallback` — fonction jamais appelée. Mais c'est en interne du module, possiblement dormante. **Supprimer** (le rapport A4.11 confirme mort).
- Ligne ~241 : `isShortDeck` — variable locale jamais lue. Supprimer la ligne (`const isShortDeck = ...`).
- Ligne ~464 : `game` — paramètre. Si la fonction est exportée et que `game` est dans la signature publique, préfixer en `_game`. Sinon supprimer le paramètre.

Édition :

```typescript
// Avant ligne 122 :
const cardStrings = cards.map(cardToPokerSolverFormat);
const handString = cardStrings.join(' ');  // ← variable jamais lue

// Après :
const cardStrings = cards.map(cardToPokerSolverFormat);
// (handString supprimée)
```

Pour `evaluateShortDeckFallback` (ligne ~212) : supprimer toute la fonction `function evaluateShortDeckFallback(...) { ... }` ainsi que les éventuels appels dans le module si présents.

Pour `isShortDeck` ligne 241 : supprimer la ligne `const isShortDeck = game === 'shortdeck';` si elle n'est pas utilisée derrière. Vérifier en cherchant `isShortDeck` dans le fichier (`grep -n "isShortDeck" convex/utils/handEvaluator.ts`).

- [ ] **Step 3: Traiter `convex/utils/poker.ts:146`**

Lire la fonction concernée. Le paramètre `maxPlayers` est inutilisé.

- Si la fonction est exportée et que des consommateurs lui passent `maxPlayers` : préfixer en `_maxPlayers`.
- Sinon : supprimer le paramètre de la signature et de tous les appels (vérifier avec `grep`).

Vérifier avant édit :

```bash
grep -rn "getBlindPositions\|maxPlayers" convex/utils/poker.ts | head
```

Décider sur la base de la signature et des callers.

- [ ] **Step 4: Traiter les 6 frontend (un par fichier)**

| Fichier | Ligne | Symbole | Action |
|---|---|---|---|
| `src/core/components/App/AppMain.tsx` | 1 | `useMemo` (import) | Retirer de l'import |
| `src/core/components/Auth/SignInButton.tsx` | 13 | `login` (variable) | Supprimer la déclaration |
| `src/core/components/Auth/UserProfile.tsx` | 20 | `isTablet` (variable) | Supprimer la déclaration |
| `src/core/components/Game/BettingControls.tsx` | 28 | `currentBet` (prop déstructurée) | Supprimer du destructuring |
| `src/core/hooks/useBreakpoint.ts` | 25 | `forceMobileForIOS` (variable) | Supprimer la déclaration |
| `src/core/hooks/useGameLogic.ts` | 21 | `timeoutIds` (variable) | Supprimer la déclaration |

Pour chaque fichier : lire le contexte autour de la ligne, supprimer proprement, vérifier que le code compile.

- [ ] **Step 5: Vérifier typecheck**

Run:

```bash
npm run typecheck 2>&1 | grep -E "error TS" | wc -l
```

Expected : ne reste que la ou les erreurs liées à la prop `style` PlayingCard (Task 6). Si plus de 2 erreurs subsistent, identifier et corriger avant de commiter.

- [ ] **Step 6: Commit**

```bash
git add -A
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(types): nettoyer unused locals/params (noUnusedLocals)

8 fichiers touchés (handEvaluator, poker, AppMain, SignInButton, UserProfile,
BettingControls, useBreakpoint, useGameLogic). Suppressions ou préfixage en _.

Résout A1.3 (occurrences restantes)."
```

---

### Task 6: Fix prop `style` sur PlayingCard

**Findings résolus** : A1.2.

**Files:**
- Modify: `src/core/components/Game/GameAnimations.tsx` (ligne 190)
- Optional: `src/core/components/UI/Card.tsx` si on étend les props (alternative)

**Stratégie** : Le composant `PlayingCard` (alias `Card`) accepte déjà `animationDelay?: number` et le convertit en `style={{ animationDelay: '${animationDelay}ms' }}` interne. Le call-site ligne 190 contourne ce mécanisme avec `style={{ animationDelay: "200ms" }}` directement. **Le fix le plus propre** : utiliser la prop `animationDelay` existante au lieu de `style`.

- [ ] **Step 1: Lire le contexte exact**

Lire `src/core/components/Game/GameAnimations.tsx` lignes 175-200.

État avant :

```tsx
<Card
  card={{ suit: "spades", rank: "K" }}
  size="sm"
  className={cn(
    "transition-all duration-300",
    animationState.isDealing && "card-slide"
  )}
  style={{ animationDelay: "200ms" }}
/>
```

- [ ] **Step 2: Remplacer `style` par `animationDelay`**

Édition :

```tsx
<Card
  card={{ suit: "spades", rank: "K" }}
  size="sm"
  className={cn(
    "transition-all duration-300",
    animationState.isDealing && "card-slide"
  )}
  animationDelay={200}
/>
```

- [ ] **Step 3: Vérifier qu'il n'y a pas d'autre usage de `style` sur `<Card>` ou `<PlayingCard>` dans le repo**

Run:

```bash
grep -rn "<Card[^>]*style=\|<PlayingCard[^>]*style=" src --include="*.tsx" | head
```

Expected: 0 ligne. Si une autre apparition existe, l'auditer et la traiter de la même façon (ou élargir la solution en ajoutant `style?: CSSProperties` à `PlayingCardProps`).

- [ ] **Step 4: Vérifier typecheck propre**

Run:

```bash
npm run typecheck
```

Expected: **exit 0**, aucune erreur.

- [ ] **Step 5: Vérifier lint propre**

Run:

```bash
npm run lint
```

Expected: **exit 0**. Des warnings peuvent rester (autorisés depuis Task 1), mais aucun "error".

- [ ] **Step 6: Commit**

```bash
git add src/core/components/Game/GameAnimations.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(ui): utiliser animationDelay au lieu de style sur <Card>

Le composant Card a déjà une prop animationDelay qui produit en interne
le style={{ animationDelay: ... }}. Pas besoin de passer style directement.

Résout A1.2."
```

---

### Task 7: Fix bug Royal Flush dans handEvaluator

**Findings résolus** : A3.1.

⚠️ **Risque R2 (spec)** : Si > 2h de diag sans avancée, escalader.

**Files:**
- Modify: `convex/utils/handEvaluator.ts`

**Contexte du bug** : Le test `tests/poker-integrity.test.js:28-40` envoie A♠ K♠ Q♠ J♠ 10♠ et attend `{ name: 'Royal Flush', rank: 9 }`. Le résultat actuel est `{ name: 'Straight Flush', rank: 8 }` (selon rapport audit A3.1).

**Hypothèse principale** : pokersolver retourne `name: "Straight Flush"` pour un royal flush (sa plus haute valeur étant typiquement un sf de rang 8 ou 9). Le code de `evaluateHandWithGame` retourne directement `solvedHand.name` sans convertir le cas spécial Royal Flush. Il faut ajouter une détection.

- [ ] **Step 1: Reproduire le bug en isolation**

Run:

```bash
npx vitest run tests/poker-integrity.test.js -t "royal flush" 2>&1 | tail -25
```

Expected: échec avec message clair (`expected 'Straight Flush' to be 'Royal Flush'` ou similaire).

- [ ] **Step 2: Diagnostiquer le retour pokersolver**

Créer un script de diagnostic temporaire — pas commit :

```bash
cat > /tmp/diag-royal.mjs <<'EOF'
import { Hand } from 'pokersolver';
const cards = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
const h = Hand.solve(cards);
console.log({
  name: h.name,
  rank: h.rank,
  descr: h.descr,
  cards: h.cards.map(c => c.toString()),
});
EOF
node /tmp/diag-royal.mjs
rm /tmp/diag-royal.mjs
```

Expected: une sortie indiquant `name`, `rank`, `descr`. Le `descr` devrait contenir "Royal" ou la combinaison spécifique. Noter ces valeurs pour décider du fix.

Si pokersolver retourne déjà `name: "Royal Flush"`, alors le bug est ailleurs (fonction `evaluateHandWithGame` qui modifie le résultat). Inspecter `convex/utils/handEvaluator.ts:124-146`.

Si pokersolver retourne `name: "Straight Flush"` même pour A-K-Q-J-T, il faut **détecter** le cas Royal Flush nous-mêmes.

- [ ] **Step 3: Lire `evaluateHandWithGame`**

Lire `convex/utils/handEvaluator.ts:95-155` pour comprendre la chaîne de conversion.

- [ ] **Step 4: Implémenter le fix selon le cas**

**Cas A — pokersolver retourne déjà "Royal Flush"** : alors la chaîne de conversion écrase le nom quelque part. Inspecter et corriger.

**Cas B — pokersolver renvoie "Straight Flush"** : ajouter une détection dans `evaluateHandWithGame` après l'appel `Hand.solve(cardStrings, game)`. Logique :

```typescript
// Détection Royal Flush : Straight Flush avec carte la plus haute = As (et 5 cartes consécutives A-K-Q-J-T)
const isRoyalFlush =
  solvedHand.name === 'Straight Flush' &&
  handCards.length === 5 &&
  handCards.some(c => c.rank === 'A') &&
  handCards.some(c => c.rank === 'K') &&
  handCards.some(c => c.rank === 'Q') &&
  handCards.some(c => c.rank === 'J') &&
  handCards.some(c => c.rank === '10');

const finalName = isRoyalFlush ? 'Royal Flush' : solvedHand.name;
const finalRank = isRoyalFlush ? 9 : solvedHand.rank;

return {
  rank: finalRank,
  name: finalName,
  cards: handCards,
  description: solvedHand.descr,
  rawRank: finalRank,
  kickers: kickers,
  score: score
};
```

Insérer ce bloc dans `evaluateHandWithGame`, juste avant le `return` final (ligne ~138 du fichier original).

- [ ] **Step 5: Lancer le test ciblé**

Run:

```bash
npx vitest run tests/poker-integrity.test.js -t "royal flush"
```

Expected: **passe**.

- [ ] **Step 6: Lancer tous les tests handEvaluator**

Run:

```bash
npx vitest run tests/poker-integrity.test.js -t "Évaluation des Mains"
```

Expected: tous les tests de la `describe` "🃏 Évaluation des Mains" passent (Royal Flush + ties + wheel straight + autres).

- [ ] **Step 7: Vérifier typecheck/lint toujours verts**

Run:

```bash
npm run typecheck && npm run lint
```

Expected: exit 0 sur les deux.

- [ ] **Step 8: Commit**

```bash
git add convex/utils/handEvaluator.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(handEvaluator): détecter Royal Flush au-dessus de Straight Flush

pokersolver retourne 'Straight Flush' pour A-K-Q-J-T mono-suit. On détecte
ce cas spécifique pour retourner Royal Flush (rank 9).

Résout A3.1."
```

---

### Task 8: Retrait `bail: 1` et vérification full test suite

**Findings résolus** : A3.2.

**Files:**
- Modify: `vitest.config.js`

⚠️ **Risque R1 (spec)** : retirer `bail: 1` peut démasquer des tests qui échouaient en silence. Politique : > 3 tests cassent → escalader user.

- [ ] **Step 1: Modifier `vitest.config.js`**

Avant :

```javascript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    timeout: 10000,
    bail: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    }
  }
});
```

Après :

```javascript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    timeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    }
  }
});
```

(Retrait de la ligne `bail: 1`.)

- [ ] **Step 2: Lancer toute la suite de tests**

Run:

```bash
npx vitest run 2>&1 | tail -30
```

Expected: **tous les tests restants passent** (les tests qui dépendaient de validation/enhancedSidePots ont été retirés Task 2). Si > 3 tests échouent **et** ne sont pas couverts par le scope 1.A, **stopper et escalader user** (R1).

Si 1-3 tests échouent et la cause est claire (bug évident, fix < 30min) → procéder à un fix ad-hoc et signaler dans le commit message.

- [ ] **Step 3: Vérifier les 3 commandes critiques**

Run:

```bash
npm run typecheck && npm run lint && npx vitest run
echo "Exit final: $?"
```

Expected: **`Exit final: 0`**. C'est le critère de sortie 1.A.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.js
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(vitest): retirer bail:1 pour exécuter tous les tests

Visibilité avant productivité. La suite tourne maintenant en entier. Tous
les tests passent.

Résout A3.2."
```

---

### Task 9: Validation finale et bilan

**Files:** aucune modif — vérifications uniquement.

- [ ] **Step 1: Lancer les 3 commandes critiques en chaîne**

Run:

```bash
npm run typecheck && npm run lint && npx vitest run
echo "FINAL EXIT: $?"
```

Expected: `FINAL EXIT: 0`.

- [ ] **Step 2: Lister les commits 1.A**

Run:

```bash
git log --oneline master ^$(git rev-list --max-parents=0 HEAD) | head -20
git log --oneline -- 'docs/superpowers/specs/2026-05-04-fix-technique-1A-design.md' | head -2
```

Vérifier qu'il y a 8 commits techniques (Tasks 1-8) entre le commit du spec et HEAD.

- [ ] **Step 3: Vérifier qu'aucun fichier `.audit-tmp/` ou `.tmp` n'a fuité**

```bash
git status
ls .audit-tmp 2>&1 || echo "ok absent"
```

Expected: working tree propre, `.audit-tmp` absent.

- [ ] **Step 4: Préparer le bilan pour le user**

Construire un message court (< 200 mots) :

```
Phase 1.A terminée.

✅ typecheck, lint, vitest run : tous exit 0
📊 Tasks 1-8 commit, 8 commits techniques sur master
🧹 Code mort supprimé : 9 fichiers + 8 exports + 15 unused locals/params
🔧 Bug Royal Flush corrigé (handEvaluator)
🧪 Vitest : tous tests visibles passent

Findings résolus : A1.1, A1.2, A1.3, A2.1, A2.2, A2.3, A3.1, A3.2,
A4.1-A4.10, A6.3, A7.1, A7.2.

Findings reportés (hors scope 1.A) :
- A3.3, A3.4, A3.5, A3.6 (couverture tests étendue) → lot tests dédié
- A4.11 (helpers mineurs) → traités au passage Task 5 partiellement
- A5.1-A5.5 (cohérence schéma) → 0.B/1.B
- A7.3-A7.9 (deps obsolètes, configs cosmétiques) → lot deps dédié
- S1, S2, S3 (sécurité) → 0.C/1.C

Commit final : <SHA>
Repo prêt pour la phase 0.B (audit fonctionnel).
```

Adapter le bilan aux résultats réels (nombre exact de commits, SHA, anomalies).

---

## Self-Review

**Spec coverage** :
- ✅ Lot 1 (déblocage) : Tasks 1, 5, 6 + vérifications dans 6, 8
- ✅ Lot 2 (code mort backend) : Tasks 2, 3
- ✅ Lot 3 (code mort frontend) : Task 4
- ✅ Bug Royal Flush + retrait bail : Tasks 7, 8
- ✅ Hors-scope respecté : pas de tâche pour A3.3-A3.5, A5.x, A7.5+, S1-S3
- ✅ Stratégie de commits granulaire respectée (un commit par sous-étape logique)
- ✅ Risques R1, R2 explicitement mentionnés (Tasks 7, 8)
- ✅ Risque R3 (suppressions ordonnées) : Task 2 avant Task 3, Task 3 avant Task 4
- ✅ R4 (smoke `dev`) : Task 4 step 6

**Placeholder scan** : aucun TBD/TODO. Toutes les commandes et édits sont concrets. Pour Task 5 et 7, des décisions cas-par-cas restent (préfixe `_` vs suppression, fix Cas A vs Cas B) mais elles sont clairement explicitées avec règles de décision.

**Type consistency** :
- Le composant `PlayingCard` est exporté comme `Card` dans `src/core/components/UI/Card.tsx:189` (`export { PlayingCard as Card }`). Tasks 1-6 utilisent toutes `<Card>` (et le spec le confirme). Cohérent.
- `evaluateHandWithGame` est mentionné Tasks 7 step 3-4, son emplacement est `convex/utils/handEvaluator.ts`. Cohérent.
- Les noms de findings (A1.1, A2.1...) sont stables avec le rapport audit. Cohérent.

Plan complet et auto-suffisant.
