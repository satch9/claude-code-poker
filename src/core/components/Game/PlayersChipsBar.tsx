import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface PlayersChipsBarPlayer {
  userId: string;
  name: string;
  chips: number;
}

interface PlayersChipsBarProps {
  players: PlayersChipsBarPlayer[];
  className?: string;
}

// Bandeau horizontal compact affichant "Nom: chips" pour chaque joueur.
// Volontairement minimal : aucune info d'état de jeu (fold, all-in,
// éliminé…) car ces infos sont déjà visibles sur le tapis. Cf. mémoire
// utilisateur "PlayersChipsBar minimal".
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
          <span className="inline-flex items-baseline gap-1">
            <span className="truncate max-w-[8rem]">{p.name}</span>
            <span className="tabular-nums text-gold">
              {p.chips.toLocaleString('fr-FR')}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};
