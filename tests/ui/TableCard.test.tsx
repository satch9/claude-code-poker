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
