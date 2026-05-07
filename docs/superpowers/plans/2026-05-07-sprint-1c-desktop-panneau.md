# Sprint 1C — Panneau droit desktop + finitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur desktop (`≥ lg`, 1024 px+), afficher un panneau latéral droit (320 px) avec 3 onglets : `Chat` (squelette, le module reste backlog), `Historique main` (réutilise `ActionFeed`), `Joueurs` (liste compacte des joueurs assis avec stack et statut). Sur mobile/tablette, comportement inchangé (drawers existants accessibles via icônes header). Pas de mini-carte des sièges (hors scope, jugée inutile par le user).

**Architecture:** Création d'un composant pur `TableRightPanel` dans `src/core/components/Game/` qui prend les données nécessaires en props et gère son propre état d'onglet actif. `PokerTable` détecte `useMediaQuery(BREAKPOINTS.lg)` et :
- Sur desktop : monte `TableRightPanel` à droite via un nouveau wrapper layout, masque les drawers Chat/Actions (les autres icônes header — settings, info, invite — restent en drawer).
- Sur mobile : ne change rien (drawers actuels intacts).

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0 + Vitest 4.

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `src/core/components/Game/TableRightPanel.tsx` | Panneau latéral 320 px avec 3 onglets, contrôlé en interne |
| `src/core/components/Game/PlayersListPanel.tsx` | Onglet "Joueurs" : liste compacte assis (avatar + nom + chips + statut) |
| `src/core/components/Game/ChatPanel.tsx` | Onglet "Chat" : squelette identique au ChatDrawer mais sans wrapper Drawer (pour intégration inline) |
| `tests/ui/TableRightPanel.test.tsx` | Tests TDD : 3 onglets, switch, contenu |
| `tests/ui/PlayersListPanel.test.tsx` | Tests TDD : liste joueurs |

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Game/PokerTable.tsx` | Monter le panneau droit en desktop, masquer drawers Chat/Actions sur desktop |

### Files NOT touched

- `ChatDrawer.tsx`, `ActionFeedDrawer.tsx`, `ActionFeed.tsx` — réutilisés tels quels (le contenu de l'onglet est extrait en composant, le drawer mobile reste).
- Reste des composants Game (PlayerSeat, BettingControls, etc.).
- Backend Convex.

---

## Task 1 : Composant `ChatPanel` (squelette, sans Drawer)

**Files:**
- Create: `src/core/components/Game/ChatPanel.tsx`

Pour intégrer le contenu Chat dans un onglet, on en extrait une version sans `<Drawer>` autour. Pas de tests dédiés (squelette statique).

- [ ] **Step 1.1 : Créer `src/core/components/Game/ChatPanel.tsx`**

```tsx
import React from 'react';

// Squelette du panneau Chat, intégré dans TableRightPanel (desktop) et
// dans ChatDrawer (mobile). Le module Chat lui-même reste backlog
// (cf. CLAUDE.md "Chat system: future").
export const ChatPanel: React.FC = () => (
  <div className="text-sm text-text-muted space-y-3 p-2">
    <div className="text-3xl text-center">💬</div>
    <p className="text-center">
      Le chat sera disponible prochainement. Pour l'instant, échangez via
      vos moyens habituels.
    </p>
  </div>
);
```

- [ ] **Step 1.2 : Commit**

```bash
git add src/core/components/Game/ChatPanel.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): ChatPanel (squelette extrait pour usage inline)"
```

---

## Task 2 : Composant `PlayersListPanel` (TDD)

**Files:**
- Create: `src/core/components/Game/PlayersListPanel.tsx`
- Create: `tests/ui/PlayersListPanel.test.tsx`

Liste compacte des joueurs assis : avatar (initiale), nom, chips formatés, statut (folded / all-in / current turn).

- [ ] **Step 2.1 : Test FIRST**

`tests/ui/PlayersListPanel.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayersListPanel } from '../../src/core/components/Game/PlayersListPanel';

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

const players = [
  { userId: 'u1' as const, name: 'Alice', chips: 1500, isFolded: false, isAllIn: false, isCurrent: true },
  { userId: 'u2' as const, name: 'Bob', chips: 800, isFolded: true, isAllIn: false, isCurrent: false },
  { userId: 'u3' as const, name: 'Charlie', chips: 0, isFolded: false, isAllIn: true, isCurrent: false },
];

describe('PlayersListPanel', () => {
  it('renders each player name', () => {
    render(<PlayersListPanel players={players} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('formats chips with locale (no compact in panel)', () => {
    render(<PlayersListPanel players={players} />);
    expect(screen.getByText(/1[  ,. ]?500/)).toBeInTheDocument();
  });

  it('shows "Couché" for folded player', () => {
    render(<PlayersListPanel players={players} />);
    expect(screen.getByText(/couché/i)).toBeInTheDocument();
  });

  it('shows "All-in" for all-in player', () => {
    render(<PlayersListPanel players={players} />);
    expect(screen.getByText(/all-?in/i)).toBeInTheDocument();
  });

  it('marks current-turn player visually', () => {
    render(<PlayersListPanel players={players} />);
    const aliceItem = screen.getByText('Alice').closest('li');
    expect(aliceItem?.className).toMatch(/border-accent|ring-accent/);
  });

  it('renders empty state when no players', () => {
    render(<PlayersListPanel players={[]} />);
    expect(screen.getByText(/aucun joueur/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2.2 : Run, expect FAIL**

`npx vitest run tests/ui/PlayersListPanel.test.tsx`

- [ ] **Step 2.3 : Implement `src/core/components/Game/PlayersListPanel.tsx`**

```tsx
import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface PlayerSummary {
  userId: string;
  name: string;
  chips: number;
  isFolded: boolean;
  isAllIn: boolean;
  isCurrent: boolean;
}

export interface PlayersListPanelProps {
  players: PlayerSummary[];
  className?: string;
}

const initial = (name: string) => (name || 'Player').charAt(0).toUpperCase();

export const PlayersListPanel: React.FC<PlayersListPanelProps> = ({ players, className }) => {
  if (players.length === 0) {
    return (
      <div className={cn('p-4 text-center text-sm text-text-muted', className)}>
        Aucun joueur assis pour le moment.
      </div>
    );
  }

  return (
    <ul className={cn('flex flex-col gap-2 p-2', className)}>
      {players.map((p) => {
        let status: string | null = null;
        if (p.isFolded) status = 'Couché';
        else if (p.isAllIn) status = 'All-in';

        return (
          <li
            key={p.userId}
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 border transition-colors',
              'bg-bg-elevated border-border-default',
              p.isCurrent && 'border-accent ring-1 ring-accent',
              p.isFolded && 'opacity-50',
            )}
          >
            <div
              className="bg-blue-500 rounded-full flex items-center justify-center text-white font-bold w-9 h-9 text-sm"
              aria-hidden="true"
            >
              {initial(p.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
              <div className="text-xs text-text-muted">{p.chips.toLocaleString()} jetons</div>
            </div>
            {status && (
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  p.isAllIn && 'bg-sem-danger/20 text-sem-danger',
                  p.isFolded && 'bg-bg-surface text-text-muted',
                )}
              >
                {status}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
```

- [ ] **Step 2.4 : Run, expect PASS (6 tests)**

- [ ] **Step 2.5 : Commit**

```bash
git add src/core/components/Game/PlayersListPanel.tsx tests/ui/PlayersListPanel.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): PlayersListPanel (liste joueurs assis avec statut)"
```

---

## Task 3 : Composant `TableRightPanel` (TDD)

**Files:**
- Create: `src/core/components/Game/TableRightPanel.tsx`
- Create: `tests/ui/TableRightPanel.test.tsx`

Panneau de 320 px de large, 3 onglets (Chat / Historique / Joueurs). Réutilise `ActionFeed` (existant) dans l'onglet Historique, `ChatPanel` (Task 1) dans l'onglet Chat, `PlayersListPanel` (Task 2) dans l'onglet Joueurs. État interne pour l'onglet actif.

- [ ] **Step 3.1 : Test FIRST**

`tests/ui/TableRightPanel.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { TableRightPanel } from '../../src/core/components/Game/TableRightPanel';

const players = [
  { userId: 'u1', name: 'Alice', chips: 1500, isFolded: false, isAllIn: false, isCurrent: true },
];

describe('TableRightPanel', () => {
  it('renders three tab buttons', () => {
    render(<TableRightPanel actions={[]} players={players} />);
    expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /historique/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /joueurs/i })).toBeInTheDocument();
  });

  it('opens on the players tab by default', () => {
    render(<TableRightPanel actions={[]} players={players} />);
    expect(screen.getByRole('tab', { name: /joueurs/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('switches to chat tab on click', async () => {
    render(<TableRightPanel actions={[]} players={players} />);
    await userEvent.click(screen.getByRole('tab', { name: /chat/i }));
    expect(screen.getByRole('tab', { name: /chat/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/le chat sera disponible/i)).toBeInTheDocument();
  });

  it('switches to historique tab on click', async () => {
    render(<TableRightPanel actions={[]} players={players} />);
    await userEvent.click(screen.getByRole('tab', { name: /historique/i }));
    expect(screen.getByRole('tab', { name: /historique/i })).toHaveAttribute('aria-selected', 'true');
  });
});
```

- [ ] **Step 3.2 : Run, expect FAIL**

- [ ] **Step 3.3 : Implement `src/core/components/Game/TableRightPanel.tsx`**

```tsx
import React, { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { ActionFeed } from './ActionFeed';
import { ChatPanel } from './ChatPanel';
import { PlayersListPanel, type PlayerSummary } from './PlayersListPanel';

type TabId = 'chat' | 'historique' | 'joueurs';

export interface TableRightPanelProps {
  actions: unknown[];
  players: PlayerSummary[];
  className?: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'joueurs', label: 'Joueurs' },
  { id: 'historique', label: 'Historique' },
  { id: 'chat', label: 'Chat' },
];

export const TableRightPanel: React.FC<TableRightPanelProps> = ({ actions, players, className }) => {
  const [active, setActive] = useState<TabId>('joueurs');

  return (
    <aside
      className={cn(
        'w-80 h-full flex flex-col bg-bg-surface border-l border-border-default',
        className,
      )}
    >
      <div role="tablist" aria-label="Panneau de la table" className="flex border-b border-border-default">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex-1 min-h-tap py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {active === 'joueurs' && <PlayersListPanel players={players} />}
        {active === 'historique' && <ActionFeed actions={actions as never} />}
        {active === 'chat' && <ChatPanel />}
      </div>
    </aside>
  );
};
```

Note : `ActionFeed` accepte `actions: any[]` aujourd'hui (cf. signature existante). Le cast `as never` ici est une concession pour ne pas modifier la signature de `ActionFeed`. Si TypeScript objecte, fallback : `as any`.

- [ ] **Step 3.4 : Run, expect PASS (4 tests)**

- [ ] **Step 3.5 : Commit**

```bash
git add src/core/components/Game/TableRightPanel.tsx tests/ui/TableRightPanel.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): TableRightPanel (3 onglets : Joueurs / Historique / Chat)"
```

---

## Task 4 : Intégration dans `PokerTable` (desktop only)

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx`

Sur desktop (`≥ lg`), monter `TableRightPanel` dans un layout row. Sur mobile/tablette, comportement inchangé (drawers via icônes header).

- [ ] **Step 4.1 : Lire PokerTable.tsx pour repérer la structure**

Lecture nécessaire pour situer :
- L'import éventuel de `useMediaQuery` (à ajouter si absent dans la branche).
- Le wrapper `pokerTableContainer` (`fixed inset-0 flex flex-col`) pour décider où insérer le panneau.

L'idée : juste APRÈS le header, le contenu existant (`<div className="flex flex-1 ...">`) devient le côté gauche, et on ajoute le panneau à côté. La structure cible :

```
[header]
[bandeau si tournoi]
<div className="flex flex-1">
  <div className="flex-1 ...">  <!-- existant : feutre + cartes + actions -->
    ...
  </div>
  {isDesktop && <TableRightPanel actions={actionHistory} players={...} />}
</div>
```

- [ ] **Step 4.2 : Préparer `players` au bon format**

Dans le rendu (avant le `return`), construire `playersForPanel` :

```tsx
const playersForPanel = (players ?? []).map((p) => ({
  userId: String(p.userId),
  name: p.user?.name || 'Joueur',
  chips: p.chips ?? 0,
  isFolded: !!p.isFolded,
  isAllIn: !!p.isAllIn,
  isCurrent: p.userId === currentPlayer?.userId,
}));
```

(Adapter au shape réel des `players` — vérifier `isMyTurn` vs `currentPlayer`.)

- [ ] **Step 4.3 : Importer et monter le panneau**

Ajouter en haut du fichier (avec les autres imports) :

```tsx
import { TableRightPanel } from './TableRightPanel';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '@/shared/constants/breakpoints';
```

Si `useMediaQuery`/`BREAKPOINTS` sont déjà importés, ne pas dupliquer.

Dans le composant (proche de `useResponsiveClasses`) :

```tsx
const isDesktop = useMediaQuery(BREAKPOINTS.lg);
```

Repérer le bloc `<div className={cn("flex flex-1", ...)}>` (autour de la ligne 711 dans la branche actuelle, peut varier après merge — utiliser grep pour confirmer). Modifier ce wrapper pour ajouter le panneau côte à côte :

```tsx
<div className={cn(
  "flex flex-1",
  isMobile ? "overflow-hidden" : "overflow-x-auto"
)}>
  {/* contenu existant : <div className="flex-1 flex flex-col items-center"> ... */}

  {isDesktop && (
    <TableRightPanel
      actions={actionHistory ?? []}
      players={playersForPanel}
    />
  )}
</div>
```

- [ ] **Step 4.4 : Verify**

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # tous les tests Sprint 0+1A+1B+1C doivent passer
```

- [ ] **Step 4.5 : Test manuel (utilisateur)**

(Tâche utilisateur, après push)
- Desktop ≥ 1024 px : panneau droit visible avec 3 onglets ; cliquer sur Joueurs / Historique / Chat ; vérifier que le contenu change.
- Mobile / tablette < 1024 px : pas de panneau ; les drawers Chat/Actions s'ouvrent toujours via les icônes header.
- Vérifier que la table de jeu reste fonctionnelle en desktop avec le panneau (pas d'overlap, table pas trop écrasée).

- [ ] **Step 4.6 : Commit**

```bash
git add src/core/components/Game/PokerTable.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): monter TableRightPanel en desktop ≥1024px (3 onglets latéraux)"
```

---

## Task 5 : Audit + CHANGELOG + clôture

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 5.1 : Audits finaux**

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

Tous OK (sauf 4 échecs pré-existants security-c1 + prizeStructure).

- [ ] **Step 5.2 : Update `CHANGELOG.md`**

Ajouter en haut :

```markdown
## [Unreleased] — Sprint 1C panneau droit desktop + finitions

### Ajouté
- `TableRightPanel` (`src/core/components/Game/`) : panneau latéral 320 px avec 3 onglets (Joueurs / Historique / Chat) monté en desktop ≥ 1024 px.
- `PlayersListPanel` : liste compacte des joueurs assis (avatar, nom, chips, statut Couché/All-in, mise en évidence du joueur courant).
- `ChatPanel` : squelette du Chat (le module reste backlog), réutilisable inline ou dans un drawer.
- 10 tests UI (`PlayersListPanel`, `TableRightPanel`).

### Modifié
- `PokerTable` : monte `TableRightPanel` à droite sur desktop. Comportement mobile/tablette inchangé (drawers via icônes header).

### Notes
- Mini-carte des sièges supprimée du périmètre (jugée non utile).
- L'envoi/réception de messages dans le Chat reste backlog (cf. CLAUDE.md "Chat system: future").
```

- [ ] **Step 5.3 : Commit clôture**

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 1C panneau droit desktop"
```

---

## Critères de "Done" du Sprint 1C

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] Tests UI : ≥ 87 tests (77 base + 10 nouveaux).
- [ ] Sur desktop (≥ 1024 px), panneau droit avec 3 onglets fonctionnels.
- [ ] Sur mobile/tablette, comportement inchangé.
- [ ] CHANGELOG mis à jour.

## Risques & mitigations

- **Largeur de table réduite** : le panneau prend 320 px du viewport. À 1024 px, il reste 704 px pour la table — devrait suffire (la table desktop a `max-w-4xl h-[700px]`). Si trop serré sur petit desktop, `2xl:` pourrait montrer une version plus large du panneau et `lg:` une version compacte.
- **API `actions` de `ActionFeed`** : on passe `actionHistory` directement. Si la signature de `ActionFeed` est plus stricte, adapter le cast.
- **Performance** : 3 onglets toujours montés mais un seul visible — acceptable pour un sprint. Si lazy nécessaire plus tard, wrap avec `<Suspense>`/lazy.

## Hors scope

- Mini-carte des sièges (supprimée par l'utilisateur).
- Module Chat fonctionnel (envoi/réception, persistance, modération).
- Polish push-to-pot animations / dealer button (déjà fonctionnels, à itérer si besoin).
- Optimisations memo `PlayerSeat` (à suivre dans un sprint perf dédié si nécessaire).
