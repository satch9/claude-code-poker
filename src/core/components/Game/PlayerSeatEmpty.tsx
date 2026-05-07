import React from 'react';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

export interface PlayerSeatEmptyProps {
  onClick: () => void;
  className?: string;
}

export const PlayerSeatEmpty: React.FC<PlayerSeatEmptyProps> = ({ onClick, className }) => {
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-tap min-w-tap rounded-full border-2 border-dashed border-gray-500 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer transition-all duration-200',
        'flex items-center justify-center',
        isDesktop ? 'w-14 h-14' : 'w-11 h-11',
        className,
      )}
      aria-label="Rejoindre ce siège libre"
    >
      <svg
        className={cn('text-gray-300', isDesktop ? 'w-6 h-6' : 'w-5 h-5')}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>
  );
};
