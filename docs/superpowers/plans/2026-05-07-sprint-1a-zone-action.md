# Sprint 1A — Zone d'action mobile-first — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `BettingControls` selon le spec mobile-first : sur mobile/tablette, une barre d'action fixe (Fold / Check ou Call / Raise / All-in) + un `BottomSheet` qui glisse depuis le bas pour le Raise (slider, presets, confirmation). Sur desktop, layout inline traditionnel avec slider visible.

**Architecture:** Le composant `BettingControls` (`src/core/components/Game/BettingControls.tsx`) est réécrit complètement. Son API publique (props) reste IDENTIQUE pour ne pas toucher à `PokerTable.tsx` qui le consomme à deux endroits (mobile footer ligne 508, desktop layout ligne 884). En interne, il bascule via `useMediaQuery(BREAKPOINTS.lg)` entre une vue mobile (barre + sheet) et une vue desktop (inline). On utilise les primitives `BottomSheet`, `Button` et le hook `useMediaQuery` introduits au Sprint 0. Les autres composants Game (PlayerSeat, CommunityCards, animations, etc.) restent intacts — Sprints 1B/1C s'en occuperont.

**Tech Stack:** React 18 + TypeScript 6 + Tailwind 3.3.6 (avec tokens Sprint 0 : `accent`, `sem-*`, `min-h-tap`) + Vitest 4 + jsdom + Testing Library.

---

## File Structure

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Game/BettingControls.tsx` | **Rewrite complet** : nouvelle UI mobile-first, API props inchangée |

### Files to create

| Path | Purpose |
|---|---|
| `tests/ui/BettingControls.test.tsx` | Tests Vitest + Testing Library |

### Files NOT touched

- `src/core/components/Game/PokerTable.tsx` — consommateur. Aucune modification.
- Tous les autres composants Game/* (sièges, cartes, animations, drawers).
- Le hook legacy `src/core/hooks/useBreakpoint.ts` reste utilisé par d'autres composants ; on n'y touche pas. Nous utilisons `useMediaQuery` du Sprint 0 pour les nouvelles décisions de breakpoint à l'intérieur de BettingControls.
- Backend Convex.

---

## Notes pour l'implémenteur

### API actuelle de `BettingControls` (à PRÉSERVER)

```ts
interface GameAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

interface BettingControlsProps {
  availableActions: GameAction[];
  playerChips: number;
  currentBet: number;
  potSize: number;
  onAction: (action: GameAction) => void;
  disabled?: boolean;
  className?: string;
  potOdds?: string;
  handStrength?: string;
}
```

`onAction` doit recevoir le bon `{ action, amount? }` selon ce qui est cliqué :
- Fold → `{ action: 'fold' }`
- Check → `{ action: 'check' }`
- Call → `{ action: 'call', amount: callAction.amount }`
- All-in → `{ action: 'all-in', amount: allInAction.amount }`
- Raise → `{ action: 'raise', amount: chosenAmount }`

### Couleurs et tokens

- Fold = `variant="danger"` (bg-sem-danger)
- Check / Call = `variant="primary"` (bg-accent)
- Raise = `variant="success"` (bg-sem-success)
- All-in = `variant="danger"` (rouge fort, attention)

### Présets de mise (BottomSheet Raise)

`Min`, `½ pot`, `¾ pot`, `Pot`, `All-in` — chacun clamp entre `minRaise` et `maxRaise`. `All-in` preset = valeur `maxRaise`.

### Imports existants nécessaires

```ts
import { Button } from '../../../shared/ui/Button';
import { BottomSheet } from '../../../shared/ui/BottomSheet';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';
import { cn } from '../../../shared/utils/cn';
```

Note : le composant existant utilise `../UI/Button` (legacy). On bascule sur `../../../shared/ui/Button` (nouvelle primitive Sprint 0) qui supporte les variants `primary/secondary/danger/success/ghost` + `loading`.

---

## Task 1 : Test scaffold + render initial (action buttons)

**Files:**
- Create: `tests/ui/BettingControls.test.tsx`
- Modify: `src/core/components/Game/BettingControls.tsx` (squelette qui rend juste les boutons d'action)

- [ ] **Step 1.1 : Écrire le premier test**

`tests/ui/BettingControls.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BettingControls } from '../../src/core/components/Game/BettingControls';

function mockMatchMedia(matchesLg: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('1024') ? matchesLg : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }));
}

const baseProps = {
  availableActions: [
    { action: 'fold' as const },
    { action: 'check' as const },
  ],
  playerChips: 1000,
  currentBet: 0,
  potSize: 100,
  onAction: () => {},
};

describe('BettingControls — render', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false); // mobile par défaut
  });

  it('renders fold and check buttons when available', () => {
    render(<BettingControls {...baseProps} />);
    expect(screen.getByRole('button', { name: /fold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
  });

  it('does not render check when not available', () => {
    render(<BettingControls {...baseProps} availableActions={[{ action: 'fold' }]} />);
    expect(screen.queryByRole('button', { name: /check/i })).toBeNull();
  });

  it('triggers fold onAction with correct payload', async () => {
    const onAction = vi.fn();
    render(<BettingControls {...baseProps} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /fold/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'fold' });
  });

  it('triggers check onAction with correct payload', async () => {
    const onAction = vi.fn();
    render(<BettingControls {...baseProps} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'check' });
  });
});
```

- [ ] **Step 1.2 : Lancer, vérifier l'échec**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: tous les tests échouent (l'ancien composant existe mais sa structure ne match pas, ou erreurs de compilation suite au rewrite à venir).

- [ ] **Step 1.3 : Réécrire `src/core/components/Game/BettingControls.tsx` (squelette minimal)**

Remplacer le contenu COMPLET du fichier par :

```tsx
import React from 'react';
import { Button } from '../../../shared/ui/Button';
import { cn } from '../../../shared/utils/cn';

export interface GameAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface BettingControlsProps {
  availableActions: GameAction[];
  playerChips: number;
  currentBet: number;
  potSize: number;
  onAction: (action: GameAction) => void;
  disabled?: boolean;
  className?: string;
  potOdds?: string;
  handStrength?: string;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  availableActions,
  onAction,
  disabled = false,
  className,
}) => {
  const getAction = (type: GameAction['action']) =>
    availableActions.find((a) => a.action === type);

  const foldAction = getAction('fold');
  const checkAction = getAction('check');

  return (
    <div className={cn('flex gap-2 p-2', className)}>
      {foldAction && (
        <Button
          variant="danger"
          size="md"
          disabled={disabled}
          onClick={() => onAction({ action: 'fold' })}
          className="flex-1"
        >
          Fold
        </Button>
      )}
      {checkAction && (
        <Button
          variant="primary"
          size="md"
          disabled={disabled}
          onClick={() => onAction({ action: 'check' })}
          className="flex-1"
        >
          Check
        </Button>
      )}
    </div>
  );
};
```

- [ ] **Step 1.4 : Lancer, vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 4/4 tests passent.

- [ ] **Step 1.5 : Vérifier que le typecheck et le build passent**

Run: `npm run typecheck && npm run build`
Expected: 0 erreurs (vérifier que `PokerTable.tsx` consomme toujours `BettingControls` correctement — l'API est inchangée).

- [ ] **Step 1.6 : Commit**

```bash
git add src/core/components/Game/BettingControls.tsx tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): BettingControls réécrit — squelette Fold/Check (TDD)"
```

---

## Task 2 : Ajouter Call et All-in

**Files:**
- Modify: `src/core/components/Game/BettingControls.tsx`
- Modify: `tests/ui/BettingControls.test.tsx`

- [ ] **Step 2.1 : Ajouter les tests**

Append to `tests/ui/BettingControls.test.tsx` (à l'intérieur du `describe('BettingControls — render')`) :

```tsx
  it('renders Call X with the call amount', () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'fold' },
          { action: 'call', amount: 40 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /call 40/i })).toBeInTheDocument();
  });

  it('triggers call onAction with amount', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        onAction={onAction}
        availableActions={[{ action: 'call', amount: 40 }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /call 40/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'call', amount: 40 });
  });

  it('renders All-in with amount and triggers correctly', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        onAction={onAction}
        availableActions={[{ action: 'all-in', amount: 1000 }]}
      />,
    );
    const btn = screen.getByRole('button', { name: /all-in/i });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onAction).toHaveBeenCalledWith({ action: 'all-in', amount: 1000 });
  });
```

- [ ] **Step 2.2 : Lancer, vérifier l'échec**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 3 nouveaux tests échouent (Call et All-in pas implémentés).

- [ ] **Step 2.3 : Étendre le composant**

Modifier `BettingControls.tsx`. Dans la fonction component, après la déclaration de `checkAction`, ajouter :

```tsx
  const callAction = getAction('call');
  const allInAction = getAction('all-in');

  const formatAmount = (n?: number) =>
    n === undefined ? '' : n >= 1000 ? `${Math.floor(n / 1000)}K` : String(n);
```

Puis dans le JSX, après le bouton Check, ajouter :

```tsx
      {callAction && (
        <Button
          variant="primary"
          size="md"
          disabled={disabled}
          onClick={() =>
            onAction({ action: 'call', amount: callAction.amount })
          }
          className="flex-1"
        >
          Call {formatAmount(callAction.amount)}
        </Button>
      )}
      {allInAction && (
        <Button
          variant="danger"
          size="md"
          disabled={disabled}
          onClick={() =>
            onAction({ action: 'all-in', amount: allInAction.amount })
          }
          className="flex-1"
        >
          All-in {formatAmount(allInAction.amount)}
        </Button>
      )}
```

- [ ] **Step 2.4 : Lancer, vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 7/7 tests passent.

- [ ] **Step 2.5 : Commit**

```bash
git add src/core/components/Game/BettingControls.tsx tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): BettingControls — ajouter Call/All-in avec montants"
```

---

## Task 3 : Bouton Raise + ouverture du BottomSheet

**Files:**
- Modify: `src/core/components/Game/BettingControls.tsx`
- Modify: `tests/ui/BettingControls.test.tsx`

- [ ] **Step 3.1 : Tests**

Append :

```tsx
describe('BettingControls — Raise (mobile)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false); // mobile
  });

  it('shows Raise button when raise action is available', () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'fold' },
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /^raise$/i })).toBeInTheDocument();
  });

  it('opens BottomSheet when Raise is clicked', async () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    expect(screen.getByRole('dialog', { name: /relance|raise/i })).toBeInTheDocument();
  });

  it('closes BottomSheet on Cancel', async () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
```

- [ ] **Step 3.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 3 nouveaux tests échouent (Raise pas implémenté).

- [ ] **Step 3.3 : Implémenter le bouton Raise + BottomSheet vide (squelette)**

Modifier `BettingControls.tsx`. Ajouter en haut du fichier :

```tsx
import { useState } from 'react';
import { BottomSheet } from '../../../shared/ui/BottomSheet';
```

Dans le composant, ajouter :

```tsx
  const raiseAction = getAction('raise');
  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
```

Avant le `</div>` final, ajouter le bouton Raise (entre Call et All-in si tu préfères, ou en fin) :

```tsx
      {raiseAction && (
        <Button
          variant="success"
          size="md"
          disabled={disabled}
          onClick={() => setIsRaiseOpen(true)}
          className="flex-1"
        >
          Raise
        </Button>
      )}
```

Et après le `</div>` final, AVANT le `}` de fin de composant (donc dans un fragment) — wrappe le tout dans un fragment `<>...</>`:

```tsx
  return (
    <>
      <div className={cn('flex gap-2 p-2', className)}>
        {/* boutons existants */}
      </div>
      {raiseAction && (
        <BottomSheet
          isOpen={isRaiseOpen}
          onClose={() => setIsRaiseOpen(false)}
          title="Relance"
        >
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsRaiseOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </BottomSheet>
      )}
    </>
  );
```

- [ ] **Step 3.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 10/10 tests passent.

- [ ] **Step 3.5 : Commit**

```bash
git add src/core/components/Game/BettingControls.tsx tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): BettingControls — bouton Raise ouvre BottomSheet (squelette)"
```

---

## Task 4 : Slider de mise + presets dans le BottomSheet

**Files:**
- Modify: `src/core/components/Game/BettingControls.tsx`
- Modify: `tests/ui/BettingControls.test.tsx`

- [ ] **Step 4.1 : Tests**

Append au `describe('BettingControls — Raise (mobile)')` :

```tsx
  it('shows raise amount input initialized to minAmount', async () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'raise', minAmount: 50, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    const input = screen.getByRole('spinbutton', { name: /montant/i }) as HTMLInputElement;
    expect(input.value).toBe('50');
  });

  it('shows preset buttons inside BottomSheet', async () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={100}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    expect(screen.getByRole('button', { name: /^min$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /½ pot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pot$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all-in/i })).toBeInTheDocument();
  });

  it('preset Pot sets amount to potSize', async () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={120}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    const input = screen.getByRole('spinbutton', { name: /montant/i }) as HTMLInputElement;
    expect(input.value).toBe('120');
  });

  it('preset clamps to maxAmount when > max', async () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={2000}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    const input = screen.getByRole('spinbutton', { name: /montant/i }) as HTMLInputElement;
    expect(input.value).toBe('1000');
  });
```

- [ ] **Step 4.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 4 nouveaux tests échouent.

- [ ] **Step 4.3 : Implémenter slider + presets**

Modifier `BettingControls.tsx`. Ajouter à l'intérieur du composant, après la déclaration `isRaiseOpen` :

```tsx
  const minRaise = raiseAction?.minAmount ?? 0;
  const maxRaise = raiseAction?.maxAmount ?? playerChips;
  const [raiseAmount, setRaiseAmount] = useState<number>(minRaise);

  // Re-init quand la fenêtre s'ouvre ou que les bornes changent
  React.useEffect(() => {
    if (isRaiseOpen) setRaiseAmount(minRaise);
  }, [isRaiseOpen, minRaise]);

  const clamp = (n: number) => Math.max(minRaise, Math.min(maxRaise, n));

  const presets = [
    { label: 'Min', value: minRaise },
    { label: '½ pot', value: clamp(Math.floor(potSize * 0.5)) },
    { label: '¾ pot', value: clamp(Math.floor(potSize * 0.75)) },
    { label: 'Pot', value: clamp(potSize) },
    { label: 'All-in', value: maxRaise },
  ];
```

(Note : ajouter `import React, { useState, useEffect } from 'react';` en haut si pas déjà.)

Remplacer le contenu du `<BottomSheet>` par :

```tsx
        <BottomSheet
          isOpen={isRaiseOpen}
          onClose={() => setIsRaiseOpen(false)}
          title="Relance"
        >
          <div className="flex flex-col gap-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setRaiseAmount(p.value)}
                  className="min-h-tap px-3 rounded-lg border border-border-default bg-bg-elevated text-text-primary hover:border-accent text-sm font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              step={Math.max(1, Math.floor(minRaise / 10) || 1)}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(clamp(parseInt(e.target.value, 10)))}
              aria-label="Slider de relance"
              className="w-full h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer"
            />

            {/* Min / Max labels */}
            <div className="flex justify-between text-xs text-text-muted">
              <span>Min: {minRaise.toLocaleString()}</span>
              <span>Max: {maxRaise.toLocaleString()}</span>
            </div>

            {/* Numeric input */}
            <label className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Montant</span>
              <input
                type="number"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={(e) =>
                  setRaiseAmount(clamp(parseInt(e.target.value, 10) || minRaise))
                }
                aria-label="Montant de la relance"
                className="flex-1 min-h-tap rounded-lg px-3 bg-bg-elevated text-text-primary border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsRaiseOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="success"
                size="md"
                onClick={() => {
                  onAction({ action: 'raise', amount: raiseAmount });
                  setIsRaiseOpen(false);
                }}
                disabled={disabled || raiseAmount < minRaise || raiseAmount > maxRaise}
                className="flex-1"
              >
                Relancer à {raiseAmount.toLocaleString()}
              </Button>
            </div>
          </div>
        </BottomSheet>
```

- [ ] **Step 4.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 14/14 tests passent.

- [ ] **Step 4.5 : Commit**

```bash
git add src/core/components/Game/BettingControls.tsx tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): BettingControls — slider + presets Min/½P/¾P/Pot/All-in dans le sheet"
```

---

## Task 5 : Confirmation Raise — émettre l'action et fermer

**Files:**
- Modify: `tests/ui/BettingControls.test.tsx` (juste un test additionnel)

(Note : la confirmation est déjà implémentée dans Task 4 via le bouton "Relancer à X". On ajoute un test explicite ici pour la verrouiller.)

- [ ] **Step 5.1 : Test**

Append au `describe('BettingControls — Raise (mobile)')` :

```tsx
  it('confirms raise: calls onAction with chosen amount and closes sheet', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        potSize={120}
        onAction={onAction}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    await userEvent.click(screen.getByRole('button', { name: /relancer à 120/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'raise', amount: 120 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
```

- [ ] **Step 5.2 : Vérifier le pass (le test devrait passer du premier coup)**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 15/15 tests passent.

- [ ] **Step 5.3 : Commit**

```bash
git add tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "test(table): BettingControls — verrouiller la confirmation Raise"
```

---

## Task 6 : Mode desktop inline (slider visible sans BottomSheet)

**Files:**
- Modify: `src/core/components/Game/BettingControls.tsx`
- Modify: `tests/ui/BettingControls.test.tsx`

- [ ] **Step 6.1 : Tests**

Append :

```tsx
describe('BettingControls — Desktop (inline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(true); // desktop
  });

  it('shows inline raise slider on desktop without opening sheet', () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={100}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    // Le bouton Raise existe bien
    expect(screen.getByRole('button', { name: /^raise$/i })).toBeInTheDocument();
    // Mais le slider et les presets sont visibles SANS clic
    expect(screen.getByRole('slider', { name: /relance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pot$/i })).toBeInTheDocument();
    // Pas de dialog
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirms raise inline on desktop', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        potSize={100}
        onAction={onAction}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    await userEvent.click(screen.getByRole('button', { name: /relancer à 100/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'raise', amount: 100 });
  });
});
```

- [ ] **Step 6.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 2 nouveaux tests échouent (mode desktop pas distingué).

- [ ] **Step 6.3 : Refactor pour basculer mobile/desktop**

Dans `BettingControls.tsx`, ajouter en haut :

```tsx
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';
```

Et dans le composant :

```tsx
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);
```

Extraire le contenu du sheet dans un sous-composant `RaisePanel` ou simplement dans une variable JSX :

```tsx
  const raisePanel = raiseAction ? (
    <div className="flex flex-col gap-4">
      {/* ... contenu identique à Task 4 ... */}
    </div>
  ) : null;
```

(Garder le contenu exact défini en Task 4 — uniquement le bloc `<div className="flex flex-col gap-4">...</div>`.)

Puis modifier le `return` :

```tsx
  return (
    <>
      <div className={cn('flex gap-2 p-2', className)}>
        {/* boutons d'action — identiques */}
      </div>

      {/* Desktop : panneau Raise inline */}
      {isDesktop && raiseAction && (
        <div className="mt-2 p-4 bg-bg-surface border border-border-default rounded-lg">
          {raisePanel}
        </div>
      )}

      {/* Mobile/Tablette : panneau Raise dans un BottomSheet */}
      {!isDesktop && raiseAction && (
        <BottomSheet
          isOpen={isRaiseOpen}
          onClose={() => setIsRaiseOpen(false)}
          title="Relance"
        >
          {raisePanel}
        </BottomSheet>
      )}
    </>
  );
```

Sur desktop, le bouton "Raise" du haut devient un raccourci pour focus le slider inline (optionnel). Pour Sprint 1A, on laisse le bouton Raise faire `setIsRaiseOpen(true)` même en desktop — ça ne fait rien de visible vu que le panel est déjà inline. C'est acceptable. Si tu veux nettoyer, masque le bouton Raise en desktop :

```tsx
      {raiseAction && !isDesktop && (
        <Button variant="success" ... onClick={() => setIsRaiseOpen(true)}>Raise</Button>
      )}
```

→ on choisit cette option (masquer le bouton Raise en desktop). Le slider inline est l'action.

- [ ] **Step 6.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 17/17 tests passent.

- [ ] **Step 6.5 : Commit**

```bash
git add src/core/components/Game/BettingControls.tsx tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): BettingControls — mode desktop inline (slider visible, pas de sheet)"
```

---

## Task 7 : Pot odds + hand strength badges

**Files:**
- Modify: `src/core/components/Game/BettingControls.tsx`
- Modify: `tests/ui/BettingControls.test.tsx`

- [ ] **Step 7.1 : Tests**

Append :

```tsx
describe('BettingControls — info badges', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('renders pot odds when provided', () => {
    render(<BettingControls {...baseProps} potOdds="2.5:1" />);
    expect(screen.getByText(/2\.5:1/)).toBeInTheDocument();
  });

  it('renders hand strength when provided', () => {
    render(<BettingControls {...baseProps} handStrength="Strong" />);
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('does not render badges when props are missing', () => {
    render(<BettingControls {...baseProps} />);
    expect(screen.queryByText(/odds/i)).toBeNull();
    expect(screen.queryByText(/hand/i)).toBeNull();
  });
});
```

- [ ] **Step 7.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 2 tests échouent (pot odds / hand strength pas affichés).

- [ ] **Step 7.3 : Implémenter les badges**

Dans `BettingControls.tsx`, juste avant `<div className={cn('flex gap-2 p-2', className)}>` (les boutons d'action), insérer :

```tsx
      {(potOdds || handStrength) && (
        <div className="flex flex-wrap gap-2 px-2 pb-1 text-xs">
          {potOdds && (
            <span className="px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted">
              Odds <span className="text-gold font-semibold">{potOdds}</span>
            </span>
          )}
          {handStrength && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full bg-bg-elevated font-semibold',
                handStrength === 'Strong' && 'text-sem-success',
                handStrength === 'Good' && 'text-accent',
                handStrength === 'Medium' && 'text-sem-warning',
                handStrength === 'Weak' && 'text-sem-danger',
              )}
            >
              Hand: {handStrength}
            </span>
          )}
        </div>
      )}
```

(Note : tu dois aussi déstructurer `potOdds` et `handStrength` dans la signature du composant si ce n'est pas encore fait — vérifie la déstructuration en haut.)

- [ ] **Step 7.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 20/20 tests passent.

- [ ] **Step 7.5 : Commit**

```bash
git add src/core/components/Game/BettingControls.tsx tests/ui/BettingControls.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): BettingControls — badges pot odds + hand strength"
```

---

## Task 8 : État disabled + intégration finale + audit

**Files:**
- Modify: `tests/ui/BettingControls.test.tsx`

- [ ] **Step 8.1 : Tests d'état disabled**

Append :

```tsx
describe('BettingControls — disabled', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('disables all action buttons when disabled is true', () => {
    render(
      <BettingControls
        {...baseProps}
        disabled
        availableActions={[
          { action: 'fold' },
          { action: 'call', amount: 40 },
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /fold/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /call/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^raise$/i })).toBeDisabled();
  });
});
```

- [ ] **Step 8.2 : Vérifier le pass**

Run: `npx vitest run tests/ui/BettingControls.test.tsx`
Expected: 21/21 tests passent. Le test devrait passer du premier coup car `disabled` est déjà câblé sur tous les Button.

- [ ] **Step 8.3 : Audit complet**

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui   # toute la suite UI : 35 (Sprint 0) + 21 (Sprint 1A) = 56 tests
npm run test -- --run     # full suite — pré-existants + nouveaux
npm run build
```

Tous doivent passer (sauf les 4 échecs pré-existants security-c1/prizeStructure).

- [ ] **Step 8.4 : Test manuel sur https://home-poker.vjdev.tech/**

(Tâche utilisateur après push) — vérifier dans une partie réelle :
- Tour mobile : la barre Fold/Call/Raise/All-in s'affiche en bas, tap sur Raise ouvre un BottomSheet, presets fonctionnent, slider fonctionne, "Relancer à X" envoie l'action.
- Tour desktop (1024+) : barre + slider inline + presets directement visibles, pas de sheet.
- Test différents états : pas son tour, isProcessing, table tournament/cash.

- [ ] **Step 8.5 : Commit final + CHANGELOG**

Mettre à jour `CHANGELOG.md` en ajoutant en haut :

```markdown
## [Unreleased] — Sprint 1A zone d'action mobile-first

### Modifié
- `BettingControls` réécrit selon le spec mobile-first : barre fixe Fold / Call / Raise / All-in (44px tap min) ; bouton Raise ouvre un `BottomSheet` avec slider, presets (Min / ½ pot / ¾ pot / Pot / All-in) et confirmation. Sur desktop ≥ 1024px : layout inline avec slider visible (pas de sheet). Badges pot odds + hand strength au-dessus des actions. API props inchangée (zéro changement dans `PokerTable.tsx`).

### Ajouté
- Suite de tests `tests/ui/BettingControls.test.tsx` (21 tests, render / actions / Raise sheet / desktop inline / badges / disabled).
```

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 1A zone d'action mobile-first"
```

---

## Critères de "Done" du Sprint 1A

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui` (56 tests), `npm run build` — tous OK.
- [ ] Suite full `npm run test -- --run` — pas de nouvelle régression (les 4 échecs pré-existants restent).
- [ ] L'app se lance, on peut jouer une partie complète, le BottomSheet Raise fonctionne sur mobile, le slider inline fonctionne sur desktop.
- [ ] `PokerTable.tsx` n'a pas été modifié (`git diff master..feat/sprint-1-table -- src/core/components/Game/PokerTable.tsx` est vide).
- [ ] Toutes les autres parties de la table (sièges, cartes communes, animations, drawers, timers) fonctionnent comme avant.

## Risques & mitigations

- **API contract preservation** : la signature de `BettingControls` doit rester identique (props + comportement de `onAction`). Si un consommateur (PokerTable) casse, c'est un bug du rewrite. Le typecheck l'attrapera. Vérifier en plus visuellement.
- **`useEffect` re-init du raiseAmount** : quand l'utilisateur change de slider puis change `availableActions` côté backend (ex: nouveau tour), on re-clamp à `minRaise`. Acceptable. Si le user trouve ça gênant, on adaptera Sprint 1C.
- **Slider HTML range natif** : style minimal au Sprint 1A. Les thumb personnalisés (gros, pouce-friendly) viendront Sprint 6 polish.
- **Le bouton Raise visible uniquement en mobile** : sur desktop le slider est déjà inline, donc le bouton serait redondant. Si l'utilisateur trouve ça désorientant, on peut le garder en desktop comme accent visuel ; à itérer.

---

## Self-review

- **Couverture spec** : barre fixe action ✅ (Tasks 1-2), Raise → BottomSheet ✅ (Task 3), slider + presets ✅ (Task 4), confirmation ✅ (Task 5), desktop inline ✅ (Task 6), badges info ✅ (Task 7), disabled ✅ (Task 8).
- **Pas de placeholder** : code complet à chaque step.
- **Cohérence types** : `GameAction` exporté, props identiques à l'API actuelle.
- **Ordre des tasks** : Task 1 (squelette) → 2 (Call/All-in) → 3 (bouton Raise + sheet vide) → 4 (contenu sheet : slider/presets) → 5 (confirmation, déjà implicite mais verrouillée par test) → 6 (basculer mobile/desktop) → 7 (badges) → 8 (disabled + audit). Pas de dépendance brisée.
- **Hors scope préservé** : PokerTable, autres composants Game, hook legacy useBreakpoint.
