import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BettingControls } from '../../src/core/components/Game/BettingControls';

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

const baseProps = {
  availableActions: [
    { action: 'fold' as const },
    { action: 'check' as const },
  ],
  playerChips: 1000,
  currentBet: 0,
  potSize: 100,
  onAction: () => {},
};

describe('BettingControls — render', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false); // mobile par défaut
  });

  it('renders fold and check buttons when available', () => {
    render(<BettingControls {...baseProps} />);
    expect(screen.getByRole('button', { name: /fold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
  });

  it('does not render check when not available', () => {
    render(<BettingControls {...baseProps} availableActions={[{ action: 'fold' }]} />);
    expect(screen.queryByRole('button', { name: /check/i })).toBeNull();
  });

  it('triggers fold onAction with correct payload', async () => {
    const onAction = vi.fn();
    render(<BettingControls {...baseProps} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /fold/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'fold' });
  });

  it('triggers check onAction with correct payload', async () => {
    const onAction = vi.fn();
    render(<BettingControls {...baseProps} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'check' });
  });

  it('renders Call X with the call amount', () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'fold' },
          { action: 'call', amount: 40 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /call 40/i })).toBeInTheDocument();
  });

  it('triggers call onAction with amount', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        onAction={onAction}
        availableActions={[{ action: 'call', amount: 40 }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /call 40/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'call', amount: 40 });
  });

  it('renders All-in with amount and triggers correctly', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        onAction={onAction}
        availableActions={[{ action: 'all-in', amount: 1000 }]}
      />,
    );
    const btn = screen.getByRole('button', { name: /all-in/i });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onAction).toHaveBeenCalledWith({ action: 'all-in', amount: 1000 });
  });
});
