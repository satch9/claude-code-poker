import React from 'react';
import { cn } from '../../../shared/utils/cn';
import { Card as CardType } from '../../../shared/types';

interface PlayingCardProps {
  card?: CardType;
  isHidden?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isHighlighted?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'elegant' | 'minimal';
  animation?: 'none' | 'flip' | 'slide' | 'deal' | 'highlight' | 'shake';
  animationDelay?: number;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isHidden = false,
  size = 'md',
  isHighlighted = false,
  onClick,
  className,
  variant = 'default',
  animation = 'none',
  animationDelay = 0,
}) => {
  const sizeClasses = {
    xs: 'w-8 h-12 aspect-[2/3]',
    sm: 'w-12 h-18 aspect-[2/3]',
    md: 'w-16 h-24 aspect-[2/3]',
    lg: 'w-20 h-30 aspect-[2/3]',
    xl: 'w-24 h-36 aspect-[2/3]',
  };

  const fontSizes = {
    xs: { rank: 'text-xs', symbol: 'text-xs', center: 'text-xs' },
    sm: { rank: 'text-sm', symbol: 'text-sm', center: 'text-sm' },
    md: { rank: 'text-base', symbol: 'text-base', center: 'text-lg' },
    lg: { rank: 'text-lg', symbol: 'text-lg', center: 'text-xl' },
    xl: { rank: 'text-xl', symbol: 'text-xl', center: 'text-2xl' },
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
    const colors = {
      hearts: 'text-red-500',
      diamonds: 'text-red-500',
      clubs: 'text-gray-800',
      spades: 'text-gray-800',
    };
    return colors[suit];
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'elegant':
        return 'bg-gradient-to-b from-white to-gray-50 border-gray-400 shadow-xl';
      case 'minimal':
        return 'bg-white border-gray-300 shadow-md';
      default:
        return 'bg-white border-gray-300 shadow-lg';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'flip':
        return 'card-flip';
      case 'slide':
        return 'card-slide';
      case 'deal':
        return 'card-deal';
      case 'highlight':
        return 'card-highlight';
      case 'shake':
        return 'card-shake';
      default:
        return '';
    }
  };

  const animationStyle = animationDelay > 0 
    ? { animationDelay: `${animationDelay}ms` } 
    : undefined;

  if (isHidden) {
    return (
      <div
        className={cn(
          'bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 border-2 border-indigo-700 rounded-xl flex items-center justify-center shadow-2xl cursor-pointer transform transition-all duration-300',
          sizeClasses[size],
          onClick && 'hover:scale-105 hover:shadow-3xl hover:border-indigo-500',
          'relative overflow-hidden',
          getAnimationClasses(),
          className
        )}
        onClick={onClick}
        style={animationStyle}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        {/* Card back pattern */}
        <div className="relative z-10 text-indigo-300 font-bold transform rotate-12 opacity-80">
          <div className={cn('grid grid-cols-2 gap-0.5', fontSizes[size].center)}>
            <span>♠</span><span>♥</span>
            <span>♣</span><span>♦</span>
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div
        className={cn(
          'border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 backdrop-blur-sm',
          sizeClasses[size],
          'transition-all duration-200 hover:border-gray-400 hover:bg-gray-100/50',
          getAnimationClasses(),
          className
        )}
        style={animationStyle}
      />
    );
  }

  return (
    <div
      className={cn(
        'border-2 rounded-xl flex flex-col justify-between relative cursor-pointer transform transition-all duration-300',
        sizeClasses[size],
        getVariantClasses(),
        getAnimationClasses(),
        isHighlighted && 'ring-4 ring-yellow-400 border-yellow-500 shadow-2xl scale-105',
        onClick && 'hover:scale-105 hover:shadow-2xl hover:border-gray-400',
        'select-none',
        className
      )}
      onClick={onClick}
      style={animationStyle}
    >
      {/* Top-left corner */}
      <div className={cn('absolute top-1 left-1 flex flex-col items-start leading-none font-bold', getSuitColor(card.suit))}>
        <div className={fontSizes[size].rank}>{card.rank}</div>
        <div className={fontSizes[size].symbol}>{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Top-right corner */}
      <div className={cn('absolute top-1 right-1 flex flex-col items-end leading-none font-bold', getSuitColor(card.suit))}>
        <div className={fontSizes[size].symbol}>{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Center symbol */}
      <div className={cn('absolute inset-0 flex items-center justify-center', getSuitColor(card.suit))}>
        <div className={cn(fontSizes[size].center, 'font-normal')}>
          {getSuitSymbol(card.suit)}
        </div>
      </div>

      {/* Bottom-left corner */}
      <div className={cn('absolute bottom-1 left-1 flex flex-col items-start leading-none font-bold', getSuitColor(card.suit))}>
        <div className={fontSizes[size].symbol}>{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Bottom-right corner (upside down) */}
      <div className={cn('absolute bottom-1 right-1 flex flex-col items-end leading-none font-bold transform rotate-180', getSuitColor(card.suit))}>
        <div className={fontSizes[size].rank}>{card.rank}</div>
        <div className={fontSizes[size].symbol}>{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 rounded-xl pointer-events-none" />
    </div>
  );
};

export { PlayingCard as Card };