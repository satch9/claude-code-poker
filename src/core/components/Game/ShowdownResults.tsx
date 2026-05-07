import React from 'react';
import { Trophy, Crown, PartyPopper } from 'lucide-react';
import { Card } from '../UI/Card';
import { cn } from '../../../shared/utils/cn';

interface ShowdownResult {
  userId: string;
  playerName: string;
  seatPosition: number;
  handRank: {
    name: string;
    rank: number;
  };
  cards: string[];
  isWinner?: boolean;
}

interface ShowdownResultsProps {
  results: ShowdownResult[];
  pot: number;
  communityCards: string[];
  className?: string;
  table?: any;
  players?: any[];
  onBackToLobby?: () => void;
}

export const ShowdownResults: React.FC<ShowdownResultsProps> = ({
  results,
  pot,
  communityCards,
  className,
  table,
  players,
  onBackToLobby,
}) => {
  // Tournament final ranking takes priority over hand result
  const tournament = table?.modules?.tournament;
  const finalRanking = tournament?.finalRanking;
  if (
    table?.gameType === "tournament" &&
    tournament?.status === "finished" &&
    Array.isArray(finalRanking) &&
    finalRanking.length > 0
  ) {
    const usersById: Record<string, any> = (players ?? []).reduce(
      (acc: Record<string, any>, p: any) => {
        if (p?.user?._id) acc[p.user._id] = p.user;
        if (p?.userId && p?.user) acc[p.userId] = p.user;
        return acc;
      },
      {}
    );
    return (
      <div className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4',
        className
      )}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-auto text-gray-900">
          <h2 className="text-2xl font-bold mb-4 text-center inline-flex items-center justify-center gap-2 w-full">
            <Trophy size={24} className="text-yellow-500" aria-hidden /> Tournoi terminé
          </h2>
          <ol className="space-y-2">
            {finalRanking.map((row: any) => {
              const user = usersById[row.userId];
              // Priorité au nom figé dans finalRanking (rempli par endTournament),
              // fallback sur les players actifs (pour anciennes données).
              const name = row.playerName ?? user?.name ?? 'Joueur';
              const isWinner = row.position === 1;
              return (
                <li key={row.userId} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className={cn('font-medium inline-flex items-center gap-1', isWinner && 'text-green-700')}>
                    #{row.position} · {name}
                    {isWinner && <Crown size={16} className="text-yellow-500" aria-hidden />}
                  </span>
                  {row.prize > 0 && (
                    <span className="text-green-700 font-bold">
                      {row.prize} €
                    </span>
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
  }

  const parseCard = (cardStr: string) => {
    if (!cardStr || cardStr.length < 2) return undefined;

    const rank = cardStr.slice(0, -1) as any;
    const suitChar = cardStr.slice(-1);

    const suitMap: Record<string, any> = {
      'h': 'hearts',
      'd': 'diamonds',
      'c': 'clubs',
      's': 'spades',
    };

    return {
      rank,
      suit: suitMap[suitChar.toLowerCase()],
    };
  };

  // Use the isWinner flag computed server-side via determineWinners (kickers-aware).
  // Fallback on rank match only if isWinner is undefined (older payloads).
  const winners = results.some(r => r.isWinner !== undefined)
    ? results.filter(r => r.isWinner)
    : results.filter(r => r.handRank.rank === results[0].handRank.rank);
  const winnerNames = winners.map(w => w.playerName || 'Joueur').join(', ');
  const winningsPerPlayer = winners.length > 0 ? Math.floor(pot / winners.length) : 0;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4',
      className
    )}>
      <div className="bg-white rounded-2xl p-3 sm:p-6 shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[95vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 inline-flex items-center justify-center gap-2 w-full">
            <PartyPopper size={22} className="text-yellow-500" aria-hidden /> Résultats du Showdown
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {winners.length === 1 ?
              `${winnerNames} remporte ${pot.toLocaleString()} jetons !` :
              `${winnerNames} se partagent ${pot.toLocaleString()} jetons (${winningsPerPlayer.toLocaleString()} chacun)`
            }
          </p>
        </div>

        {/* Community Cards */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 text-center">
            Cartes communes
          </h3>
          <div className="flex gap-1 sm:gap-2 justify-center">
            {communityCards.map((cardStr, index) => (
              <Card
                key={index}
                card={parseCard(cardStr)}
                size="sm"
                className="shadow-lg"
              />
            ))}
          </div>
        </div>

        {/* Player Results */}
        <div className="space-y-4 mb-6">
          {results.map((result, index) => {
            const isWinner = result.isWinner ?? (result.handRank.rank === results[0].handRank.rank);

            return (
              <div
                key={result.userId}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg border-2',
                  isWinner
                    ? 'bg-green-50 border-green-200 shadow-md'
                    : 'bg-gray-50 border-gray-200'
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                    isWinner ? 'bg-green-500' : 'bg-gray-500'
                  )}>
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate inline-flex items-center gap-1">
                      {result.playerName || 'Joueur'}
                      {isWinner && <Crown size={14} className="text-yellow-500" aria-hidden />}
                    </div>
                    <div className={cn(
                      'text-sm font-medium',
                      isWinner ? 'text-green-600' : 'text-gray-600'
                    )}>
                      {result.handRank.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:gap-4 sm:justify-end">
                  {/* Player Cards */}
                  <div className="flex gap-1">
                    {result.cards.map((cardStr, cardIndex) => (
                      <Card
                        key={cardIndex}
                        card={parseCard(cardStr)}
                        size="sm"
                        className="shadow-sm"
                      />
                    ))}
                  </div>

                  {/* Winnings */}
                  {isWinner && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        +{winningsPerPlayer.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">jetons</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Auto-continue : la main suivante démarre via scheduler 3s (B5.1) */}
        <div className="text-center text-sm text-gray-500">
          Prochaine main dans quelques secondes…
        </div>
      </div>
    </div>
  );
};