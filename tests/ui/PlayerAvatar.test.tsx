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
