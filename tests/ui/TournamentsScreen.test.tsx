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
    const running = baseTournament({ name: 'Tournoi En cours', status: 'playing' });
    mockUseQuery.mockReturnValue({ myTables: [], publicTables: [upcoming, running] });
    render(<TournamentsScreen onJoinTable={() => {}} />);
    expect(screen.getByText('Tournoi À venir')).toBeInTheDocument();
    expect(screen.queryByText('Tournoi En cours')).toBeNull();
  });

  it('switches to "En cours" tab and shows running tournaments', async () => {
    const upcoming = baseTournament({ name: 'Tournoi À venir', status: 'waiting' });
    const running = baseTournament({ name: 'Tournoi En cours', status: 'playing' });
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
