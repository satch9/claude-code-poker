import React from 'react';
import { Trophy, Crown } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface TournamentScoreboardProps {
  table: any;
  players: any[];
  onBackToLobby?: () => void;
  className?: string;
}

// Affiché à la fin d'un tournoi (table.modules.tournament.status === "finished").
// Auparavant ce rendu était couplé dans ShowdownResults qui mélangeait deux
// responsabilités sans rapport (showdown de main + scoreboard tournoi).
export const TournamentScoreboard: React.FC<TournamentScoreboardProps> = ({
  table,
  players,
  onBackToLobby,
  className,
}) => {
  const tournament = table?.modules?.tournament;
  const finalRanking = tournament?.finalRanking;

  if (!Array.isArray(finalRanking) || finalRanking.length === 0) return null;

  const usersById: Record<string, any> = (players ?? []).reduce(
    (acc: Record<string, any>, p: any) => {
      if (p?.user?._id) acc[p.user._id] = p.user;
      if (p?.userId && p?.user) acc[p.userId] = p.user;
      return acc;
    },
    {},
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4',
        className,
      )}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-auto text-gray-900">
        <h2 className="text-2xl font-bold mb-4 text-center inline-flex items-center justify-center gap-2 w-full">
          <Trophy size={24} className="text-yellow-500" aria-hidden /> Tournoi terminé
        </h2>
        <ol className="space-y-2">
          {finalRanking.map((row: any) => {
            const user = usersById[row.userId];
            const name = row.playerName ?? user?.name ?? 'Joueur';
            const isWinner = row.position === 1;
            return (
              <li
                key={row.userId}
                className="flex justify-between border-b border-gray-200 pb-2"
              >
                <span
                  className={cn(
                    'font-medium inline-flex items-center gap-1',
                    isWinner && 'text-green-700',
                  )}
                >
                  #{row.position} · {name}
                  {isWinner && <Crown size={16} className="text-yellow-500" aria-hidden />}
                </span>
                {row.prize > 0 && (
                  <span className="text-green-700 font-bold">{row.prize} €</span>
                )}
              </li>
            );
          })}
        </ol>
        {onBackToLobby && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onBackToLobby}
              className="px-4 py-2 bg-poker-green-700 hover:bg-poker-green-600 text-white rounded-md font-medium transition-colors"
            >
              Retour au lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
