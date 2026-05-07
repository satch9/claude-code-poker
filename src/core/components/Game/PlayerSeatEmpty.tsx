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
        'min-h-tap min-w-tap rounded-2xl border-2 border-dashed border-gray-500 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer transition-all duration-200 text-center',
        isDesktop ? 'p-3' : 'p-2',
        className,
      )}
      aria-label={isDesktop ? 'Siège libre — cliquez pour rejoindre' : 'Rejoindre ce siège libre'}
    >
      <div
        className={cn(
          'bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-300',
          isDesktop ? 'w-12 h-12' : 'w-8 h-8',
        )}
      >
        <svg
          className={cn(isDesktop ? 'w-6 h-6' : 'w-4 h-4')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div className={cn('font-medium text-gray-300', isDesktop ? 'text-sm' : 'text-xs')}>
        {isDesktop ? 'Siège libre' : 'Libre'}
      </div>
      <div className="text-xs text-gray-400">
        {isDesktop ? 'Cliquez pour rejoindre' : 'Rejoindre'}
      </div>
    </button>
  );
};
