# Sprint 1B — Sièges + cartes communes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `CommunityCards` selon le spec mobile-first, et faire évoluer `PlayerSeat` (450 lignes existantes, riche en fonctionnalités qui marchent — animations push-to-pot, blinds, dealer, timer) de manière chirurgicale : décomposition en sous-composants ciblés, adoption des tokens Sprint 0, mode compact 320 px.

**Architecture:** `CommunityCards` est petit (128 lignes) → rewrite TDD complet en gardant l'API. `PlayerSeat` est gros mais fonctionnel → extraction de sous-composants (`PlayerAvatar`, `PlayerSeatEmpty`, `BlindBadge`, `BetIndicator`) + adoption des tokens Sprint 0. Aucune modification de la logique de positionnement (`useSeatPositioning`) ni du moteur de jeu.

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + Vitest 4 + jsdom + Testing Library + tokens/primitives Sprint 0.

---

## File Structure

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Game/CommunityCards.tsx` | Rewrite TDD complet, mobile-first |
| `src/core/components/Game/PlayerSeat.tsx` | Décomposition + tokens Sprint 0 |

### Files to create

| Path | Purpose |
|---|---|
| `src/core/components/Game/PlayerAvatar.tsx` | Avatar joueur (initiale + ring active) |
| `src/core/components/Game/PlayerSeatEmpty.tsx` | État siège libre (cliquable) |
| `src/core/components/Game/BlindBadge.tsx` | Badge SB / BB |
| `src/core/components/Game/BetIndicator.tsx` | Pile de jetons + montant |
| `tests/ui/CommunityCards.test.tsx` | Tests TDD |
| `tests/ui/PlayerAvatar.test.tsx` | Tests sous-composant |
| `tests/ui/PlayerSeatEmpty.test.tsx` | Tests sous-composant |
| `tests/ui/BlindBadge.test.tsx` | Tests sous-composant |

### Files NOT touched

- `PokerTable.tsx`, hooks de jeu, moteur Convex, autres composants Game (Drawers, Animations, etc.).
- `useSeatPositioning`, calcul des angles et radius.
- Les animations CSS dans `index.css` (push-to-pot, deal, etc.).
- L'API publique de `PlayerSeat` (props identiques).

---

## Task 1 : Refondre `CommunityCards` (rewrite TDD)

**Files:**
- Modify (rewrite): `src/core/components/Game/CommunityCards.tsx`
- Create: `tests/ui/CommunityCards.test.tsx`

**API préservée** :

```ts
interface CommunityCardsProps {
  cards: string[];
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  playersCount?: number;
  maxPlayers?: number;
  className?: string;
}
```

**Comportement** :
- Plaque pot toujours visible (style PokerStars feutré, doré pour le montant).
- 0–5 cartes communes selon la phase (waiting/preflop = 0, flop = 3, turn = 4, river/showdown = 5).
- Phase preflop sans cartes : libellé discret centré ("Pre-flop").
- Tailles cartes adaptatives via `useMediaQuery(BREAKPOINTS.lg)` au lieu du legacy `useBreakpoint`. Pour le moment, considérons : `< lg` = `xs` (compact mobile), `≥ lg` = `md` (desktop).

### Step 1.1 — Test FIRST

`tests/ui/CommunityCards.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommunityCards } from '../../src/core/components/Game/CommunityCards';

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

describe('CommunityCards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('always shows the pot value', () => {
    render(<CommunityCards cards={[]} phase="preflop" pot={120} />);
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('formats large pots in K on mobile', () => {
    render(<CommunityCards cards={[]} phase="flop" pot={2400} />);
    // 2.4K compact, accept variants
    expect(screen.getByText(/2[\.,]?4K|2400|2 400/i)).toBeInTheDocument();
  });

  it('shows nothing instead of cards in waiting / preflop', () => {
    const { container, rerender } = render(
      <CommunityCards cards={['Ah', 'Kd', '7c']} phase="waiting" pot={0} />,
    );
    expect(container.querySelectorAll('[data-card]')).toHaveLength(0);
    rerender(<CommunityCards cards={['Ah', 'Kd', '7c']} phase="preflop" pot={0} />);
    expect(container.querySelectorAll('[data-card]')).toHaveLength(0);
  });

  it('shows 3 cards on flop', () => {
    const { container } = render(
      <CommunityCards cards={['Ah', 'Kd', '7c', '3s', 'Tc']} phase="flop" pot={50} />,
    );
    expect(container.querySelectorAll('[data-card]')).toHaveLength(3);
  });

  it('shows 4 cards on turn', () => {
    const { container } = render(
      <CommunityCards cards={['Ah', 'Kd', '7c', '3s', 'Tc']} phase="turn" pot={50} />,
    );
    expect(container.querySelectorAll('[data-card]')).toHaveLength(4);
  });

  it('shows 5 cards on river / showdown', () => {
    const { container, rerender } = render(
      <CommunityCards cards={['Ah', 'Kd', '7c', '3s', 'Tc']} phase="river" pot={50} />,
    );
    expect(container.querySelectorAll('[data-card]')).toHaveLength(5);
    rerender(
      <CommunityCards cards={['Ah', 'Kd', '7c', '3s', 'Tc']} phase="showdown" pot={50} />,
    );
    expect(container.querySelectorAll('[data-card]')).toHaveLength(5);
  });

  it('shows phase label when no cards (waiting with player count)', () => {
    render(
      <CommunityCards cards={[]} phase="waiting" pot={0} playersCount={1} maxPlayers={6} />,
    );
    expect(screen.getByText(/1\/6/)).toBeInTheDocument();
  });
});
```

### Step 1.2 — Run, expect FAIL

`npx vitest run tests/ui/CommunityCards.test.tsx`

(Les tests échoueront car le composant existant n'expose pas `data-card` sur les cartes.)

### Step 1.3 — Rewrite `src/core/components/Game/CommunityCards.tsx`

```tsx
import React from 'react';
import { Card } from '../UI/Card';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

export interface CommunityCardsProps {
  cards: string[];
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  playersCount?: number;
  maxPlayers?: number;
  className?: string;
}

const SUIT_MAP: Record<string, 'hearts' | 'diamonds' | 'clubs' | 'spades'> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};

function parseCard(cardStr: string) {
  if (!cardStr || cardStr.length < 2) return undefined;
  const rank = cardStr.slice(0, -1);
  const suitChar = cardStr.slice(-1).toLowerCase();
  return { rank, suit: SUIT_MAP[suitChar] } as { rank: string; suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' };
}

const CARDS_PER_PHASE: Record<CommunityCardsProps['phase'], number> = {
  waiting: 0,
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  showdown: 5,
};

function formatPot(pot: number, compact: boolean): string {
  if (pot <= 0) return '0';
  if (compact && pot >= 1000) return `${(pot / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return pot.toLocaleString();
}

function getPhaseLabel(
  phase: CommunityCardsProps['phase'],
  playersCount?: number,
  maxPlayers?: number,
): string {
  switch (phase) {
    case 'waiting':
      if (typeof playersCount === 'number' && typeof maxPlayers === 'number' && playersCount < maxPlayers) {
        return `En attente de joueurs (${playersCount}/${maxPlayers})`;
      }
      return 'En attente de joueurs';
    case 'preflop':
      return 'Pre-flop';
    case 'flop':
      return 'Flop';
    case 'turn':
      return 'Turn';
    case 'river':
      return 'River';
    case 'showdown':
      return 'Showdown';
  }
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  phase,
  pot,
  playersCount,
  maxPlayers,
  className,
}) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);
  const compact = !isDesktop;
  const cardsToShow = cards.slice(0, CARDS_PER_PHASE[phase]);

  return (
    <div className={cn('text-center flex flex-col items-center', className)}>
      {/* Plaque pot */}
      <div
        className={cn(
          'bg-black/60 backdrop-blur-sm text-white rounded-full font-semibold shadow-md border border-white/10',
          compact ? 'px-3 py-1 text-xs mb-1' : 'px-4 py-1.5 text-sm mb-2',
        )}
      >
        Pot : <span className="text-gold">{formatPot(pot, compact)}</span>
      </div>

      {cardsToShow.length > 0 ? (
        <div className={cn('flex justify-center flex-wrap', compact ? 'gap-0.5' : 'gap-2')}>
          {cardsToShow.map((cardStr, index) => (
            <Card
              key={index}
              data-card
              card={parseCard(cardStr)}
              size={compact ? 'xs' : 'md'}
              animation="deal"
              animationDelay={index * 300}
              className="shadow-xl"
            />
          ))}
        </div>
      ) : (
        <div className={cn('text-white/60 uppercase tracking-wider', compact ? 'text-xs' : 'text-sm')}>
          {getPhaseLabel(phase, playersCount, maxPlayers)}
        </div>
      )}
    </div>
  );
};
```

Note : `data-card` doit être propagé par le composant `Card` legacy. Vérifie que `<Card data-card>` rend bien l'attribut. Si non, wrap les cartes dans un `<div data-card>` :

```tsx
<div key={index} data-card>
  <Card card={parseCard(cardStr)} size={compact ? 'xs' : 'md'} animation="deal" animationDelay={index * 300} className="shadow-xl" />
</div>
```

→ utilise la version wrapper pour être sûr.

### Step 1.4 — Run, expect PASS

`npx vitest run tests/ui/CommunityCards.test.tsx`
Expected : 7/7 pass.

### Step 1.5 — Verify build + suite

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # 56 + 7 = 63 tests
```

### Step 1.6 — Commit

```bash
git add src/core/components/Game/CommunityCards.tsx tests/ui/CommunityCards.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(table): CommunityCards refondu mobile-first (TDD, useMediaQuery, gold pot)"
```

---

## Task 2 : Extraire `PlayerSeatEmpty`

**Files:**
- Create: `src/core/components/Game/PlayerSeatEmpty.tsx`
- Create: `tests/ui/PlayerSeatEmpty.test.tsx`
- Modify: `src/core/components/Game/PlayerSeat.tsx` (utilise le nouveau)

PlayerSeat lignes 76–123 contiennent l'état "siège libre". On l'extrait dans son propre fichier, mobile-first via `useMediaQuery`, avec tap target ≥44 px.

### Step 2.1 — Test FIRST

`tests/ui/PlayerSeatEmpty.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerSeatEmpty } from '../../src/core/components/Game/PlayerSeatEmpty';

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

describe('PlayerSeatEmpty', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('renders a button-like clickable region', () => {
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /rejoindre|siège libre/i })).toBeInTheDocument();
  });

  it('has min tap target', () => {
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByRole('button').className).toMatch(/min-h-tap/);
  });

  it('triggers onClick', async () => {
    const onClick = vi.fn();
    render(<PlayerSeatEmpty onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows shorter label on compact (mobile)', () => {
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByText(/^Libre$|rejoindre/i)).toBeInTheDocument();
  });

  it('shows full label on desktop', () => {
    mockMatchMedia(true);
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByText(/siège libre/i)).toBeInTheDocument();
  });
});
```

### Step 2.2 — Run, expect FAIL

`npx vitest run tests/ui/PlayerSeatEmpty.test.tsx`

### Step 2.3 — Implement `src/core/components/Game/PlayerSeatEmpty.tsx`

```tsx
import React from 'react';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

export interface PlayerSeatEmptyProps {
  onClick: () => void;
  className?: string;
}

export const PlayerSeatEmpty: React.FC<PlayerSeatEmptyProps> = ({ onClick, className }) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-tap min-w-tap rounded-2xl border-2 border-dashed border-gray-500 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer transition-all duration-200 text-center',
        isDesktop ? 'p-3' : 'p-2',
        className,
      )}
      aria-label={isDesktop ? 'Siège libre — cliquez pour rejoindre' : 'Rejoindre ce siège libre'}
    >
      <div
        className={cn(
          'bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-300',
          isDesktop ? 'w-12 h-12' : 'w-8 h-8',
        )}
      >
        <svg
          className={cn(isDesktop ? 'w-6 h-6' : 'w-4 h-4')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div className={cn('font-medium text-gray-300', isDesktop ? 'text-sm' : 'text-xs')}>
        {isDesktop ? 'Siège libre' : 'Libre'}
      </div>
      <div className="text-xs text-gray-400">
        {isDesktop ? 'Cliquez pour rejoindre' : 'Rejoindre'}
      </div>
    </button>
  );
};
```

### Step 2.4 — Run, expect PASS (5 tests)

### Step 2.5 — Plug PlayerSeatEmpty dans `PlayerSeat.tsx`

Remplacer les lignes 76–123 (le bloc `if (isEmpty) { return ( ... ); }`) par :

```tsx
import { PlayerSeatEmpty } from './PlayerSeatEmpty';
// ...

  if (isEmpty) {
    return <PlayerSeatEmpty onClick={onSeatClick ?? (() => {})} className={className} />;
  }
```

(L'import doit être ajouté en haut du fichier avec les autres imports.)

### Step 2.6 — Commit

```bash
git add src/core/components/Game/PlayerSeatEmpty.tsx tests/ui/PlayerSeatEmpty.test.tsx src/core/components/Game/PlayerSeat.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "refactor(table): extraire PlayerSeatEmpty (mobile-first, tap target, a11y)"
```

---

## Task 3 : Extraire `BlindBadge`

**Files:**
- Create: `src/core/components/Game/BlindBadge.tsx`
- Create: `tests/ui/BlindBadge.test.tsx`
- Modify: `src/core/components/Game/PlayerSeat.tsx`

PlayerSeat lignes 183–197 contiennent le badge SB / BB. On l'extrait avec adoption du token `gold` Sprint 0 pour le BB et un orange sémantique pour SB.

### Step 3.1 — Test

`tests/ui/BlindBadge.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BlindBadge } from '../../src/core/components/Game/BlindBadge';

describe('BlindBadge', () => {
  it('renders SB label when type=small', () => {
    render(<BlindBadge type="small" />);
    expect(screen.getByText('SB')).toBeInTheDocument();
  });

  it('renders BB label when type=big', () => {
    render(<BlindBadge type="big" />);
    expect(screen.getByText('BB')).toBeInTheDocument();
  });

  it('uses orange background for small blind', () => {
    const { container } = render(<BlindBadge type="small" />);
    expect(container.firstChild).toHaveClass('bg-orange-500');
  });

  it('uses red background for big blind', () => {
    const { container } = render(<BlindBadge type="big" />);
    expect(container.firstChild).toHaveClass('bg-red-600');
  });
});
```

### Step 3.2 — Run, expect FAIL

### Step 3.3 — Implement `src/core/components/Game/BlindBadge.tsx`

```tsx
import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface BlindBadgeProps {
  type: 'small' | 'big';
  className?: string;
}

export const BlindBadge: React.FC<BlindBadgeProps> = ({ type, className }) => {
  const isSmall = type === 'small';
  return (
    <div
      className={cn(
        'absolute -top-2 -left-2 text-white rounded-full flex items-center justify-center font-bold shadow-lg whitespace-nowrap border-2 border-white text-xs px-2 min-w-[28px] h-6',
        isSmall ? 'bg-orange-500' : 'bg-red-600',
        className,
      )}
      aria-label={isSmall ? 'Small blind' : 'Big blind'}
    >
      {isSmall ? 'SB' : 'BB'}
    </div>
  );
};
```

### Step 3.4 — Run, expect PASS (4 tests)

### Step 3.5 — Plug dans `PlayerSeat.tsx`

Remplacer le bloc lignes 183–197 (`{(isSmallBlind || isBigBlind) && ...}`) par :

```tsx
import { BlindBadge } from './BlindBadge';
// ...

        {isSmallBlind && <BlindBadge type="small" />}
        {isBigBlind && <BlindBadge type="big" />}
```

### Step 3.6 — Commit

```bash
git add src/core/components/Game/BlindBadge.tsx tests/ui/BlindBadge.test.tsx src/core/components/Game/PlayerSeat.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "refactor(table): extraire BlindBadge (composant pur SB/BB)"
```

---

## Task 4 : Extraire `PlayerAvatar`

**Files:**
- Create: `src/core/components/Game/PlayerAvatar.tsx`
- Create: `tests/ui/PlayerAvatar.test.tsx`
- Modify: `src/core/components/Game/PlayerSeat.tsx`

L'avatar joueur (lignes 206-216 de PlayerSeat) avec ring active (avatar-active-pulse) et initiale.

### Step 4.1 — Test

`tests/ui/PlayerAvatar.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerAvatar } from '../../src/core/components/Game/PlayerAvatar';

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

describe('PlayerAvatar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('renders the first letter of the name uppercased', () => {
    render(<PlayerAvatar name="vincent" isActive={false} isFolded={false} />);
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('falls back to "P" when name is empty', () => {
    render(<PlayerAvatar name="" isActive={false} isFolded={false} />);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('applies active pulse class when isActive and not folded', () => {
    const { container } = render(<PlayerAvatar name="V" isActive isFolded={false} />);
    expect(container.firstChild).toHaveClass('avatar-active-pulse');
  });

  it('does not apply pulse when folded', () => {
    const { container } = render(<PlayerAvatar name="V" isActive isFolded />);
    expect(container.firstChild).not.toHaveClass('avatar-active-pulse');
  });
});
```

### Step 4.2 — Run, expect FAIL

### Step 4.3 — Implement `src/core/components/Game/PlayerAvatar.tsx`

```tsx
import React from 'react';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

export interface PlayerAvatarProps {
  name: string;
  isActive: boolean;
  isFolded: boolean;
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ name, isActive, isFolded, className }) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);
  const initial = (name || 'Player').charAt(0).toUpperCase();
  const showPulse = isActive && !isFolded;

  return (
    <div
      className={cn(
        'bg-blue-500 rounded-full flex items-center justify-center text-white font-bold ring-2 transition-all',
        isDesktop ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs',
        showPulse ? 'ring-red-500 avatar-active-pulse' : 'ring-blue-300/40',
        className,
      )}
      aria-label={`Avatar de ${name || 'joueur'}`}
    >
      {initial}
    </div>
  );
};
```

### Step 4.4 — Run, expect PASS (4 tests)

### Step 4.5 — Plug dans `PlayerSeat.tsx`

Remplacer le bloc lignes 206-216 (le `<div>` avatar) par :

```tsx
import { PlayerAvatar } from './PlayerAvatar';
// ...

          <PlayerAvatar
            name={player.user?.name || 'Player'}
            isActive={isActivePlayer}
            isFolded={player.isFolded}
          />
```

### Step 4.6 — Commit

```bash
git add src/core/components/Game/PlayerAvatar.tsx tests/ui/PlayerAvatar.test.tsx src/core/components/Game/PlayerSeat.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "refactor(table): extraire PlayerAvatar (initial, ring active, taille adaptative)"
```

---

## Task 5 : Audit final (typecheck, lint, build, full UI suite, manual)

- [ ] **Step 5.1 — Audits**

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

Tous doivent passer (sauf les 4 échecs pré-existants connus).

- [ ] **Step 5.2 — Vérification visuelle**

(Tâche utilisateur, après push)
- Lobby reste OK.
- Sur la table, vérifier les sièges (pleins/vides), les avatars, les badges SB/BB, les cartes communes en preflop / flop / turn / river.
- Tester en portrait et paysage.
- Vérifier que les animations push-to-pot, dealer button, timer, push, all-in fonctionnent toujours.

- [ ] **Step 5.3 — Mise à jour CHANGELOG**

Ajouter en haut de `CHANGELOG.md` :

```markdown
## [Unreleased] — Sprint 1B sièges + cartes communes

### Modifié
- `CommunityCards` réécrit selon le spec mobile-first (TDD) : `useMediaQuery` (Sprint 0) au lieu du legacy `useBreakpoint`, montant du pot en doré, libellés de phase plus discrets en preflop, format compact `K` plus précis.
- `PlayerSeat` décomposé en sous-composants ciblés sans toucher à la logique : `PlayerSeatEmpty`, `BlindBadge`, `PlayerAvatar`. Animations / push-to-pot / dealer / timer / blinds inchangés.

### Ajouté
- `src/core/components/Game/PlayerSeatEmpty.tsx` (siège libre, tap target 44px, label adaptatif).
- `src/core/components/Game/BlindBadge.tsx` (badge SB/BB pur).
- `src/core/components/Game/PlayerAvatar.tsx` (initiale, ring active, taille adaptative).
- 16+ tests UI (`tests/ui/CommunityCards.test.tsx`, `PlayerSeatEmpty.test.tsx`, `BlindBadge.test.tsx`, `PlayerAvatar.test.tsx`).

### Notes
- L'API publique de `PlayerSeat` est inchangée : aucun changement requis dans `PokerTable.tsx`.
- Le calcul de positionnement (`useSeatPositioning`) et le moteur de jeu Convex sont intacts.
```

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 1B sièges + cartes communes"
```

---

## Critères de "Done" du Sprint 1B

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] Tests UI : ≥ 72 tests (56 Sprint 0+1A + 16+ nouveaux).
- [ ] L'API publique de `PlayerSeat` est inchangée → `PokerTable.tsx` n'est pas modifié.
- [ ] Animations push-to-pot, blinds, dealer button, timer, fold/all-in toujours fonctionnels (vérification visuelle).
- [ ] `CommunityCards` rendu correct en waiting / preflop / flop / turn / river / showdown.
- [ ] CHANGELOG mis à jour.

## Risques & mitigations

- **API contract `PlayerSeat`** : la signature reste identique (mêmes props). Si un consommateur casse, c'est un bug du refactor. Le typecheck l'attrapera.
- **Animations CSS** : les classes `avatar-active-pulse`, `chips-push-to-pot`, etc. sont définies dans `index.css` et ne sont pas touchées. Le composant `PlayerAvatar` réutilise le sélecteur existant.
- **Tests `data-card`** : si l'attribut `data-card` n'est pas propagé par `<Card>` legacy, utiliser le wrapper `<div data-card>` autour de chaque carte (mentionné dans Task 1.3).

---

## Hors scope (sera traité dans Sprint 1C ou plus tard)

- Refonte complète de `BetIndicator` / pile de jetons (resté inline dans PlayerSeat pour préserver les animations push-to-pot complexes).
- Refonte de `PlayerInfo` (nom + chips + lastAction) — peut être extrait au Sprint 1C si jugé utile.
- Refonte du dealer button (DEALER pastille style PokerStars, déjà bien géré par `responsiveClasses.dealerButton`).
- Réécriture des animations CSS (`index.css`).
- Layout panneau droit chat/historique sur desktop (Sprint 1C).
