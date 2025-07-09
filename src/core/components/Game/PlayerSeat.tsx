import React from 'react';
import { Card } from '../UI/Card';
import { ChipStack } from '../UI/Chip';
import { Player } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';
import { PlayerTimer } from './PlayerTimer';

interface PlayerSeatProps {
  player?: Player;
  position: number;
  isDealer?: boolean;
  isCurrentPlayer?: boolean;
  isActivePlayer?: boolean; // C'est au tour de ce joueur de jouer
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  showCards?: boolean;
  isEmpty?: boolean;
  onSeatClick?: () => void;
  onTimeOut?: () => void;
  timeLimit?: number;
  className?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  position,
  isDealer = false,
  isCurrentPlayer = false,
  isActivePlayer = false,
  isSmallBlind = false,
  isBigBlind = false,
  smallBlindAmount = 0,
  bigBlindAmount = 0,
  showCards = false,
  isEmpty = false,
  onSeatClick,
  onTimeOut,
  timeLimit = 30,
  className,
}) => {
  if (isEmpty) {
    return (
      <div 
        className={cn(
          'bg-gray-700/50 border-2 border-dashed border-gray-500 rounded-2xl p-3 hover:bg-gray-600/50 cursor-pointer transition-all duration-200 backdrop-blur-sm',
          className
        )}
        onClick={onSeatClick}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="text-sm font-medium text-gray-300">Siège libre</div>
          <div className="text-xs text-gray-400">Cliquez pour rejoindre</div>
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
        'relative bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 transition-all duration-200 shadow-xl w-52 h-16',
        isCurrentPlayer && 'ring-2 ring-yellow-400 shadow-2xl',
        isActivePlayer && 'ring-4 ring-green-400 animate-pulse shadow-green-400/50',
        player.isFolded && 'opacity-50',
        className
      )}
    >
      {/* Dealer button removed - now handled separately on the table */}

      {/* Blind indicators */}
      {(isSmallBlind || isBigBlind) && (
        <div className="absolute -top-2 -left-2 min-w-[24px] h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg px-1">
          {isSmallBlind ? `SB ${smallBlindAmount}` : `BB ${bigBlindAmount}`}
        </div>
      )}

      {/* Horizontal layout */}
      <div className="flex items-center gap-3 h-full">
        {/* Player avatar and info */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {(player.user?.name || 'Player').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {player.user?.name || 'Player'}
            </div>
            <div className="text-xs text-green-400 font-bold">
              {player.chips.toLocaleString()}
            </div>
            {player.lastAction && (
              <div className="text-xs text-gray-300 font-medium">
                {getActionLabel(player.lastAction)}
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="flex gap-1">
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
      </div>

      {/* Current bet indicator */}
      {player.currentBet > 0 && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
            {player.currentBet.toLocaleString()}
          </div>
        </div>
      )}


      {/* All-in indicator */}
      {player.isAllIn && (
        <div className="absolute inset-0 bg-red-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
            ALL-IN
          </span>
        </div>
      )}

      {/* Player timer */}
      {isActivePlayer && onTimeOut && (
        <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
          <PlayerTimer
            isActive={isActivePlayer}
            timeLimit={timeLimit}
            onTimeOut={onTimeOut}
          />
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