import React, { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { ActionFeed } from './ActionFeed';
import { ChatPanel } from './ChatPanel';
import { PlayersListPanel, type PlayerSummary } from './PlayersListPanel';
import { useTableChat } from '../../hooks/useTableChat';
import { Id } from '../../../../convex/_generated/dataModel';

type TabId = 'chat' | 'historique' | 'joueurs';

export interface TableRightPanelProps {
  actions: unknown[];
  players: PlayerSummary[];
  tableId: Id<'tables'>;
  currentUserId: Id<'users'> | null;
  isSeated: boolean;
  className?: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'joueurs', label: 'Joueurs' },
  { id: 'historique', label: 'Historique' },
  { id: 'chat', label: 'Chat' },
];

export const TableRightPanel: React.FC<TableRightPanelProps> = ({
  actions,
  players,
  tableId,
  currentUserId,
  isSeated,
  className,
}) => {
  const [active, setActive] = useState<TabId>('joueurs');
  const { unreadCount } = useTableChat(tableId);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div role="tablist" aria-label="Panneau de la table" className="flex border-b border-border-default -mx-4 px-4">
        {TABS.map((t) => {
          const isActive = active === t.id;
          const showBadge = t.id === 'chat' && !isActive && unreadCount > 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex-1 min-h-tap py-2 text-sm font-medium transition-colors relative inline-flex items-center justify-center gap-1.5',
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <span>{t.label}</span>
              {showBadge && (
                <span
                  aria-label={`${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`}
                  className="inline-flex items-center justify-center text-[10px] font-bold bg-accent text-white rounded-full min-w-[18px] h-[18px] px-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-2 pt-3">
        {active === 'joueurs' && <PlayersListPanel players={players} />}
        {active === 'historique' && <ActionFeed actions={actions as any} />}
        {active === 'chat' && (
          <ChatPanel
            tableId={tableId}
            currentUserId={currentUserId}
            isSeated={isSeated}
            isActive
          />
        )}
      </div>
    </div>
  );
};
