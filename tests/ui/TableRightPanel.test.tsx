import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableRightPanel } from '../../src/core/components/Game/TableRightPanel';

let mockReturn: any = {
  messages: [],
  isLoading: false,
  unreadCount: 0,
  markRead: vi.fn(),
  send: vi.fn(),
  sending: false,
};

vi.mock('../../src/core/hooks/useTableChat', () => ({
  useTableChat: () => mockReturn,
}));

const players = [
  { userId: 'u1', name: 'Alice', chips: 1500, isFolded: false, isAllIn: false, isCurrent: true },
];

const baseProps = {
  actions: [],
  players,
  tableId: 't1' as any,
  currentUserId: 'u1' as any,
  isSeated: true,
};

beforeEach(() => {
  mockReturn = {
    messages: [],
    isLoading: false,
    unreadCount: 0,
    markRead: vi.fn(),
    send: vi.fn(),
    sending: false,
  };
});

describe('TableRightPanel', () => {
  it('renders three tab buttons', () => {
    render(<TableRightPanel {...baseProps} />);
    expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /historique/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /joueurs/i })).toBeInTheDocument();
  });

  it('opens on the players tab by default', () => {
    render(<TableRightPanel {...baseProps} />);
    expect(screen.getByRole('tab', { name: /joueurs/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('switches to chat tab on click', async () => {
    render(<TableRightPanel {...baseProps} />);
    await userEvent.click(screen.getByRole('tab', { name: /chat/i }));
    expect(screen.getByRole('tab', { name: /chat/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to historique tab on click', async () => {
    render(<TableRightPanel {...baseProps} />);
    await userEvent.click(screen.getByRole('tab', { name: /historique/i }));
    expect(screen.getByRole('tab', { name: /historique/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an unread badge on the chat tab when unreadCount > 0 and tab not active', () => {
    mockReturn.unreadCount = 3;
    render(<TableRightPanel {...baseProps} />);
    const badge = screen.getByLabelText(/3 messages? non lus/i);
    expect(badge).toBeInTheDocument();
  });

  it('hides the badge when chat tab is active', async () => {
    mockReturn.unreadCount = 3;
    render(<TableRightPanel {...baseProps} />);
    await userEvent.click(screen.getByRole('tab', { name: /chat/i }));
    expect(screen.queryByLabelText(/messages? non lus/i)).toBeNull();
  });
});
