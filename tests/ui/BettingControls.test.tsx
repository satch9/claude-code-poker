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

describe('BettingControls — Raise (mobile)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false); // mobile
  });

  it('shows Raise button when raise action is available', () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'fold' },
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /^raise$/i })).toBeInTheDocument();
  });

  it('opens BottomSheet when Raise is clicked', async () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    expect(screen.getByRole('dialog', { name: /relance|raise/i })).toBeInTheDocument();
  });

  it('closes BottomSheet on Cancel', async () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows raise amount input initialized to minAmount', async () => {
    render(
      <BettingControls
        {...baseProps}
        availableActions={[
          { action: 'raise', minAmount: 50, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    const input = screen.getByRole('spinbutton', { name: /montant/i }) as HTMLInputElement;
    expect(input.value).toBe('50');
  });

  it('shows preset buttons inside BottomSheet', async () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={100}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    expect(screen.getByRole('button', { name: /^min$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /½ pot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pot$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all-in/i })).toBeInTheDocument();
  });

  it('preset Pot sets amount to potSize', async () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={120}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    const input = screen.getByRole('spinbutton', { name: /montant/i }) as HTMLInputElement;
    expect(input.value).toBe('120');
  });

  it('preset clamps to maxAmount when > max', async () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={2000}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    const input = screen.getByRole('spinbutton', { name: /montant/i }) as HTMLInputElement;
    expect(input.value).toBe('1000');
  });

  it('confirms raise: calls onAction with chosen amount and closes sheet', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        potSize={120}
        onAction={onAction}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^raise$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    await userEvent.click(screen.getByRole('button', { name: /relancer à 120/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'raise', amount: 120 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('BettingControls — Desktop (inline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(true); // desktop
  });

  it('shows inline raise slider on desktop without opening sheet', () => {
    render(
      <BettingControls
        {...baseProps}
        potSize={100}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    // Raise button should NOT be present on desktop (slider is inline)
    expect(screen.queryByRole('button', { name: /^raise$/i })).toBeNull();
    // Slider and presets are visible without any click
    expect(screen.getByRole('slider', { name: /relance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pot$/i })).toBeInTheDocument();
    // No dialog
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirms raise inline on desktop', async () => {
    const onAction = vi.fn();
    render(
      <BettingControls
        {...baseProps}
        potSize={100}
        onAction={onAction}
        availableActions={[
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^pot$/i }));
    await userEvent.click(screen.getByRole('button', { name: /relancer à 100/i }));
    expect(onAction).toHaveBeenCalledWith({ action: 'raise', amount: 100 });
  });
});

describe('BettingControls — info badges', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('renders pot odds when provided', () => {
    render(<BettingControls {...baseProps} potOdds="2.5:1" />);
    expect(screen.getByText(/2\.5:1/)).toBeInTheDocument();
  });

  it('renders hand strength when provided', () => {
    render(<BettingControls {...baseProps} handStrength="Strong" />);
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('does not render badges when props are missing', () => {
    render(<BettingControls {...baseProps} />);
    expect(screen.queryByText(/odds/i)).toBeNull();
    expect(screen.queryByText(/hand:/i)).toBeNull();
  });
});

describe('BettingControls — disabled', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it('disables all action buttons when disabled is true', () => {
    render(
      <BettingControls
        {...baseProps}
        disabled
        availableActions={[
          { action: 'fold' },
          { action: 'call', amount: 40 },
          { action: 'raise', minAmount: 20, maxAmount: 1000 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /fold/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /call/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^raise$/i })).toBeDisabled();
  });
});
