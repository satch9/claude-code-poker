# Sprint 6 — Polish, a11y, perf — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Finitions de la refonte mobile-first : ajouter une primitive `Toast` avec son provider et remplacer les `alert()` les plus visibles, re-lazifier `CreateTableForm` (perte de bénéfice en Sprint 2B), mémoïser `PlayerSeat` (composant lourd rendu jusqu'à 9× sur la table), durcir le focus de `BottomSheet` (Escape/click-outside déjà OK ; on ajoute `aria-labelledby` cohérent et focus initial), audit final.

**Architecture:** On crée une primitive `Toast` minimaliste avec un provider monté dans `main.tsx` (au-dessus de l'`AppShell`). Un hook `useToast()` expose `toast.success()` / `toast.error()` / `toast.info()`. Les `alert()` placeholder (Sprint 5 a déjà retiré ceux des onglets) sont remplacés là où ça compte (`AppMain.handleTableCreated` catch, `PokerTable` "Table is full"). `PlayerSeat` est wrappé dans `React.memo` avec une comparaison ciblée. `CreateTableForm` redevient `lazy` derrière `<Suspense>` à l'intérieur du `BottomSheet`.

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0 + Vitest 4.

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `src/shared/ui/Toast.tsx` | Primitive Toast + ToastProvider + useToast hook |
| `tests/ui/Toast.test.tsx` | Tests TDD : show/hide, types, dismiss, queue |

### Files to modify

| Path | Reason |
|---|---|
| `src/shared/ui/index.ts` | Exporter Toast/ToastProvider/useToast |
| `src/main.tsx` | Monter `<ToastProvider>` au-dessus de `<App>` |
| `src/core/components/App/AppMain.tsx` | Lazy-load CreateTableForm + Suspense ; remplacer 1-2 `alert()` par toast |
| `src/core/components/Game/PlayerSeat.tsx` | `React.memo` + compare ciblé |

### Files NOT touched

- Backend Convex.
- Composants déjà refondus en Sprints 0-5.

---

## Task 1 : Primitive `Toast` (TDD)

**Files:**
- Create: `src/shared/ui/Toast.tsx`
- Create: `tests/ui/Toast.test.tsx`
- Modify: `src/shared/ui/index.ts`

### Step 1.1 — Test FIRST

`tests/ui/Toast.test.tsx` :

```tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../../src/shared/ui/Toast';

const Trigger: React.FC<{ kind: 'success' | 'error' | 'info'; msg: string }> = ({ kind, msg }) => {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast[kind](msg)}>
      fire
    </button>
  );
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('throws when used outside ToastProvider', () => {
    const Boom = () => {
      useToast();
      return null;
    };
    // Suppress the React error boundary noise on this expected throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow();
    spy.mockRestore();
  });

  it('shows success toast when toast.success is called', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger kind="success" msg="ok done" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('ok done')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error toast with role=alert', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger kind="error" msg="boom" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('auto-dismisses after the default duration', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger kind="info" msg="bye" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('bye')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('bye')).toBeNull();
  });

  it('can be dismissed manually via close button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger kind="info" msg="dismiss me" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('dismiss me')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(screen.queryByText('dismiss me')).toBeNull();
  });

  it('queues multiple toasts simultaneously', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const Multi = () => {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast.info('first');
            toast.info('second');
          }}
        >
          two
        </button>
      );
    };
    render(
      <ToastProvider>
        <Multi />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'two' }));
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });
});
```

### Step 1.2 — Run, expect FAIL

`npx vitest run tests/ui/Toast.test.tsx`

### Step 1.3 — Implement `src/shared/ui/Toast.tsx`

```tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '../utils/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const DEFAULT_DURATION = 5000;

const ToastItem: React.FC<{ entry: ToastEntry; onClose: () => void }> = ({ entry, onClose }) => {
  useEffect(() => {
    const id = setTimeout(onClose, DEFAULT_DURATION);
    return () => clearTimeout(id);
  }, [onClose]);

  const role = entry.kind === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={entry.kind === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto rounded-lg shadow-lg border px-3 py-2 flex items-start gap-2 text-sm',
        entry.kind === 'success' && 'bg-sem-success/15 border-sem-success/40 text-sem-success',
        entry.kind === 'error' && 'bg-sem-danger/15 border-sem-danger/40 text-sem-danger',
        entry.kind === 'info' && 'bg-bg-elevated border-border-default text-text-primary',
      )}
    >
      <span className="flex-1 break-words">{entry.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="text-text-muted hover:text-text-primary text-base leading-none px-1"
      >
        ✕
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), kind, message }]);
  }, []);

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
```

### Step 1.4 — Update barrel `src/shared/ui/index.ts`

Add at the end of the file :
```ts
export { ToastProvider, useToast } from './Toast';
```

### Step 1.5 — Run, expect PASS (6 tests)

`npx vitest run tests/ui/Toast.test.tsx`

### Step 1.6 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # 105 + 6 = 111
```

### Step 1.7 — Commit

```bash
git add src/shared/ui/Toast.tsx src/shared/ui/index.ts tests/ui/Toast.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): primitive Toast + ToastProvider + useToast (TDD)"
```

---

## Task 2 : Monter `<ToastProvider>` dans `main.tsx`

**Files:**
- Modify: `src/main.tsx`

### Step 2.1 — Read

Read `src/main.tsx`. Identifier où `<App />` est monté (typiquement à l'intérieur de `<ConvexAuthProvider>`).

### Step 2.2 — Wrap `<App />` avec `<ToastProvider>`

Ajouter l'import :
```tsx
import { ToastProvider } from "./shared/ui";
```

Et dans le tree, wrap `<App />` :
```tsx
<ConvexAuthProvider client={convex}>
  <ToastProvider>
    <App />
  </ToastProvider>
</ConvexAuthProvider>
```

### Step 2.3 — Verify + Commit

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
git add src/main.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): monter ToastProvider dans main.tsx"
```

---

## Task 3 : Re-lazify `CreateTableForm` + Suspense dans la sheet

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

### Step 3.1 — Read AppMain et localiser

Repérer :
- L'import statique `import { CreateTableForm } from "../Table/CreateTableForm";`
- Le mount dans le BottomSheet `<CreateTableForm onSubmit={...} ... />`
- Les autres lazy imports (PokerTable, StatsPage) — pour le pattern.

### Step 3.2 — Convertir en lazy

Remplacer l'import statique par :

```tsx
const CreateTableForm = lazy(() =>
  import("../Table/CreateTableForm").then((m) => ({ default: m.CreateTableForm }))
);
```

(`lazy` est déjà importé via `import React, { lazy, Suspense, ... } from "react"` ou similaire — vérifier en haut du fichier.)

Wrapper le mount dans la BottomSheet avec `<Suspense>` :

```tsx
<BottomSheet
  isOpen={showCreateSheet}
  onClose={() => setShowCreateSheet(false)}
  title={currentView === "tournois" ? "Créer un nouveau tournoi" : "Créer une nouvelle table"}
>
  <Suspense fallback={<div className="p-4 text-center text-text-muted">Chargement...</div>}>
    <CreateTableForm
      onSubmit={handleTableCreated}
      onCancel={handleCancelCreateTable}
      defaultGameType={currentView === "tournois" ? "tournament" : "cash"}
    />
  </Suspense>
</BottomSheet>
```

(Garder `import type { CreateTableData } from "../Table/CreateTableForm";` pour le type qui ne nécessite pas de runtime.)

### Step 3.3 — Verify

```bash
npm run typecheck
npm run build      # Doit re-générer un chunk CreateTableForm-*.js séparé
npx vitest run tests/ui
```

### Step 3.4 — Commit

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "perf(lobby): re-lazify CreateTableForm avec Suspense (chunk séparé)"
```

---

## Task 4 : Mémoïser `PlayerSeat`

**Files:**
- Modify: `src/core/components/Game/PlayerSeat.tsx`

### Step 4.1 — Lire la signature

Lire le fichier `PlayerSeat.tsx` pour identifier l'export du composant et ses props (déjà connues du Sprint 1B : `player`, `position`, `seatAngle`, `isDealer`, `isCurrentPlayer`, `isActivePlayer`, `isSmallBlind`, `isBigBlind`, etc.).

Le composant est exporté nommément `PlayerSeatComponent` (de mémoire) ou `PlayerSeat`. Vérifier.

### Step 4.2 — Wrapper avec `React.memo`

À la fin du fichier, après la déclaration du composant, exporter une version mémoïsée :

Si actuellement on a :
```tsx
export const PlayerSeat: React.FC<PlayerSeatProps> = ({ ... }) => { ... };
```

Modifier pour :
```tsx
const PlayerSeatComponent: React.FC<PlayerSeatProps> = ({ ... }) => { ... };

export const PlayerSeat = React.memo(PlayerSeatComponent, (prev, next) => {
  // Re-render uniquement si une prop "visible" change.
  return (
    prev.isEmpty === next.isEmpty &&
    prev.isDealer === next.isDealer &&
    prev.isCurrentPlayer === next.isCurrentPlayer &&
    prev.isActivePlayer === next.isActivePlayer &&
    prev.isSmallBlind === next.isSmallBlind &&
    prev.isBigBlind === next.isBigBlind &&
    prev.showCards === next.showCards &&
    prev.seatAngle === next.seatAngle &&
    prev.timeLimit === next.timeLimit &&
    prev.smallBlindAmount === next.smallBlindAmount &&
    prev.bigBlindAmount === next.bigBlindAmount &&
    prev.className === next.className &&
    // Player object: comparer les champs visibles
    (prev.player?.userId === next.player?.userId) &&
    (prev.player?.chips === next.player?.chips) &&
    (prev.player?.isFolded === next.player?.isFolded) &&
    (prev.player?.isAllIn === next.player?.isAllIn) &&
    (prev.player?.currentBet === next.player?.currentBet) &&
    (prev.player?.lastAction === next.player?.lastAction) &&
    JSON.stringify(prev.player?.cards ?? []) === JSON.stringify(next.player?.cards ?? []) &&
    (prev.player?.user?.name === next.player?.user?.name) &&
    // Callbacks : on suppose qu'ils sont stables (useCallback côté parent),
    // si pas le cas, ils provoqueront un re-render — acceptable pour ce sprint.
    prev.onSeatClick === next.onSeatClick &&
    prev.onTimeOut === next.onTimeOut
  );
});
```

Si `PlayerSeatComponent` est déjà déclaré (vérifier le code) — dans ce cas il suffit d'export `React.memo(PlayerSeatComponent, comparator)`.

Note : `React` doit être importé. Le fichier l'a déjà avec `import React, { ... } from "react"`.

### Step 4.3 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui
```

### Step 4.4 — Commit

```bash
git add src/core/components/Game/PlayerSeat.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "perf(table): React.memo sur PlayerSeat avec comparateur ciblé"
```

---

## Task 5 : Audit + CHANGELOG + clôture

**Files:**
- Modify: `CHANGELOG.md`

### Step 5.1 — Audits

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

### Step 5.2 — Update `CHANGELOG.md`

Ajouter en haut :

```markdown
## [Unreleased] — Sprint 6 Polish, a11y, perf

### Ajouté
- `Toast` primitive (`src/shared/ui/Toast.tsx`) avec `ToastProvider` + hook `useToast` (méthodes `success`/`error`/`info`). Auto-dismiss 5s, fermeture manuelle, `role="status"` ou `role="alert"` selon le type. Monté à la racine de l'app dans `main.tsx`.
- 6 tests UI (`Toast`).

### Modifié
- `AppMain` : `CreateTableForm` re-lazifié avec `<Suspense>` à l'intérieur du BottomSheet (chunk séparé restauré, 6.9 kB sortis du bundle initial).
- `PlayerSeat` : wrappé dans `React.memo` avec comparateur ciblé sur les props "visibles" (avatar / chips / folded / allIn / currentBet / cards / blinds / dealer / timer). Réduit le coût de re-render quand un seul siège change pendant une partie 9-max.

### Notes
- Hors scope : focus trap complet sur BottomSheet/Drawer, suppression de tous les `console.log`/`alert()` legacy, audit Lighthouse formel, captures de référence automatisées.
```

### Step 5.3 — Commit

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 6 polish/a11y/perf"
```

---

## Critères de "Done"

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui` (≥ 111), `npm run build` — tous OK.
- [ ] `Toast` primitive + provider opérationnel.
- [ ] `CreateTableForm` lazy avec un chunk séparé visible dans le build.
- [ ] `PlayerSeat` mémoïsé.
- [ ] CHANGELOG mis à jour.

## Hors scope (laissé pour itérations futures)

- Focus trap complet (Tab/Shift-Tab cycle) sur BottomSheet et Drawer.
- Audit Lighthouse formel et passes WCAG AA exhaustives.
- Suppression systématique des `console.log` dans `PokerTable.tsx` et autres fichiers legacy.
- Captures de référence automatisées via Playwright.
- Sons UI (optionnels via préférence Profil).
