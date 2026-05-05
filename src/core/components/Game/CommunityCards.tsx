import React from 'react';
import { Card } from '../UI/Card';
import { cn } from '../../../shared/utils/cn';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface CommunityCardsProps {
  cards: string[];
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  playersCount?: number;
  maxPlayers?: number;
  className?: string;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  phase,
  pot,
  playersCount,
  maxPlayers,
  className,
}) => {
  const { isMobile } = useBreakpoint();
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
        if (
          typeof playersCount === 'number' &&
          typeof maxPlayers === 'number' &&
          playersCount < maxPlayers
        ) {
          return `En attente de joueurs (${playersCount}/${maxPlayers})`;
        }
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
    <div className={cn('text-center flex flex-col items-center', className)}>
      {/* Pot affiché en plaque sombre semi-transparente (style PokerStars) */}
      <div
        className={cn(
          "bg-black/60 backdrop-blur-sm text-white rounded-full font-semibold shadow-md border border-white/10",
          isMobile ? "px-3 py-1 text-xs mb-1" : "px-4 py-1.5 text-sm mb-2"
        )}
      >
        Pot : {pot > 0 ? (isMobile && pot >= 1000 ? `${Math.floor(pot/1000)}K` : pot.toLocaleString()) : '0'}
      </div>

      {/* Community cards (rien en preflop) */}
      {cardsToShow.length > 0 && (
        <div className={cn(
          "flex gap-2 justify-center",
          isMobile && "gap-1"
        )}>
          {cardsToShow.map((cardStr, index) => (
            <Card
              key={index}
              card={parseCard(cardStr)}
              size={isMobile ? "sm" : "md"}
              animation="deal"
              animationDelay={index * 300}
              className="shadow-xl"
            />
          ))}
        </div>
      )}

      {/* Phase indicator discret en preflop si pas de cartes */}
      {cardsToShow.length === 0 && (
        <div className={cn("text-white/60 uppercase tracking-wider", isMobile ? "text-xs" : "text-sm")}>
          {getPhaseLabel()}
        </div>
      )}
    </div>
  );
};