import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface PlayerSummary {
  userId: string;
  name: string;
  chips: number;
  isFolded: boolean;
  isAllIn: boolean;
  isCurrent: boolean;
}

export interface PlayersListPanelProps {
  players: PlayerSummary[];
  className?: string;
}

const initial = (name: string) => (name || 'Player').charAt(0).toUpperCase();

export const PlayersListPanel: React.FC<PlayersListPanelProps> = ({ players, className }) => {
  if (players.length === 0) {
    return (
      <div className={cn('p-4 text-center text-sm text-text-muted', className)}>
        Aucun joueur assis pour le moment.
      </div>
    );
  }

  return (
    <ul className={cn('flex flex-col gap-2 p-2', className)}>
      {players.map((p) => {
        let status: string | null = null;
        if (p.isFolded) status = 'Couché';
        else if (p.isAllIn) status = 'All-in';

        return (
          <li
            key={p.userId}
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 border transition-colors',
              'bg-bg-elevated border-border-default',
              p.isCurrent && 'border-accent ring-1 ring-accent',
              p.isFolded && 'opacity-50',
            )}
          >
            <div
              className="bg-blue-500 rounded-full flex items-center justify-center text-white font-bold w-9 h-9 text-sm"
              aria-hidden="true"
            >
              {initial(p.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
              <div className="text-xs text-text-muted">{p.chips.toLocaleString()} jetons</div>
            </div>
            {status && (
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  p.isAllIn && 'bg-sem-danger/20 text-sem-danger',
                  p.isFolded && 'bg-bg-surface text-text-muted',
                )}
              >
                {status}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
