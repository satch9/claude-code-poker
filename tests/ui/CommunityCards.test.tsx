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
    expect(screen.getByText(/2[.,]?4K|2400|2 400/i)).toBeInTheDocument();
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
