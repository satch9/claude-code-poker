import React from 'react';
import { Card } from '../UI/Card';
import { cn } from '../../../shared/utils/cn';

interface CommunityCardsProps {
  cards: string[];
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  className?: string;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  phase,
  pot,
  className,
}) => {
  // Parse card strings to Card objects
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

  const getPhaseLabel = () => {
    switch (phase) {
      case 'waiting':
        return 'En attente de joueurs';
      case 'preflop':
        return 'Pre-flop';
      case 'flop':
        return 'Flop';
      case 'turn':
        return 'Turn';
      case 'river':
        return 'River';
      case 'showdown':
        return 'Showdown';
      default:
        return '';
    }
  };

  // Determine how many cards to show based on phase
  const getCardsToShow = () => {
    switch (phase) {
      case 'waiting':
      case 'preflop':
        return [];
      case 'flop':
        return cards.slice(0, 3);
      case 'turn':
        return cards.slice(0, 4);
      case 'river':
      case 'showdown':
        return cards.slice(0, 5);
      default:
        return [];
    }
  };

  const cardsToShow = getCardsToShow();
  const emptySlots = 5 - cardsToShow.length;

  return (
    <div className={cn('text-center', className)}>
      {/* Phase indicator */}
      <div className="mb-4">
        <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm">
          {getPhaseLabel()}
        </span>
      </div>

      {/* Community cards */}
      <div className="flex gap-3 justify-center mb-4">
        {/* Show revealed cards with animations */}
        {cardsToShow.map((cardStr, index) => (
          <Card
            key={index}
            card={parseCard(cardStr)}
            size="md"
            animation="deal"
            animationDelay={index * 300}
            className="shadow-xl transform hover:scale-105 transition-transform duration-200"
          />
        ))}
        
        {/* Show empty slots for unrevealed cards */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            size="md"
            className="opacity-20 border-dashed"
          />
        ))}
      </div>

      {/* Pot with enhanced styling */}
      <div className="relative">
        <div className={cn(
          "bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl px-6 py-3 shadow-lg border-2 border-amber-200",
          pot > 0 && "border-amber-400"
        )}>
          {/* Pot label */}
          <div className="flex items-center justify-center mb-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">POT TOTAL</span>
          </div>
          
          {/* Pot amount */}
          <div className={cn(
            "text-xl font-bold text-center",
            pot > 0 ? "text-green-600" : "text-gray-500"
          )}>
            {pot > 0 ? pot.toLocaleString() : '0'}
          </div>
          
          {/* Pot glow effect when there's money */}
          {pot > 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-yellow-100/50 rounded-xl -z-10 blur-sm"></div>
          )}
        </div>
      </div>
    </div>
  );
};