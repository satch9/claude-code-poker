import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface PlayersChipsBarPlayer {
  userId: string;
  name: string;
  chips: number;
  isFolded?: boolean;
  isAllIn?: boolean;
  eliminated?: boolean;
  isCurrent?: boolean;
}

interface PlayersChipsBarProps {
  players: PlayersChipsBarPlayer[];
  className?: string;
}

// Bandeau horizontal compact affichant "Nom: chips" pour chaque joueur.
// Placé en haut d'écran pour décharger les avatars sur le tapis.
export const PlayersChipsBar: React.FC<PlayersChipsBarProps> = ({ players, className }) => {
  if (players.length === 0) return null;
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto whitespace-nowrap px-2 py-1 text-xs text-poker-green-100 bg-black/30 border-b border-poker-green-700/60',
        className,
      )}
    >
      {players.map((p, idx) => (
        <React.Fragment key={p.userId}>
          {idx > 0 && <span className="text-poker-green-400/60">·</span>}
          <span
            className={cn(
              'inline-flex items-baseline gap-1',
              p.eliminated && 'line-through text-poker-green-400/50',
              p.isFolded && !p.eliminated && 'opacity-60',
              p.isCurrent && 'font-semibold text-white',
            )}
          >
            <span className="truncate max-w-[8rem]">{p.name}</span>
            <span className="tabular-nums text-gold">
              {p.chips.toLocaleString('fr-FR')}
            </span>
            {p.isAllIn && (
              <span className="ml-0.5 px-1 rounded bg-red-600 text-white text-[10px] font-bold">
                AI
              </span>
            )}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};
