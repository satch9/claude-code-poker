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
      <div className="flex gap-2 justify-center mb-4">
        {/* Show revealed cards */}
        {cardsToShow.map((cardStr, index) => (
          <Card
            key={index}
            card={parseCard(cardStr)}
            size="md"
            className="shadow-lg"
          />
        ))}
        
        {/* Show empty slots for unrevealed cards */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            size="md"
            className="opacity-30"
          />
        ))}
      </div>

      {/* Pot */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg">
        <div className="text-sm text-gray-600 mb-1">Pot</div>
        <div className="text-2xl font-bold text-gray-900">
          {pot.toLocaleString()}
        </div>
      </div>
    </div>
  );
};