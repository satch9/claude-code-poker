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

  it('renders a button-like clickable region with accessible name', () => {
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
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

  it('renders only an icon (no visible text labels) to save space on the felt', () => {
    render(<PlayerSeatEmpty onClick={() => {}} />);
    // No "Libre", "Siège libre", "Rejoindre", "Cliquez pour rejoindre"
    expect(screen.queryByText(/libre|rejoindre|cliquez/i)).toBeNull();
    // But the icon (svg) is present
    expect(screen.getByRole('button').querySelector('svg')).toBeTruthy();
  });

  it('uses a smaller compact size on mobile', () => {
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByRole('button').className).toMatch(/w-11/);
  });

  it('uses a larger size on desktop', () => {
    mockMatchMedia(true);
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByRole('button').className).toMatch(/w-14/);
  });
});
