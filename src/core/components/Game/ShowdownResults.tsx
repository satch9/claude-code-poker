import React from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { cn } from '../../../shared/utils/cn';

interface ShowdownResult {
  player: {
    userId: string;
    user?: {
      name: string;
    };
    chips: number;
  };
  handRank: {
    name: string;
    rank: number;
  };
  cards: string[];
}

interface ShowdownResultsProps {
  results: ShowdownResult[];
  pot: number;
  communityCards: string[];
  onContinue: () => void;
  className?: string;
}

export const ShowdownResults: React.FC<ShowdownResultsProps> = ({
  results,
  pot,
  communityCards,
  onContinue,
  className,
}) => {
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

  const winners = results.filter(r => r.handRank.rank === results[0].handRank.rank);
  const winnerNames = winners.map(w => w.player.user?.name || 'Joueur').join(', ');
  const winningsPerPlayer = Math.floor(pot / winners.length);

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
      className
    )}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 Résultats du Showdown
          </h2>
          <p className="text-gray-600">
            {winners.length === 1 ? 
              `${winnerNames} remporte ${pot.toLocaleString()} jetons !` :
              `${winnerNames} se partagent ${pot.toLocaleString()} jetons (${winningsPerPlayer.toLocaleString()} chacun)`
            }
          </p>
        </div>

        {/* Community Cards */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
            Cartes communes
          </h3>
          <div className="flex gap-2 justify-center">
            {communityCards.map((cardStr, index) => (
              <Card
                key={index}
                card={parseCard(cardStr)}
                size="md"
                className="shadow-lg"
              />
            ))}
          </div>
        </div>

        {/* Player Results */}
        <div className="space-y-4 mb-6">
          {results.map((result, index) => {
            const isWinner = result.handRank.rank === results[0].handRank.rank;
            
            return (
              <div
                key={result.player.userId}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border-2',
                  isWinner 
                    ? 'bg-green-50 border-green-200 shadow-md' 
                    : 'bg-gray-50 border-gray-200'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
                    isWinner ? 'bg-green-500' : 'bg-gray-500'
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {result.player.user?.name || 'Joueur'}
                      {isWinner && ' 👑'}
                    </div>
                    <div className={cn(
                      'text-sm font-medium',
                      isWinner ? 'text-green-600' : 'text-gray-600'
                    )}>
                      {result.handRank.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
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

        {/* Continue Button */}
        <div className="text-center">
          <Button
            onClick={onContinue}
            variant="primary"
            size="lg"
            className="px-8"
          >
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
};