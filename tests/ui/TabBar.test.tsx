import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TabBar } from '../../src/shared/ui/TabBar';

const items = [
  { id: 'lobby', label: 'Lobby', icon: <span aria-hidden>🃏</span> },
  { id: 'tournois', label: 'Tournois', icon: <span aria-hidden>🏆</span> },
  { id: 'stats', label: 'Stats', icon: <span aria-hidden>📊</span> },
  { id: 'profil', label: 'Profil', icon: <span aria-hidden>👤</span> },
];

describe('TabBar', () => {
  it('renders all items', () => {
    render(<TabBar items={items} activeId="lobby" onChange={() => {}} variant="bottom" />);
    items.forEach((it) => {
      expect(screen.getByRole('tab', { name: it.label })).toBeInTheDocument();
    });
  });

  it('marks the active item', () => {
    render(<TabBar items={items} activeId="stats" onChange={() => {}} variant="bottom" />);
    expect(screen.getByRole('tab', { name: 'Stats' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Lobby' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when an item is clicked', async () => {
    const onChange = vi.fn();
    render(<TabBar items={items} activeId="lobby" onChange={onChange} variant="bottom" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tournois' }));
    expect(onChange).toHaveBeenCalledWith('tournois');
  });

  it('renders as bottom bar by default styling', () => {
    const { container } = render(
      <TabBar items={items} activeId="lobby" onChange={() => {}} variant="bottom" />,
    );
    expect(container.firstChild).toHaveClass('fixed');
    expect(container.firstChild).toHaveClass('bottom-0');
  });

  it('renders as sidebar in rail variant', () => {
    const { container } = render(
      <TabBar items={items} activeId="lobby" onChange={() => {}} variant="rail" />,
    );
    expect(container.firstChild).toHaveClass('flex-col');
  });
});
