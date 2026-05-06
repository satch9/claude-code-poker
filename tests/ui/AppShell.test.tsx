import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from '../../src/shared/ui/AppShell';

const tabs = [
  { id: 'lobby', label: 'Lobby', icon: <span>🃏</span> },
  { id: 'profil', label: 'Profil', icon: <span>👤</span> },
];

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

describe('AppShell', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders title and children', () => {
    mockMatchMedia(false);
    render(
      <AppShell title="Lobby" tabs={tabs} activeTabId="lobby" onTabChange={() => {}}>
        <div>main content</div>
      </AppShell>,
    );
    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeInTheDocument();
    expect(screen.getByText('main content')).toBeInTheDocument();
  });

  it('renders bottom TabBar on mobile (< lg)', () => {
    mockMatchMedia(false);
    render(
      <AppShell title="t" tabs={tabs} activeTabId="lobby" onTabChange={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    const nav = screen.getByRole('tablist');
    expect(nav).toHaveClass('fixed');
    expect(nav).toHaveClass('bottom-0');
  });

  it('renders rail TabBar on desktop (>= lg)', () => {
    mockMatchMedia(true);
    render(
      <AppShell title="t" tabs={tabs} activeTabId="lobby" onTabChange={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByRole('tablist')).toHaveClass('flex-col');
  });

  it('hides chrome in fullscreen mode', () => {
    mockMatchMedia(false);
    render(
      <AppShell title="t" tabs={tabs} activeTabId="lobby" onTabChange={() => {}} fullscreen>
        <div>game</div>
      </AppShell>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('t')).toBeNull();
    expect(screen.getByText('game')).toBeInTheDocument();
  });

  it('renders headerAction button when provided', async () => {
    mockMatchMedia(false);
    const onAction = vi.fn();
    render(
      <AppShell
        title="Lobby"
        tabs={tabs}
        activeTabId="lobby"
        onTabChange={() => {}}
        headerAction={{ label: 'Créer', onClick: onAction }}
      >
        <div>x</div>
      </AppShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders activeTableBanner when provided', () => {
    mockMatchMedia(false);
    render(
      <AppShell
        title="t"
        tabs={tabs}
        activeTabId="lobby"
        onTabChange={() => {}}
        activeTableBanner={<div>Tu joues à Cash #12</div>}
      >
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByText('Tu joues à Cash #12')).toBeInTheDocument();
  });
});
