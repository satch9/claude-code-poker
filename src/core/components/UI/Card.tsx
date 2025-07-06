import React from 'react';
import { cn } from '../../../shared/utils/cn';
import { Card as CardType } from '../../../shared/types';

interface PlayingCardProps {
  card?: CardType;
  isHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isHighlighted?: boolean;
  onClick?: () => void;
  className?: string;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isHidden = false,
  size = 'md',
  isHighlighted = false,
  onClick,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-12',
    md: 'w-12 h-16',
    lg: 'w-16 h-24',
  };

  const getSuitSymbol = (suit: CardType['suit']) => {
    const symbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    };
    return symbols[suit];
  };

  const getSuitColor = (suit: CardType['suit']) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';
  };

  if (isHidden) {
    return (
      <div
        className={cn(
          'bg-gradient-to-br from-blue-900 to-blue-800 border-2 border-blue-700 rounded-lg flex items-center justify-center shadow-lg cursor-pointer transform transition-transform hover:scale-105',
          sizeClasses[size],
          onClick && 'hover:shadow-xl',
          className
        )}
        onClick={onClick}
      >
        <div className="text-blue-300 text-xs font-bold transform rotate-45">
          ♠♥♣♦
        </div>
      </div>
    );
  }

  if (!card) {
    // Empty card slot
    return (
      <div
        className={cn(
          'border-2 border-dashed border-gray-300 rounded-lg bg-gray-50',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-white border-2 border-gray-300 rounded-lg shadow-lg flex flex-col justify-between p-1 cursor-pointer transform transition-all duration-200',
        sizeClasses[size],
        isHighlighted && 'ring-2 ring-poker-gold-500 border-poker-gold-500',
        onClick && 'hover:scale-105 hover:shadow-xl',
        className
      )}
      onClick={onClick}
    >
      {/* Top-left corner */}
      <div className={cn('text-xs font-bold leading-none', getSuitColor(card.suit))}>
        <div>{card.rank}</div>
        <div className="-mt-1">{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Center symbol */}
      <div className={cn('text-lg text-center', getSuitColor(card.suit))}>
        {getSuitSymbol(card.suit)}
      </div>

      {/* Bottom-right corner (upside down) */}
      <div className={cn('text-xs font-bold leading-none transform rotate-180 self-end', getSuitColor(card.suit))}>
        <div>{card.rank}</div>
        <div className="-mt-1">{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  );
};

export { PlayingCard as Card };