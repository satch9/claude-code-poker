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
    // Mobile shows the short title "Libre" (not "Siège libre")
    expect(screen.getByText('Libre')).toBeInTheDocument();
    expect(screen.queryByText('Siège libre')).toBeNull();
  });

  it('shows full label on desktop', () => {
    mockMatchMedia(true);
    render(<PlayerSeatEmpty onClick={() => {}} />);
    expect(screen.getByText(/siège libre/i)).toBeInTheDocument();
  });
});
