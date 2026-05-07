# Sprint 3 — Écran Tournois — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire fonctionner l'onglet "Tournois" du `AppShell` (actuellement un placeholder `alert("Sprint 3")`). Nouvel écran `TournamentsScreen` avec un `SegmentedControl` (`À venir` / `En cours` / `Historique`) qui filtre les tables `gameType === 'tournament'` issues de la query existante `getTablesWithUserInfo`. Réutilise `TableCard` (déjà mobile-first dark, badges sémantiques). Le bouton header "Créer un tournoi" rouvre la `BottomSheet` `CreateTableForm` avec `gameType` pré-sélectionné à `tournament`.

**Architecture:** Pas de nouvelle table Convex ni de nouvelle query — les tournois sont juste des tables avec `gameType: 'tournament'`. La même mémoire utilisateur indique : SNG single-table prioritaire pour MVP, pas de late reg / rebuy au MVP. Le Sprint 3 se contente donc d'offrir une vue focalisée sur les tournois, sans toucher au backend.

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0 + Convex.

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `src/core/components/Tournament/TournamentsScreen.tsx` | Écran Tournois : SegmentedControl + grille de tournois filtrés par état |
| `src/core/components/Tournament/index.ts` | Barrel export |
| `tests/ui/TournamentsScreen.test.tsx` | Tests TDD : filtres, états vides, render |

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Table/CreateTableForm.tsx` | Ajouter prop optionnelle `defaultGameType` (`'cash' | 'tournament'`) |
| `src/core/components/App/AppMain.tsx` | Type `AppView` étendu avec `"tournois"`, switch `renderView()`, `onTabChange`, `headerAction` (Créer une table ou Créer un tournoi selon currentView), passage de `defaultGameType` au form |

### Files NOT touched

- `convex/*` — backend inchangé.
- Reste des composants Game/Lobby/Stats.

---

## Notes pour l'implémenteur

### Statut tournoi

Une table `gameType === 'tournament'` peut avoir un sous-statut dans `table.modules.tournament.status` : `'registering'`, `'running'`, `'finished'`. À défaut, on utilise `table.status` (`'waiting'`, `'active'`, `'finished'`).

Mapping vers les filtres écran :
- **À venir** : `tournament.status === 'registering'` ou (fallback `table.status === 'waiting'`)
- **En cours** : `tournament.status === 'running'` ou `table.status === 'active'`
- **Historique** : `tournament.status === 'finished'` ou `table.status === 'finished'`

### Source des données

`api.tables.getTablesWithUserInfo` retourne `{ myTables, publicTables }`. Pour la vue tournois on veut TOUTES les tables tournois (privées incluses si l'utilisateur y a accès via myTables, plus les publiques). On concatène `myTables` + `publicTables` puis on déduplique par `_id`, puis on filtre par `gameType === 'tournament'`.

---

## Task 1 : `TournamentsScreen` (TDD)

**Files:**
- Create: `src/core/components/Tournament/TournamentsScreen.tsx`
- Create: `src/core/components/Tournament/index.ts`
- Create: `tests/ui/TournamentsScreen.test.tsx`

### Step 1.1 — Test FIRST

`tests/ui/TournamentsScreen.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();
const mockUseQuery = vi.fn();
vi.mock('../../src/core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
}));

import { TournamentsScreen } from '../../src/core/components/Tournament/TournamentsScreen';

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
  mockUseAuth.mockReturnValue({ user: { _id: 'u1', name: 'Test' } });
});

const baseTournament = (overrides: Record<string, unknown>) => ({
  _id: 'tnt-' + Math.random().toString(36).slice(2, 7),
  name: 'Tournoi test',
  gameType: 'tournament',
  maxPlayers: 6,
  playerCount: 2,
  isPrivate: false,
  smallBlind: 5,
  bigBlind: 10,
  startingStack: 1500,
  buyIn: 50,
  status: 'waiting',
  isUserSeated: false,
  createdAt: Date.now(),
  ...overrides,
});

describe('TournamentsScreen', () => {
  it('renders three filter tabs', () => {
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    expect(screen.getByRole('tab', { name: /à venir/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /en cours/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /historique/i })).toBeInTheDocument();
  });

  it('shows empty state when no tournaments', () => {
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    expect(screen.getByText(/aucun tournoi/i)).toBeInTheDocument();
  });

  it('filters tournaments by status (À venir = waiting/registering)', () => {
    const upcoming = baseTournament({ name: 'Tournoi À venir', status: 'waiting' });
    const running = baseTournament({ name: 'Tournoi En cours', status: 'active' });
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [upcoming, running] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    // Default tab : À venir
    expect(screen.getByText('Tournoi À venir')).toBeInTheDocument();
    expect(screen.queryByText('Tournoi En cours')).toBeNull();
  });

  it('switches to "En cours" tab and shows running tournaments', async () => {
    const upcoming = baseTournament({ name: 'Tournoi À venir', status: 'waiting' });
    const running = baseTournament({ name: 'Tournoi En cours', status: 'active' });
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [upcoming, running] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    await userEvent.click(screen.getByRole('tab', { name: /en cours/i }));
    expect(screen.getByText('Tournoi En cours')).toBeInTheDocument();
    expect(screen.queryByText('Tournoi À venir')).toBeNull();
  });

  it('shows finished tournaments in "Historique" tab', async () => {
    const finished = baseTournament({ name: 'Tournoi fini', status: 'finished' });
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [finished] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    await userEvent.click(screen.getByRole('tab', { name: /historique/i }));
    expect(screen.getByText('Tournoi fini')).toBeInTheDocument();
  });

  it('excludes cash tables from all filters', async () => {
    const cash = { ...baseTournament({}), gameType: 'cash', name: 'Cash table' };
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [cash] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    expect(screen.queryByText('Cash table')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: /en cours/i }));
    expect(screen.queryByText('Cash table')).toBeNull();
  });

  it('dedupes tournaments appearing in both myTables and publicTables', () => {
    const tnt = baseTournament({ _id: 'shared-id', name: 'Shared tournoi', status: 'waiting' });
    mockUseQuery.mockReturnValue({ myTables: [tnt], publicTables: [tnt] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    expect(screen.getAllByText('Shared tournoi')).toHaveLength(1);
  });
});
```

### Step 1.2 — Run, expect FAIL

`npx vitest run tests/ui/TournamentsScreen.test.tsx`

### Step 1.3 — Implement `src/core/components/Tournament/TournamentsScreen.tsx`

```tsx
import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
import { TableCard } from "../Lobby/TableCard";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "../../../shared/utils/cn";

type TournamentFilter = "upcoming" | "running" | "history";

interface TournamentsScreenProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

const FILTERS: { id: TournamentFilter; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "running", label: "En cours" },
  { id: "history", label: "Historique" },
];

function tournamentMatchesFilter(table: Table, filter: TournamentFilter): boolean {
  // Sub-statut prioritaire si présent
  const subStatus = (table as any).modules?.tournament?.status as
    | "registering"
    | "running"
    | "finished"
    | undefined;

  if (filter === "history") {
    return subStatus === "finished" || table.status === "finished";
  }
  if (filter === "running") {
    return subStatus === "running" || table.status === "active";
  }
  // upcoming
  return (
    subStatus === "registering" ||
    table.status === "waiting" ||
    (!subStatus && table.status === "active") === false &&
      table.status !== "finished" &&
      table.status !== "active"
  );
}

const SkeletonCard: React.FC = () => (
  <div className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
    <div className="h-4 bg-bg-elevated rounded w-1/2 mb-2" />
    <div className="h-3 bg-bg-elevated rounded w-1/3 mb-4" />
    <div className="h-3 bg-bg-elevated rounded w-2/3 mb-4" />
    <div className="flex justify-between items-center">
      <div className="h-3 bg-bg-elevated rounded w-1/4" />
      <div className="h-8 bg-bg-elevated rounded w-20" />
    </div>
  </div>
);

export const TournamentsScreen: React.FC<TournamentsScreenProps> = ({ onJoinTable }) => {
  const { user } = useAuth();
  const data = useQuery(
    api.tables.getTablesWithUserInfo,
    user ? { userId: user._id } : "skip",
  );
  const loading = data === undefined;
  const [filter, setFilter] = useState<TournamentFilter>("upcoming");

  // Concat myTables + publicTables, dédup par _id, garde tournois uniquement
  const tournaments = React.useMemo(() => {
    if (!data) return [];
    const all = [...(data.myTables ?? []), ...(data.publicTables ?? [])] as Table[];
    const seen = new Set<string>();
    return all.filter((t) => {
      if (t.gameType !== "tournament") return false;
      const id = String(t._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data]);

  const filtered = tournaments.filter((t) => tournamentMatchesFilter(t, filter));

  return (
    <section className="container mx-auto max-w-5xl px-3 md:px-4 py-4 md:py-6 space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">Tournois</h2>
        <div
          role="tablist"
          aria-label="Filtre par statut de tournoi"
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
                  isActive ? "bg-accent text-white" : "text-text-muted hover:text-text-primary",
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
            🏆
          </div>
          <p className="text-text-primary font-medium">Aucun tournoi</p>
          <p className="mt-1 text-sm text-text-muted">
            {filter === "upcoming"
              ? "Aucun tournoi à venir. Sois le premier à en créer un !"
              : filter === "running"
                ? "Aucun tournoi en cours pour le moment."
                : "Aucun tournoi terminé dans l'historique."}
          </p>
        </div>
      )}
    </section>
  );
};
```

Note : la fonction `tournamentMatchesFilter` pour `upcoming` est subtile. La règle simple : un tournoi est "à venir" s'il est explicitement en `registering`, ou s'il est en `waiting` (sans sous-statut tournoi). Si pas de sub-status et pas waiting/finished, on le considère `running` (active) — pas upcoming. Le simplifier avec une règle robuste :

```ts
function tournamentMatchesFilter(table: Table, filter: TournamentFilter): boolean {
  const subStatus = (table as any).modules?.tournament?.status as
    | "registering"
    | "running"
    | "finished"
    | undefined;

  // Si sub-statut explicite, on l'utilise prioritairement.
  if (subStatus) {
    if (filter === "history") return subStatus === "finished";
    if (filter === "running") return subStatus === "running";
    return subStatus === "registering";
  }

  // Sinon, fallback sur table.status.
  if (filter === "history") return table.status === "finished";
  if (filter === "running") return table.status === "active";
  return table.status === "waiting";
}
```

Utiliser cette version dans le composant.

### Step 1.4 — Create barrel `src/core/components/Tournament/index.ts`

```ts
export { TournamentsScreen } from "./TournamentsScreen";
```

### Step 1.5 — Run, expect PASS (7 tests)

`npx vitest run tests/ui/TournamentsScreen.test.tsx`

### Step 1.6 — Commit

```bash
git add src/core/components/Tournament/ tests/ui/TournamentsScreen.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(tournois): TournamentsScreen — filtre À venir/En cours/Historique (TDD)"
```

---

## Task 2 : Ajouter `defaultGameType` à `CreateTableForm`

**Files:**
- Modify: `src/core/components/Table/CreateTableForm.tsx`

### Step 2.1 — Ajouter la prop optionnelle

Modifier l'interface :

```tsx
interface CreateTableFormProps {
  onSubmit: (tableData: CreateTableData) => void;
  onCancel: () => void;
  /** Type de partie pré-sélectionné. Défaut: 'cash'. */
  defaultGameType?: GameType;
}
```

Modifier la déstructuration :

```tsx
export const CreateTableForm: React.FC<CreateTableFormProps> = ({
  onSubmit,
  onCancel,
  defaultGameType = 'cash',
}) => {
  // ...
};
```

Modifier l'initialisation du `useState formData` pour utiliser `defaultGameType` :

```tsx
const [formData, setFormData] = useState<CreateTableData>(() => {
  const isTournament = defaultGameType === 'tournament';
  return {
    name: `Table de ${user?.name || 'Joueur'}`,
    maxPlayers: 6,
    gameType: defaultGameType,
    startingStack: isTournament ? 1500 : 1000,
    smallBlind: 10,
    bigBlind: 20,
    isPrivate: false,
    buyIn: isTournament ? 0 : undefined,
    preset: isTournament ? 'standard' : undefined,
    levelDurationMin: isTournament ? 10 : undefined,
  };
});
```

### Step 2.2 — Verify

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
```

### Step 2.3 — Commit

```bash
git add src/core/components/Table/CreateTableForm.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): CreateTableForm — prop defaultGameType (cash|tournament)"
```

---

## Task 3 : Wirer l'onglet "Tournois" + headerAction dans `AppMain`

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

### Step 3.1 — Lire l'état actuel

Repérer :
- Le type `AppView = "lobby" | "table" | "stats"`.
- Le `tabs` array et `viewToTab`.
- La fonction `onTabChange` qui gère le clic sur les onglets (alert pour Tournois aujourd'hui).
- Le `renderView()` switch.
- Le calcul de `headerTitle` et `headerAction`.
- Le `<BottomSheet>` qui monte `<CreateTableForm>`.

### Step 3.2 — Étendre `AppView`

```tsx
type AppView = "lobby" | "table" | "stats" | "tournois";
```

### Step 3.3 — Ajouter l'import

```tsx
import { TournamentsScreen } from "../Tournament/TournamentsScreen";
```

### Step 3.4 — Mettre à jour `viewToTab`

```tsx
const viewToTab = (v: AppView): TabId => {
  if (v === "stats") return "stats";
  if (v === "tournois") return "tournois";
  return "lobby";
};
```

### Step 3.5 — Mettre à jour `onTabChange`

Retirer l'alert pour tournois, naviguer vers la vue :

```tsx
const onTabChange = (id: string) => {
  if (id === "stats") setCurrentView("stats");
  else if (id === "lobby") setCurrentView("lobby");
  else if (id === "tournois") setCurrentView("tournois");
  else if (id === "profil") {
    setCurrentView("lobby");
    alert("La refonte Profil arrive au Sprint 5.");
  }
};
```

### Step 3.6 — Ajouter case dans `renderView()`

Insérer dans le switch :

```tsx
case "tournois":
  return <TournamentsScreen onJoinTable={handleJoinTable} />;
```

### Step 3.7 — Mettre à jour `headerTitle`

```tsx
const headerTitle = (() => {
  switch (currentView) {
    case "lobby": return title;
    case "tournois": return "Tournois";
    case "stats": return "Stats";
    case "table": return title;
    default: return title;
  }
})();
```

### Step 3.8 — Mettre à jour `headerAction`

Le bouton "Créer" devient "Créer un tournoi" sur la vue tournois :

```tsx
const headerAction = (() => {
  if (currentView === "lobby") {
    return {
      label: "Créer",
      onClick: handleCreateTable,
      icon: <span aria-hidden>+</span>,
    };
  }
  if (currentView === "tournois") {
    return {
      label: "Créer",
      onClick: handleCreateTable,
      icon: <span aria-hidden>+</span>,
    };
  }
  return undefined;
})();
```

### Step 3.9 — Passer `defaultGameType` au `CreateTableForm`

Dans le `<BottomSheet>` final, calculer le `defaultGameType` selon `currentView` :

```tsx
<BottomSheet
  isOpen={showCreateSheet}
  onClose={() => setShowCreateSheet(false)}
  title={currentView === "tournois" ? "Créer un nouveau tournoi" : "Créer une nouvelle table"}
>
  <CreateTableForm
    onSubmit={handleTableCreated}
    onCancel={handleCancelCreateTable}
    defaultGameType={currentView === "tournois" ? "tournament" : "cash"}
  />
</BottomSheet>
```

### Step 3.10 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui
```

### Step 3.11 — Commit

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(tournois): wirer onglet Tournois + headerAction Créer un tournoi"
```

---

## Task 4 : Audit + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 4.1 — Audits

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

### Step 4.2 — Update `CHANGELOG.md`

Ajouter en haut :

```markdown
## [Unreleased] — Sprint 3 Écran Tournois

### Ajouté
- `TournamentsScreen` (`src/core/components/Tournament/`) : nouvel écran filtrant les tables `gameType === 'tournament'` avec un SegmentedControl `À venir / En cours / Historique`. Réutilise `TableCard` pour la grille. Skeleton de chargement, états vides par filtre, dédup myTables/publicTables.
- `CreateTableForm` : nouvelle prop optionnelle `defaultGameType` (`'cash' | 'tournament'`) pour pré-sélectionner le type de partie à l'ouverture du form.
- 7 tests UI (`TournamentsScreen`).

### Modifié
- `AppMain` : ajout de la vue `"tournois"` dans `AppView`, navigation depuis l'onglet AppShell (au lieu de l'alert placeholder), `headerAction` "Créer" sur lobby ET tournois, `BottomSheet` titre dynamique ("Créer une nouvelle table" / "Créer un nouveau tournoi") et `defaultGameType` passé selon la vue courante.
```

### Step 4.3 — Commit

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 3 écran Tournois"
```

---

## Critères de "Done" du Sprint 3

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] Tests UI : ≥ 105 (98 base + 7 nouveaux).
- [ ] Cliquer sur l'onglet Tournois (bottom tab mobile / sidebar desktop) ouvre `TournamentsScreen`.
- [ ] Le SegmentedControl À venir / En cours / Historique filtre correctement.
- [ ] Le bouton "Créer" du header sur la vue Tournois ouvre le BottomSheet avec gameType `tournament` pré-sélectionné.
- [ ] CHANGELOG mis à jour.

## Hors scope (laissé pour itérations futures)

- Card spécifique tournoi (compte à rebours dynamique, prize pool, structure blinds preview). Pour l'instant on réutilise `TableCard` qui couvre l'essentiel.
- Late registration / rebuy (cf. mémoire utilisateur : MVP sans).
- MTT multi-tables (mémoire : SNG single-table prioritaire).
- Centre de notifications inscription tournoi.
