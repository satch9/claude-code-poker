import React from 'react';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

export interface PlayerAvatarProps {
  name: string;
  isActive: boolean;
  isFolded: boolean;
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ name, isActive, isFolded, className }) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);
  const initial = (name || 'Player').charAt(0).toUpperCase();
  const showPulse = isActive && !isFolded;

  return (
    <div
      className={cn(
        'bg-blue-500 rounded-full flex items-center justify-center text-white font-bold ring-2 transition-all',
        isDesktop ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs',
        showPulse ? 'ring-red-500 avatar-active-pulse' : 'ring-blue-300/40',
        className,
      )}
      aria-label={`Avatar de ${name || 'joueur'}`}
    >
      {initial}
    </div>
  );
};
