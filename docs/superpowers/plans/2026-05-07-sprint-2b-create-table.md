# Sprint 2B — BottomSheet "Créer une table" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sortir `CreateTableForm` (433 lignes, plein écran avec gradient + white card) du switch de vues d'`AppMain` et le monter dans un `BottomSheet` Sprint 0 ouvert depuis le bouton "Créer" du header AppShell. Visuel adopté aux tokens dark Sprint 0 et aux primitives `Input`/`Button`. Toute la logique de validation et d'état interne du formulaire est préservée.

**Architecture:** Le composant garde son état local (`useState formData`, `errors`), sa validation et son `onSubmit`/`onCancel`. On retire uniquement le wrapper plein écran (`min-h-screen bg-gradient-... flex items-center justify-center`) et le contenu blanc (`bg-white rounded-lg shadow-xl ...`) — le BottomSheet fournit le container. Tous les `bg-white`, `border-gray-300`, `text-gray-700`, `bg-poker-green-50` deviennent les tokens Sprint 0. Les `<input type="text|number">` natifs sont remplacés par la primitive `Input` quand pertinent (avec `error` prop). Les sélecteurs natifs `<select>` restent (pas de primitive Select Sprint 0).

`AppMain.tsx` : retrait du case `"create-table"` du switch, retrait de la lazy-load de `CreateTableForm` en module séparé, ajout d'un state `showCreateSheet`, et montage du `BottomSheet` à un endroit fixe dans le JSX (à côté de `AppShell`). `handleCreateTable` ouvre la sheet ; `handleTableCreated` (qui a déjà toute la logique) la ferme après succès.

**Tech Stack:** Vite + React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0.

---

## File Structure

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Table/CreateTableForm.tsx` | Rewrite visuel (drop fullscreen wrapper, dark tokens, primitives) ; logique préservée |
| `src/core/components/App/AppMain.tsx` | Retrait du `case "create-table"` du switch + montage `BottomSheet` |

### Files NOT touched

- `convex/tables.ts` (mutation `createTable`).
- `src/core/hooks/useTables.ts` (whitelist déjà en place).
- Reste des composants Lobby (mergés Sprint 2A).

---

## Task 1 : Refondre le visuel de `CreateTableForm`

**Files:**
- Modify: `src/core/components/Table/CreateTableForm.tsx`

### Goal

Convertir le composant en un contenu prêt à être monté dans un `BottomSheet` :
- Drop le wrapper `<div className="min-h-screen bg-gradient-...">` et la `<div className="bg-white rounded-lg shadow-xl ...">`.
- Drop le titre "Créer une nouvelle table" / sous-titre (le BottomSheet a son propre titre).
- Replace les inputs `<input className="...gray-300...">` par la primitive `Input` Sprint 0 (avec `label`, `error`, `hint`).
- Replace tous les classNames de couleur avec les tokens Sprint 0 (`bg-bg-elevated`, `text-text-primary`, `text-text-muted`, `border-border-default`, `bg-accent`, `bg-sem-danger`, `text-sem-danger`, `bg-purple-500/20`).
- Garde `<select>` (pas de primitive Select), restyles avec les tokens.
- Garde le bouton submit (utilise `Button` Sprint 0 — déjà importé via `'../UI/Button'` legacy, à migrer vers `'../../shared/ui/Button'`).
- Garde toute la logique interne intacte (state, useEffect preset map, validation, handleGameTypeChange, handleSubmit).

### Step 1.1 — Replace ENTIRE content of `src/core/components/Table/CreateTableForm.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { GameType } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';

interface CreateTableFormProps {
  onSubmit: (tableData: CreateTableData) => void;
  onCancel: () => void;
}

export type TournamentPreset = 'turbo' | 'standard' | 'long' | 'custom';

export interface CreateTableData {
  name: string;
  maxPlayers: number;
  gameType: GameType;
  buyIn?: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  isPrivate: boolean;
  preset?: TournamentPreset;
  levelDurationMin?: number;
}

const SELECT_CLASS =
  'min-h-tap w-full rounded-lg px-3 bg-bg-elevated text-text-primary border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export const CreateTableForm: React.FC<CreateTableFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTableData>({
    name: `Table de ${user?.name || 'Joueur'}`,
    maxPlayers: 6,
    gameType: 'cash',
    startingStack: 1000,
    smallBlind: 10,
    bigBlind: 20,
    isPrivate: false,
  });

  // Tournament preset → auto level duration mapping
  useEffect(() => {
    if (formData.gameType !== 'tournament') return;
    const preset = formData.preset;
    if (!preset || preset === 'custom') return;
    const map: Record<Exclude<TournamentPreset, 'custom'>, number> = {
      turbo: 5,
      standard: 10,
      long: 15,
    };
    const target = map[preset];
    if (formData.levelDurationMin !== target) {
      setFormData((prev) => ({ ...prev, levelDurationMin: target }));
    }
  }, [formData.preset, formData.gameType, formData.levelDurationMin]);

  const [errors, setErrors] = useState<Partial<Record<keyof CreateTableData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la table est requis';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Le nom doit contenir au moins 3 caractères';
    }
    if (formData.maxPlayers < 2 || formData.maxPlayers > 9) {
      newErrors.maxPlayers = 'Entre 2 et 9 joueurs maximum';
    }
    if (formData.gameType === 'cash' && formData.smallBlind <= 0) {
      newErrors.smallBlind = 'La petite blind doit être positive';
    }
    if (formData.gameType === 'cash' && formData.bigBlind <= formData.smallBlind) {
      newErrors.bigBlind = 'La grosse blind doit être supérieure à la petite blind';
    }
    if (
      formData.gameType === 'tournament' &&
      (formData.buyIn === undefined || formData.buyIn < 0)
    ) {
      newErrors.buyIn = 'Le buy-in doit être 0 ou plus (0 = freeroll)';
    }
    if (formData.startingStack <= 0) {
      newErrors.startingStack = 'Le stack de départ doit être positif';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
  };

  const handleGameTypeChange = (gameType: GameType) => {
    setFormData((prev) => ({
      ...prev,
      gameType,
      buyIn: gameType === 'tournament' ? 0 : undefined,
      startingStack: gameType === 'tournament' ? 1500 : 1000,
      preset: gameType === 'tournament' ? prev.preset ?? 'standard' : undefined,
      levelDurationMin:
        gameType === 'tournament' ? prev.levelDurationMin ?? 10 : undefined,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Nom */}
      <Input
        label="Nom de la table"
        type="text"
        placeholder="Ex: Table des amis"
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        error={errors.name}
      />

      {/* Type de partie */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Type de partie</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleGameTypeChange('cash')}
            className={cn(
              'min-h-tap p-3 rounded-lg text-left border-2 transition-colors',
              formData.gameType === 'cash'
                ? 'border-accent bg-accent/10'
                : 'border-border-default hover:border-accent/50',
            )}
          >
            <div className="font-medium text-text-primary">Cash Game</div>
            <div className="text-xs text-text-muted">Entrée et sortie libres</div>
          </button>
          <button
            type="button"
            onClick={() => handleGameTypeChange('tournament')}
            className={cn(
              'min-h-tap p-3 rounded-lg text-left border-2 transition-colors',
              formData.gameType === 'tournament'
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-border-default hover:border-purple-400/50',
            )}
          >
            <div className="font-medium text-text-primary">Tournoi</div>
            <div className="text-xs text-text-muted">Buy-in fixe, élimination</div>
          </button>
        </div>
      </div>

      {/* Réglages tournoi */}
      {formData.gameType === 'tournament' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border border-purple-400/30 bg-purple-500/5 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Structure</label>
            <select
              value={formData.preset ?? 'standard'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  preset: e.target.value as TournamentPreset,
                }))
              }
              className={SELECT_CLASS}
            >
              <option value="turbo">Turbo (5 min)</option>
              <option value="standard">Standard (10 min)</option>
              <option value="long">Long (15 min)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Stack de départ</label>
            {formData.preset === 'custom' ? (
              <Input
                type="number"
                min={1}
                value={formData.startingStack}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startingStack: parseInt(e.target.value) || 0,
                  }))
                }
              />
            ) : (
              <select
                value={formData.startingStack}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startingStack: parseInt(e.target.value),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value={1500}>1500</option>
                <option value={3000}>3000</option>
                <option value={5000}>5000</option>
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Durée par niveau (min)</label>
            {formData.preset === 'custom' ? (
              <select
                value={formData.levelDurationMin ?? 10}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    levelDurationMin: parseInt(e.target.value),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            ) : (
              <Input
                type="number"
                value={formData.levelDurationMin ?? 10}
                disabled
              />
            )}
          </div>
        </div>
      )}

      {/* Joueurs max */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-text-muted">Nombre de joueurs max</label>
        <select
          value={formData.maxPlayers}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, maxPlayers: parseInt(e.target.value) }))
          }
          className={cn(SELECT_CLASS, errors.maxPlayers && 'border-sem-danger')}
        >
          {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const labels: Record<number, string> = {
              2: 'Heads-up',
              3: 'Trio',
              4: 'Carré',
              5: 'Petit groupe',
              6: 'Standard',
              7: 'Grande table',
              8: 'Full ring',
              9: 'Max',
            };
            return (
              <option key={num} value={num}>
                {num} joueurs ({labels[num]})
              </option>
            );
          })}
        </select>
        {errors.maxPlayers && (
          <p className="text-xs text-sem-danger">{errors.maxPlayers}</p>
        )}
      </div>

      {/* Buy-in + Stack (en cash, stack en pleine largeur ; en tournoi non-custom, stack géré au-dessus) */}
      <div
        className={cn(
          'grid gap-3',
          formData.gameType === 'tournament' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {formData.gameType === 'tournament' && (
          <Input
            label="Buy-in (prix d'entrée)"
            type="number"
            min={0}
            value={formData.buyIn ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                buyIn: parseInt(e.target.value) || undefined,
              }))
            }
            error={errors.buyIn}
            hint="0 = freeroll gratuit"
          />
        )}

        {formData.gameType === 'cash' && (
          <Input
            label="Stack de départ (jetons)"
            type="number"
            min={1}
            value={formData.startingStack}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                startingStack: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.startingStack}
            hint="Jetons reçus au début de la partie"
          />
        )}
      </div>

      {/* Blinds (cash uniquement) */}
      {formData.gameType === 'cash' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Petite blind"
            type="number"
            min={1}
            value={formData.smallBlind}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                smallBlind: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.smallBlind}
          />
          <Input
            label="Grosse blind"
            type="number"
            min={1}
            value={formData.bigBlind}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                bigBlind: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.bigBlind}
          />
        </div>
      )}

      {/* Privacy */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.isPrivate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, isPrivate: e.target.checked }))
          }
          className="mt-1 w-4 h-4 accent-accent"
        />
        <div>
          <div className="font-medium text-text-primary">Table privée</div>
          <div className="text-xs text-text-muted">
            Seuls les joueurs invités peuvent rejoindre cette table.
          </div>
        </div>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" variant="success" className="flex-1">
          Créer la table
        </Button>
      </div>
    </form>
  );
};
```

### Step 1.2 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # tous les tests existants doivent passer
```

### Step 1.3 — Commit

```bash
git add src/core/components/Table/CreateTableForm.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "refactor(table): CreateTableForm sheet-friendly (dark tokens, primitives Sprint 0)"
```

---

## Task 2 : Migrer `CreateTableForm` dans un BottomSheet via `AppMain`

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

### Goal

Retirer la vue `"create-table"` du switch, ajouter un state `showCreateSheet`, monter le `BottomSheet` (Sprint 0) contenant `CreateTableForm`. `handleCreateTable` ouvre la sheet ; `handleTableCreated` la ferme. `handleCancelCreateTable` la ferme aussi (sans nav).

### Step 2.1 — Lire l'état actuel

D'abord, lire `src/core/components/App/AppMain.tsx` pour repérer :
- L'import lazy `CreateTableForm`
- Le case `"create-table"` du `renderView()`
- `handleCreateTable`, `handleTableCreated`, `handleCancelCreateTable`
- Le type `AppView` qui inclut `"create-table"`

### Step 2.2 — Modifier `AppMain.tsx`

Appliquer les changements suivants :

**a)** Remplacer l'import lazy `CreateTableForm` par un import direct (sera chargé seulement quand le formulaire est ouvert via la sheet) :

```tsx
// Avant :
const CreateTableForm = lazy(() =>
  import("../Table/CreateTableForm").then((m) => ({ default: m.CreateTableForm }))
);

// Après :
import { CreateTableForm } from "../Table/CreateTableForm";
import type { CreateTableData } from "../Table/CreateTableForm";
```

(Si le type `CreateTableData` est déjà importé via `import type { CreateTableData }`, vérifier la ligne et la conserver/dédupliquer.)

**b)** Ajouter l'import du `BottomSheet` Sprint 0 :

```tsx
import { BottomSheet } from "../../../shared/ui/BottomSheet";
```

**c)** Réduire le type `AppView` : retirer `"create-table"` :

```tsx
type AppView = "lobby" | "table" | "stats";
```

**d)** Ajouter le state `showCreateSheet` :

```tsx
const [showCreateSheet, setShowCreateSheet] = useState(false);
```

**e)** Modifier `handleCreateTable` :

```tsx
const handleCreateTable = () => {
  setShowCreateSheet(true);
};
```

**f)** Modifier `handleCancelCreateTable` :

```tsx
const handleCancelCreateTable = () => {
  setShowCreateSheet(false);
};
```

**g)** Modifier `handleTableCreated` à la fin :

À la fin (après `setSelectedTableId(tableId); setCurrentView("table");`), ajouter :

```tsx
setShowCreateSheet(false);
```

**h)** Retirer le `case "create-table":` du `renderView()` :

```tsx
// retirer entièrement le bloc case "create-table": ... return (...);
```

**i)** Monter le `BottomSheet` dans le JSX. Trouver le `return ( <AppShell ...>{renderView()}</AppShell> )` final. Wrap en fragment pour ajouter la sheet à côté :

```tsx
return (
  <>
    <AppShell
      title={headerTitle}
      tabs={tabs}
      activeTabId={viewToTab(currentView)}
      onTabChange={onTabChange}
      fullscreen={currentView === "table"}
      headerAction={headerAction}
    >
      {renderView()}
    </AppShell>
    <BottomSheet
      isOpen={showCreateSheet}
      onClose={() => setShowCreateSheet(false)}
      title="Créer une nouvelle table"
    >
      <CreateTableForm
        onSubmit={handleTableCreated}
        onCancel={handleCancelCreateTable}
      />
    </BottomSheet>
  </>
);
```

**j)** `headerTitle` n'a plus besoin du case `"create-table"` :

```tsx
const headerTitle = (() => {
  switch (currentView) {
    case "lobby": return title;
    case "stats": return "Stats";
    case "table": return title;
    default: return title;
  }
})();
```

**k)** `viewToTab` reste OK (n'utilisait pas `"create-table"`).

### Step 2.3 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui     # 98 tests
npm run test -- --run       # full suite
```

Tester en local :
- Clic "Créer" depuis le lobby → BottomSheet s'ouvre.
- Annuler → sheet se ferme, retour lobby.
- Créer une table valide → sheet se ferme, navigation vers la table.
- Validation erreur (nom vide, blinds invalides) → erreurs affichées sans fermer la sheet.

### Step 2.4 — Commit

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(lobby): CreateTableForm dans un BottomSheet (drop view create-table)"
```

---

## Task 3 : Audit + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 3.1 — Audits

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

Tous OK (sauf 4 échecs pré-existants security-c1 + prizeStructure).

### Step 3.2 — Update `CHANGELOG.md`

Ajouter en haut :

```markdown
## [Unreleased] — Sprint 2B BottomSheet "Créer une table"

### Modifié
- `CreateTableForm` réécrit visuellement : drop le wrapper plein écran (gradient + white card), tokens Sprint 0 dark, primitives `Input` et `Button` Sprint 0, sélecteurs natifs restylés. Toute la logique (validation, preset map tournoi, handleGameTypeChange) est préservée.
- `AppMain` : suppression du case `"create-table"` du switch de vues. `CreateTableForm` est désormais monté dans un `BottomSheet` Sprint 0 ouvert via le bouton "Créer" du header AppShell, fermé sur cancel/submit/escape/backdrop. Plus de navigation vers une vue dédiée.

### Notes
- Le bundle initial perd l'overhead du chunk lazy `CreateTableForm` (le composant est désormais en import statique mais affiché uniquement quand la sheet est ouverte).
- L'ancienne route conceptuelle "create-table" disparaît du type `AppView`.
```

### Step 3.3 — Commit

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 2B BottomSheet créer une table"
```

---

## Critères de "Done" du Sprint 2B

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] L'écran "Créer une table" est désormais une `BottomSheet` ouverte depuis le bouton "Créer" du Lobby.
- [ ] Annuler / submit / escape / backdrop ferment la sheet.
- [ ] La validation d'erreur (nom court, BB ≤ SB, buy-in négatif) reste fonctionnelle.
- [ ] Plus de `bg-white` / `text-gray-700` dans `CreateTableForm.tsx`.
- [ ] CHANGELOG mis à jour.

## Risques & mitigations

- **Lazy loading retiré** : `CreateTableForm` était lazy-loaded. Maintenant en import statique → bundle initial légèrement plus lourd, mais le composant est petit (~250 lignes après refonte). Si le poids gêne, on peut re-lazifier le `<CreateTableForm>` à l'intérieur de la sheet via `<Suspense>` plus tard.
- **Hauteur de la sheet sur petits écrans** : `BottomSheet` a `maxHeight: 85vh` par défaut. Le formulaire (8-10 sections) peut être long ; le scroll interne du BottomSheet (`flex-1 overflow-y-auto`) gère ce cas.
- **Focus management** : la sheet n'a pas de focus trap complet (Sprint 6 polish). On accepte qu'un user puisse tabber hors de la sheet ; pas bloquant pour l'usage.

## Hors scope

- Sections collapsibles (un accordion par section). On garde tout déroulé pour Sprint 2B ; à itérer si demande utilisateur.
- Refonte UX du formulaire (par exemple wizard multi-étape pour mobile). La structure reste un long formulaire.
- Refonte de la mutation Convex `createTable` (déjà OK).
