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
    expect(screen.getByText(/1[  ,. ]?500/)).toBeInTheDocument();
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
