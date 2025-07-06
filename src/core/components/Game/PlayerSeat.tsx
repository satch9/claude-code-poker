import React from 'react';
import { Card } from '../UI/Card';
import { ChipStack } from '../UI/Chip';
import { Player } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';

interface PlayerSeatProps {
  player?: Player;
  position: number;
  isDealer?: boolean;
  isCurrentPlayer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  showCards?: boolean;
  isEmpty?: boolean;
  onSeatClick?: () => void;
  className?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  position,
  isDealer = false,
  isCurrentPlayer = false,
  isSmallBlind = false,
  isBigBlind = false,
  showCards = false,
  isEmpty = false,
  onSeatClick,
  className,
}) => {
  if (isEmpty) {
    return (
      <div 
        className={cn(
          'w-32 h-24 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center bg-poker-green-100 hover:bg-poker-green-200 cursor-pointer transition-colors',
          className
        )}
        onClick={onSeatClick}
      >
        <div className="text-center text-gray-600">
          <div className="text-sm font-medium">Siège {position + 1}</div>
          <div className="text-xs">Cliquez pour rejoindre</div>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const chipStack = [
    { value: 1000, count: Math.floor(player.chips / 1000) },
    { value: 100, count: Math.floor((player.chips % 1000) / 100) },
    { value: 25, count: Math.floor((player.chips % 100) / 25) },
    { value: 5, count: Math.floor((player.chips % 25) / 5) },
  ].filter(chip => chip.count > 0);

  return (
    <div 
      className={cn(
        'relative bg-white rounded-lg shadow-lg p-3 transition-all duration-200',
        isCurrentPlayer && 'ring-2 ring-poker-gold-500 shadow-xl',
        player.isFolded && 'opacity-50',
        className
      )}
    >
      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-poker-gold-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          D
        </div>
      )}

      {/* Blind indicators */}
      {(isSmallBlind || isBigBlind) && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          {isSmallBlind ? 'SB' : 'BB'}
        </div>
      )}

      {/* Player info */}
      <div className="text-center mb-2">
        <div className="w-10 h-10 bg-poker-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-1">
          {(player.user?.name || 'Player').charAt(0).toUpperCase()}
        </div>
        <div className="text-sm font-medium text-gray-900 truncate">
          {player.user?.name || 'Player'}
        </div>
        <div className="text-xs text-gray-500">
          {player.chips.toLocaleString()} chips
        </div>
      </div>

      {/* Cards */}
      <div className="flex gap-1 justify-center mb-2">
        {player.cards.length > 0 ? (
          player.cards.map((cardStr, index) => (
            <Card
              key={index}
              card={showCards ? parseCard(cardStr) : undefined}
              isHidden={!showCards}
              size="sm"
            />
          ))
        ) : (
          <>
            <Card size="sm" />
            <Card size="sm" />
          </>
        )}
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Mise</div>
          <ChipStack 
            chips={[{ value: player.currentBet, count: 1 }]}
            size="sm"
          />
        </div>
      )}

      {/* Last action */}
      {player.lastAction && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getActionColor(player.lastAction)
          )}>
            {getActionLabel(player.lastAction)}
          </span>
        </div>
      )}

      {/* All-in indicator */}
      {player.isAllIn && (
        <div className="absolute top-0 left-0 w-full h-full bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
          <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
            ALL-IN
          </span>
        </div>
      )}
    </div>
  );
};

// Utility functions
function parseCard(cardStr: string) {
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
}

function getActionColor(action: string) {
  switch (action) {
    case 'fold':
      return 'bg-red-100 text-red-800';
    case 'check':
      return 'bg-gray-100 text-gray-800';
    case 'call':
      return 'bg-blue-100 text-blue-800';
    case 'raise':
      return 'bg-green-100 text-green-800';
    case 'all-in':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case 'fold':
      return 'FOLD';
    case 'check':
      return 'CHECK';
    case 'call':
      return 'CALL';
    case 'raise':
      return 'RAISE';
    case 'all-in':
      return 'ALL-IN';
    default:
      return action.toUpperCase();
  }
}