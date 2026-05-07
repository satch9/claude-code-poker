import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface BlindBadgeProps {
  type: 'small' | 'big';
  className?: string;
}

export const BlindBadge: React.FC<BlindBadgeProps> = ({ type, className }) => {
  const isSmall = type === 'small';
  return (
    <div
      className={cn(
        'absolute -top-2 -left-2 text-white rounded-full flex items-center justify-center font-bold shadow-lg whitespace-nowrap border-2 border-white text-xs px-2 min-w-[28px] h-6',
        isSmall ? 'bg-orange-500' : 'bg-red-600',
        className,
      )}
      aria-label={isSmall ? 'Small blind' : 'Big blind'}
    >
      {isSmall ? 'SB' : 'BB'}
    </div>
  );
};
