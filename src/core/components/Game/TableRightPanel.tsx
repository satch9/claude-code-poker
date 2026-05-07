import React, { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { ActionFeed } from './ActionFeed';
import { ChatPanel } from './ChatPanel';
import { PlayersListPanel, type PlayerSummary } from './PlayersListPanel';

type TabId = 'chat' | 'historique' | 'joueurs';

export interface TableRightPanelProps {
  actions: unknown[];
  players: PlayerSummary[];
  className?: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'joueurs', label: 'Joueurs' },
  { id: 'historique', label: 'Historique' },
  { id: 'chat', label: 'Chat' },
];

// Contenu pur (tablist + contenu actif). Pas de wrapper <aside> ni de
// largeur imposée : le composant est destiné à être monté dans un Drawer
// (mobile / tablette / desktop unifié).
export const TableRightPanel: React.FC<TableRightPanelProps> = ({ actions, players, className }) => {
  const [active, setActive] = useState<TabId>('joueurs');

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div role="tablist" aria-label="Panneau de la table" className="flex border-b border-border-default -mx-4 px-4">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex-1 min-h-tap py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-2 pt-3">
        {active === 'joueurs' && <PlayersListPanel players={players} />}
        {active === 'historique' && <ActionFeed actions={actions as any} />}
        {active === 'chat' && <ChatPanel />}
      </div>
    </div>
  );
};
