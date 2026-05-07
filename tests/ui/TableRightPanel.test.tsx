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
