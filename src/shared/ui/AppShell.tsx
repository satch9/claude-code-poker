import React from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../constants/breakpoints';
import { TabBar, type TabItem } from './TabBar';
import { cn } from '../utils/cn';

export interface AppShellProps {
  title: string;
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  /** Action contextuelle dans le header (ex: bouton "Créer"). */
  headerAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  /** Bandeau persistant "table active" (mobile en haut, sidebar en desktop). */
  activeTableBanner?: React.ReactNode;
  /** Mode plein écran (table de jeu) : masque header + tabs. */
  fullscreen?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  tabs,
  activeTabId,
  onTabChange,
  headerAction,
  activeTableBanner,
  fullscreen = false,
  children,
}) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);

  if (fullscreen) {
    return <div className="min-h-screen bg-bg-base text-text-primary">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex">
      {isDesktop && (
        <TabBar items={tabs} activeId={activeTabId} onChange={onTabChange} variant="rail" />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={cn(
            'sticky top-0 z-20 bg-bg-surface border-b border-border-default safe-top',
            'flex items-center justify-between px-4 h-11',
          )}
        >
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {headerAction && (
            <button
              type="button"
              onClick={headerAction.onClick}
              className="min-h-tap min-w-tap inline-flex items-center justify-center text-accent font-medium"
            >
              {headerAction.icon && <span aria-hidden="true">{headerAction.icon}</span>}
              <span className={cn(headerAction.icon ? 'ml-1' : '')}>{headerAction.label}</span>
            </button>
          )}
        </header>

        {activeTableBanner && (
          <div className="bg-felt text-white px-4 py-2 text-sm">{activeTableBanner}</div>
        )}

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            // pb-14 matches TabBar bottom variant height (h-14 = 3.5rem) so content isn't covered.
            !isDesktop && 'pb-14',
          )}
        >
          {children}
        </main>

        {!isDesktop && (
          <TabBar items={tabs} activeId={activeTabId} onChange={onTabChange} variant="bottom" />
        )}
      </div>
    </div>
  );
};
