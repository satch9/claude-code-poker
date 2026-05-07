import React from 'react';
import { Card } from '../UI/Card';
import { Card as CardType } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

export interface CommunityCardsProps {
  cards: string[];
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  playersCount?: number;
  maxPlayers?: number;
  className?: string;
}

const SUIT_MAP: Record<string, 'hearts' | 'diamonds' | 'clubs' | 'spades'> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};

function parseCard(cardStr: string): CardType | undefined {
  if (!cardStr || cardStr.length < 2) return undefined;
  const rank = cardStr.slice(0, -1) as CardType['rank'];
  const suitChar = cardStr.slice(-1).toLowerCase();
  const suit = SUIT_MAP[suitChar];
  if (!suit) return undefined;
  return { rank, suit };
}

const CARDS_PER_PHASE: Record<CommunityCardsProps['phase'], number> = {
  waiting: 0,
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  showdown: 5,
};

function formatPot(pot: number, compact: boolean): string {
  if (pot <= 0) return '0';
  if (compact && pot >= 1000) return `${(pot / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return pot.toLocaleString();
}

function getPhaseLabel(
  phase: CommunityCardsProps['phase'],
  playersCount?: number,
  maxPlayers?: number,
): string {
  switch (phase) {
    case 'waiting':
      if (typeof playersCount === 'number' && typeof maxPlayers === 'number' && playersCount < maxPlayers) {
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
  }
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  phase,
  pot,
  playersCount,
  maxPlayers,
  className,
}) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);
  const compact = !isDesktop;
  const cardsToShow = cards.slice(0, CARDS_PER_PHASE[phase]);

  return (
    <div className={cn('text-center flex flex-col items-center', className)}>
      <div
        className={cn(
          'bg-black/60 backdrop-blur-sm text-white rounded-full font-semibold shadow-md border border-white/10',
          compact ? 'px-3 py-1 text-xs mb-1' : 'px-4 py-1.5 text-sm mb-2',
        )}
      >
        Pot : <span className="text-gold">{formatPot(pot, compact)}</span>
      </div>

      {cardsToShow.length > 0 ? (
        <div className={cn('flex justify-center flex-wrap', compact ? 'gap-0.5' : 'gap-2')}>
          {cardsToShow.map((cardStr, index) => (
            <div key={index} data-card>
              <Card
                card={parseCard(cardStr)}
                size={compact ? 'xs' : 'md'}
                animation="deal"
                animationDelay={index * 300}
                className="shadow-xl"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={cn('text-white/60 uppercase tracking-wider', compact ? 'text-xs' : 'text-sm')}>
          {getPhaseLabel(phase, playersCount, maxPlayers)}
        </div>
      )}
    </div>
  );
};
