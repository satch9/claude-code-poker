# Sprint 2A — Lobby cards + segmented control + AppShell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `TableCard`, `MyTablesSection`, `TableList`, `JoinByCodeForm` et `Lobby` pour passer du theme légèr (gradient `poker-green-50/100`, `bg-white`) aux tokens dark Sprint 0. Retirer le header custom du Lobby (déjà fourni par AppShell). Remplacer la double section "Mes tables / Tables publiques" par un `SegmentedControl` (`Cash` / `Tournois` / `Mes tables`). Cohérence visuelle avec la table de jeu et l'UI globale.

**Architecture:** `Lobby.tsx` se simplifie : plus de header custom, le bouton "Créer" passe par `headerAction` de `AppShell` (à wirer dans `AppMain.tsx`). Les cards et le formulaire "join by code" adoptent les tokens Sprint 0 et les primitives `Card`, `Button`, `Input`. Le `BottomSheet` "Créer une table" reste pour Sprint 2B (le bouton "+" route encore vers la vue `create-table` actuelle).

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0 + Vitest 4.

---

## File Structure

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Lobby/TableCard.tsx` | Rewrite: dark tokens, mobile-first, badges discrets |
| `src/core/components/Lobby/MyTablesSection.tsx` | Dark tokens, simplification (titre + grid) |
| `src/core/components/Lobby/TableList.tsx` | Rewrite: SegmentedControl (Cash/Tournois), dark tokens, retrait des quick-stats redondantes, états vides cohérents |
| `src/core/components/Lobby/JoinByCodeForm.tsx` | Dark tokens, primitive `Input` Sprint 0 |
| `src/core/components/Lobby/Lobby.tsx` | Retirer le header custom (AppShell s'en charge), passer `onCreateTable` au parent |
| `src/core/components/App/AppMain.tsx` | Passer `headerAction={{ label: 'Créer', onClick: handleCreateTable }}` à `AppShell` quand `currentView === 'lobby'` |

### Files to create

| Path | Purpose |
|---|---|
| `tests/ui/TableCard.test.tsx` | Tests TDD : render, status, onJoin, types cash/tournoi |
| `tests/ui/JoinByCodeForm.test.tsx` | Tests TDD : input sanitize, submit, error state |

### Files NOT touched

- `CreateTableForm.tsx` — refondu Sprint 2B en BottomSheet.
- `UserProfile.tsx` — reste tel quel (utilisé dans le profil future Sprint 5).
- `convex/*` — backend inchangé.
- Composants Game et Stats.

---

## Task 1 : Refondre `TableCard` (rewrite TDD)

**Files:**
- Modify (rewrite): `src/core/components/Lobby/TableCard.tsx`
- Create: `tests/ui/TableCard.test.tsx`

**API préservée** :

```ts
interface TableCardProps {
  table: Table;
  onJoin: (tableId: Id<"tables">) => void;
  className?: string;
}
```

**Comportement** :
- Card adopte `bg-bg-surface` + `border-border-default` (au lieu de `bg-white`).
- Texte primaire : `text-text-primary`. Muted : `text-text-muted`.
- Badge `Cash` (accent bleu) ou `Tournoi` (purple) plus discret.
- Badge `Privée` (warning) si `table.isPrivate`.
- Badge `Freeroll` (success) si tournoi avec `buyIn === 0`.
- Badge `Terminé` (muted) si tournoi terminé.
- Action principale : `Button` Sprint 0 (`primary` si rejoignable, `secondary` si pleine).
- Format chips : compact `K` si ≥ 1000.
- Plus de `truncate max-w-[200px]/[80px]/[100px]` arbitraires — on laisse `truncate` global sur les zones flex.

### Step 1.1 — Test FIRST

`tests/ui/TableCard.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableCard } from '../../src/core/components/Lobby/TableCard';

beforeEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }));
});

const baseTable = {
  _id: 'tbl1',
  name: 'Cash #12',
  gameType: 'cash' as const,
  maxPlayers: 6,
  playerCount: 4,
  isPrivate: false,
  smallBlind: 5,
  bigBlind: 10,
  startingStack: 1000,
  status: 'active' as const,
  isUserSeated: false,
  createdAt: Date.now(),
};

describe('TableCard', () => {
  it('renders table name and basic info', () => {
    render(<TableCard table={baseTable as never} onJoin={() => {}} />);
    expect(screen.getByText('Cash #12')).toBeInTheDocument();
    expect(screen.getByText(/4\/6/)).toBeInTheDocument();
    expect(screen.getByText(/cash game/i)).toBeInTheDocument();
  });

  it('shows "Tournoi" label for tournament tables', () => {
    render(
      <TableCard
        table={{ ...baseTable, gameType: 'tournament', buyIn: 50 } as never}
        onJoin={() => {}}
      />,
    );
    expect(screen.getByText(/tournoi/i)).toBeInTheDocument();
  });

  it('shows "Privée" badge when isPrivate', () => {
    render(<TableCard table={{ ...baseTable, isPrivate: true } as never} onJoin={() => {}} />);
    expect(screen.getByText(/privée/i)).toBeInTheDocument();
  });

  it('shows "Freeroll" badge for tournament with buyIn=0', () => {
    render(
      <TableCard
        table={{ ...baseTable, gameType: 'tournament', buyIn: 0 } as never}
        onJoin={() => {}}
      />,
    );
    expect(screen.getByText(/freeroll/i)).toBeInTheDocument();
  });

  it('button is "Rejoindre" when joinable, "Continuer" when seated', () => {
    const { rerender } = render(<TableCard table={baseTable as never} onJoin={() => {}} />);
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
    rerender(<TableCard table={{ ...baseTable, isUserSeated: true } as never} onJoin={() => {}} />);
    expect(screen.getByRole('button', { name: /continuer/i })).toBeInTheDocument();
  });

  it('button shows "Table pleine" and is disabled when full and not seated', () => {
    render(
      <TableCard
        table={{ ...baseTable, playerCount: 6 } as never}
        onJoin={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /pleine/i })).toBeDisabled();
  });

  it('triggers onJoin with table id', async () => {
    const onJoin = vi.fn();
    render(<TableCard table={baseTable as never} onJoin={onJoin} />);
    await userEvent.click(screen.getByRole('button', { name: /rejoindre/i }));
    expect(onJoin).toHaveBeenCalledWith('tbl1');
  });
});
```

### Step 1.2 — Run, expect FAIL

`npx vitest run tests/ui/TableCard.test.tsx`

### Step 1.3 — Rewrite `src/core/components/Lobby/TableCard.tsx`

```tsx
import React from "react";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/utils/cn";
import type { Table } from "../../../shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

interface TableCardProps {
  table: Table;
  onJoin: (tableId: Id<"tables">) => void;
  className?: string;
}

const formatChips = (n?: number) =>
  n === undefined
    ? "—"
    : n >= 1000
      ? `${Math.floor(n / 1000)}K`
      : n.toLocaleString();

const Badge: React.FC<{
  variant: "info" | "warning" | "success" | "purple" | "muted";
  children: React.ReactNode;
}> = ({ variant, children }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variant === "info" && "bg-accent/20 text-accent",
      variant === "warning" && "bg-sem-warning/20 text-sem-warning",
      variant === "success" && "bg-sem-success/20 text-sem-success",
      variant === "purple" && "bg-purple-500/20 text-purple-300",
      variant === "muted" && "bg-bg-elevated text-text-muted",
    )}
  >
    {children}
  </span>
);

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onJoin,
  className,
}) => {
  const playerCount = table.playerCount ?? 0;
  const isTableFull = playerCount >= table.maxPlayers;
  const isTournament = table.gameType === "tournament";

  const tournamentFinished =
    isTournament &&
    (((table as any).modules?.tournament?.status === "finished") ||
      table.status === "finished");

  const canJoin = tournamentFinished
    ? true
    : !isTableFull || table.isUserSeated;

  const buttonLabel = tournamentFinished
    ? "Voir le classement"
    : table.isUserSeated
      ? "Continuer"
      : isTableFull
        ? "Table pleine"
        : "Rejoindre";

  const buttonVariant: "primary" | "secondary" =
    tournamentFinished ? "secondary" : canJoin ? "primary" : "secondary";

  return (
    <article
      className={cn(
        "bg-bg-surface border border-border-default rounded-lg p-4 hover:border-accent/50 transition-colors",
        className,
      )}
    >
      <header className="flex justify-between items-start gap-3 mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-text-primary truncate">
            {table.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={isTournament ? "purple" : "info"}>
              {isTournament ? "Tournoi" : "Cash Game"}
            </Badge>
            {table.isPrivate && <Badge variant="warning">Privée</Badge>}
            {isTournament && table.buyIn === 0 && (
              <Badge variant="success">Freeroll</Badge>
            )}
            {tournamentFinished && <Badge variant="muted">Terminé</Badge>}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs text-text-muted">Joueurs</div>
          <div className="text-lg font-bold text-text-primary">
            {playerCount}/{table.maxPlayers}
          </div>
        </div>
      </header>

      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">Blinds</dt>
          <dd className="font-medium text-text-primary">
            {table.smallBlind}/{table.bigBlind}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">Stack</dt>
          <dd className="font-medium text-text-primary">
            {formatChips(table.startingStack)}
          </dd>
        </div>
        {isTournament && (
          <div className="flex justify-between">
            <dt className="text-text-muted">Buy-in</dt>
            <dd className="font-medium text-text-primary">
              {table.buyIn === 0 ? "Freeroll" : `${formatChips(table.buyIn)} €`}
            </dd>
          </div>
        )}
      </dl>

      <footer className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">
          {new Date(table.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant={buttonVariant}
          size="sm"
          disabled={!canJoin}
          onClick={() => onJoin(table._id as Id<"tables">)}
        >
          {buttonLabel}
        </Button>
      </footer>
    </article>
  );
};
```

### Step 1.4 — Run, expect PASS (7 tests)

### Step 1.5 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # 87 + 7 = 94
```

### Step 1.6 — Commit

```bash
git add src/core/components/Lobby/TableCard.tsx tests/ui/TableCard.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(lobby): TableCard refondu mobile-first dark (TDD, badges sémantiques)"
```

---

## Task 2 : Refondre `JoinByCodeForm` (TDD)

**Files:**
- Modify (rewrite): `src/core/components/Lobby/JoinByCodeForm.tsx`
- Create: `tests/ui/JoinByCodeForm.test.tsx`

### Step 2.1 — Test FIRST

`tests/ui/JoinByCodeForm.test.tsx` :

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Convex avant import du composant
const mockUseQuery = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { JoinByCodeForm } from '../../src/core/components/Lobby/JoinByCodeForm';

beforeEach(() => {
  vi.restoreAllMocks();
  mockUseQuery.mockReturnValue(undefined);
});

describe('JoinByCodeForm', () => {
  it('renders the input and submit button', () => {
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    expect(screen.getByLabelText(/code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
  });

  it('disables submit until 6 alphanum characters are entered', async () => {
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    const button = screen.getByRole('button', { name: /rejoindre/i });
    expect(button).toBeDisabled();
    const input = screen.getByLabelText(/code/i);
    await userEvent.type(input, 'abc12');
    expect(button).toBeDisabled();
    await userEvent.type(input, '3');
    expect(button).not.toBeDisabled();
  });

  it('uppercases and strips non-alphanum characters from input', async () => {
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    const input = screen.getByLabelText(/code/i) as HTMLInputElement;
    await userEvent.type(input, 'ab-12-cd');
    expect(input.value).toBe('AB12CD');
  });

  it('shows "code invalide" when query returns null', async () => {
    mockUseQuery.mockReturnValue(null);
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    const input = screen.getByLabelText(/code/i);
    await userEvent.type(input, 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: /rejoindre/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalide|introuvable/i)).toBeInTheDocument();
    });
  });
});
```

### Step 2.2 — Run, expect FAIL

`npx vitest run tests/ui/JoinByCodeForm.test.tsx`

### Step 2.3 — Rewrite `src/core/components/Lobby/JoinByCodeForm.tsx`

```tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Card } from "../../../shared/ui/Card";
import { Id } from "../../../../convex/_generated/dataModel";

interface JoinByCodeFormProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

export const JoinByCodeForm: React.FC<JoinByCodeFormProps> = ({ onJoinTable }) => {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const ready = sanitized.length === 6;

  const table = useQuery(
    api.tables.getTableByInviteCode,
    ready && submitted ? { code: sanitized } : "skip",
  );

  useEffect(() => {
    if (submitted && table && table._id) {
      onJoinTable(table._id);
      setSubmitted(false);
      setCode("");
    }
  }, [submitted, table, onJoinTable]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) setSubmitted(true);
  };

  const showNotFound = submitted && table === null;

  return (
    <Card className="!p-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">
          Rejoindre par code
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 min-w-0">
            <Input
              label="Code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC123"
              value={sanitized}
              maxLength={6}
              onChange={(e) => {
                setCode(e.target.value);
                setSubmitted(false);
              }}
              error={showNotFound ? "Code invalide ou table introuvable." : undefined}
              className="uppercase tracking-widest font-mono text-lg"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!ready}
            className="w-full sm:w-auto"
          >
            Rejoindre
          </Button>
        </div>
      </form>
    </Card>
  );
};
```

### Step 2.4 — Run, expect PASS (4 tests)

### Step 2.5 — Commit

```bash
git add src/core/components/Lobby/JoinByCodeForm.tsx tests/ui/JoinByCodeForm.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(lobby): JoinByCodeForm refondu (Sprint 0 Input + Card, dark)"
```

---

## Task 3 : Refondre `MyTablesSection`

**Files:**
- Modify: `src/core/components/Lobby/MyTablesSection.tsx`

Transformation simple : passage en dark, grille mobile-first (1 col xs, 2 cols md, 3 cols lg), titre cohérent.

### Step 3.1 — Modifier directement (refactor sans test dédié, le couvert via TableCard)

Remplacer le contenu COMPLET du fichier par :

```tsx
import React from "react";
import { TableCard } from "./TableCard";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";

interface MyTablesSectionProps {
  tables: Table[];
  onJoinTable: (tableId: Id<"tables">) => void;
}

/**
 * Section dédiée aux tables où l'utilisateur courant est créateur ou
 * joueur assis. Visible uniquement quand non-vide. Inclut les tables
 * privées (contrairement à la section publique).
 */
export const MyTablesSection: React.FC<MyTablesSectionProps> = ({
  tables,
  onJoinTable,
}) => {
  if (tables.length === 0) return null;

  return (
    <section className="bg-bg-elevated border border-accent/30 rounded-xl p-3 md:p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Mes tables
        </h2>
        <span className="text-xs md:text-sm text-text-muted">
          {tables.length} {tables.length > 1 ? "tables" : "table"}
        </span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((table) => (
          <TableCard key={table._id} table={table} onJoin={onJoinTable} />
        ))}
      </div>
    </section>
  );
};
```

### Step 3.2 — Verify build

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
```

### Step 3.3 — Commit

```bash
git add src/core/components/Lobby/MyTablesSection.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(lobby): MyTablesSection dark + grid mobile-first"
```

---

## Task 4 : Refondre `TableList` (SegmentedControl)

**Files:**
- Modify (rewrite): `src/core/components/Lobby/TableList.tsx`

Transformation : titre + filtre `Cash`/`Tournois` avec un SegmentedControl visuel propre, dark tokens, états vides cohérents, suppression du quick-stats redondant en bas (déjà visible dans la liste).

### Step 4.1 — Rewrite `src/core/components/Lobby/TableList.tsx`

```tsx
import React, { useState } from "react";
import { TableCard } from "./TableCard";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "../../../shared/utils/cn";

type Filter = "all" | "cash" | "tournament";

interface TableListProps {
  tables: Table[];
  onJoinTable: (tableId: Id<"tables">) => void;
  loading?: boolean;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "cash", label: "Cash" },
  { id: "tournament", label: "Tournois" },
];

const SkeletonCard: React.FC = () => (
  <div className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
    <div className="h-4 bg-bg-elevated rounded w-1/2 mb-2" />
    <div className="h-3 bg-bg-elevated rounded w-1/3 mb-4" />
    <div className="h-3 bg-bg-elevated rounded w-2/3 mb-2" />
    <div className="h-3 bg-bg-elevated rounded w-1/2 mb-4" />
    <div className="flex justify-between items-center">
      <div className="h-3 bg-bg-elevated rounded w-1/4" />
      <div className="h-8 bg-bg-elevated rounded w-20" />
    </div>
  </div>
);

export const TableList: React.FC<TableListProps> = ({
  tables,
  onJoinTable,
  loading = false,
}) => {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = tables.filter((t) => filter === "all" || t.gameType === filter);

  return (
    <section className="space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Tables disponibles
        </h2>
        <div
          role="tablist"
          aria-label="Filtre par type de partie"
          className="inline-flex rounded-lg bg-bg-elevated p-1 border border-border-default"
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "min-h-tap px-3 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <TableCard key={t._id} table={t} onJoin={onJoinTable} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 bg-bg-surface border border-border-default rounded-lg">
          <div className="text-3xl mb-2" aria-hidden>
            🃏
          </div>
          <p className="text-text-primary font-medium">Aucune table disponible</p>
          <p className="mt-1 text-sm text-text-muted">
            {filter !== "all"
              ? `Aucune table ${filter === "cash" ? "cash" : "tournoi"} pour le moment.`
              : "Sois le premier à en créer une !"}
          </p>
        </div>
      )}
    </section>
  );
};
```

### Step 4.2 — Verify

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
```

### Step 4.3 — Commit

```bash
git add src/core/components/Lobby/TableList.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(lobby): TableList — SegmentedControl Cash/Tournois + dark + skeleton"
```

---

## Task 5 : Refondre `Lobby.tsx` + wirer `headerAction` dans `AppMain`

**Files:**
- Modify: `src/core/components/Lobby/Lobby.tsx`
- Modify: `src/core/components/App/AppMain.tsx`

### Step 5.1 — Refondre `Lobby.tsx`

Retirer le header custom (gradient + bouton créer + stats + profile). Le bouton "Créer" est désormais dans le header AppShell. Stats et Profile sont déjà accessibles via le bottom tab bar / sidebar AppShell.

Remplacer le contenu COMPLET de `Lobby.tsx` par :

```tsx
import React from "react";
import { TableList } from "./TableList";
import { MyTablesSection } from "./MyTablesSection";
import { JoinByCodeForm } from "./JoinByCodeForm";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface LobbyProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinTable }) => {
  const { user } = useAuth();
  const data = useQuery(
    api.tables.getTablesWithUserInfo,
    user ? { userId: user._id } : "skip",
  );
  const loading = data === undefined;
  const myTables = data?.myTables ?? [];
  const publicTables = data?.publicTables ?? [];

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-5xl px-3 md:px-4 py-4 md:py-6 space-y-4">
      <JoinByCodeForm onJoinTable={onJoinTable} />
      {!loading && myTables.length > 0 && (
        <MyTablesSection tables={myTables} onJoinTable={onJoinTable} />
      )}
      <TableList
        tables={publicTables}
        onJoinTable={onJoinTable}
        loading={loading}
      />
    </div>
  );
};
```

(Note : `title`, `onCreateTable` et `onViewStats` props supprimés — gérés par AppShell.)

### Step 5.2 — Modifier `AppMain.tsx`

Lieu : la fonction `renderView()` dans `AppContent` qui retourne `<Lobby title={title} onJoinTable={...} onCreateTable={...} onViewStats={...} />`.

Retirer les props devenues inutiles :

```tsx
// dans renderView() case "lobby":
return <Lobby onJoinTable={handleJoinTable} />;
```

Wirer `headerAction` dans le `return` final qui monte `<AppShell ...>`. Avant la `return (` du composant, calculer :

```tsx
const headerAction = (() => {
  if (currentView === "lobby") {
    return {
      label: "Créer",
      onClick: handleCreateTable,
      icon: <span aria-hidden>+</span>,
    };
  }
  return undefined;
})();
```

Puis dans le JSX :

```tsx
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
```

### Step 5.3 — Verify

```bash
npm run typecheck && npm run build && npx vitest run tests/ui && npm run test -- --run
```

### Step 5.4 — Commit

```bash
git add src/core/components/Lobby/Lobby.tsx src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(lobby): retirer header custom + wirer headerAction AppShell (Créer)"
```

---

## Task 6 : Audit + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 6.1 — Audits finaux

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

Tous OK (sauf 4 échecs pré-existants).

### Step 6.2 — Update `CHANGELOG.md`

Ajouter en haut :

```markdown
## [Unreleased] — Sprint 2A Lobby cards + segmented control

### Modifié
- `TableCard` réécrit selon le spec mobile-first (TDD) : tokens Sprint 0 dark (`bg-bg-surface`, `border-border-default`), badges sémantiques (Cash/Tournoi/Privée/Freeroll/Terminé), format chips compact `K`, mise en page header/dl/footer.
- `JoinByCodeForm` réécrit avec primitives Sprint 0 (`Card`, `Input`, `Button`) — gestion d'erreur via la prop `error` de l'Input.
- `MyTablesSection` : tokens dark (`bg-bg-elevated`, `border-accent/30`), grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- `TableList` réécrit : SegmentedControl `Toutes / Cash / Tournois` (rôle `tablist`), squelettes de chargement (skeleton cards), état vide cohérent, retrait du bloc quick-stats redondant.
- `Lobby` simplifié : suppression du header custom (gradient, bouton créer, stats, profile) — `AppShell` fournit maintenant le chrome. Plus que le contenu : JoinByCodeForm + MyTables + TableList.
- `AppMain` : `headerAction={ label: 'Créer', onClick: handleCreateTable }` passé à `AppShell` quand `currentView === 'lobby'`.

### Ajouté
- 11 tests UI (`TableCard`, `JoinByCodeForm`).
```

### Step 6.3 — Commit

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 2A Lobby cards"
```

---

## Critères de "Done" du Sprint 2A

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] Tests UI : ≥ 98 (87 base + 11 nouveaux).
- [ ] Plus aucun `bg-white` / `text-gray-900` dans les fichiers Lobby (sauf si pertinent — sinon dark partout).
- [ ] Le bouton "Créer" apparaît dans le header AppShell uniquement sur la vue `lobby`.
- [ ] Cohérence visuelle entre le Lobby et le reste de l'app (table, panneau, drawers).

## Hors scope (Sprint 2B)

- Refonte de `CreateTableForm` en BottomSheet.
- Migration de la route `create-table` vers le BottomSheet (suppression du switch dans AppMain).
- Pull-to-refresh natif.
- Onglet "Invitations reçues" dans le SegmentedControl (le segmented control reste à 3 entrées Toutes/Cash/Tournois pour Sprint 2A).
- Centre de notifications (cloche dans header).
