import React from 'react';
import { cn } from '../../../shared/utils/cn';

export interface BlindBadgeProps {
  type: 'small' | 'big' | 'dealer';
  className?: string;
}

const VARIANTS = {
  small: { label: 'SB', bg: 'bg-orange-500', text: 'text-white', pos: '-top-2 -left-2', aria: 'Small blind' },
  big: { label: 'BB', bg: 'bg-red-600', text: 'text-white', pos: '-top-2 -left-2', aria: 'Big blind' },
  dealer: { label: 'D', bg: 'bg-white', text: 'text-black', pos: '-top-2 -right-2', aria: 'Dealer' },
} as const;

export const BlindBadge: React.FC<BlindBadgeProps> = ({ type, className }) => {
  const v = VARIANTS[type];
  return (
    <div
      className={cn(
        'absolute z-30 rounded-full flex items-center justify-center font-bold shadow-lg whitespace-nowrap border-2 border-white text-xs px-2 min-w-[28px] h-6',
        v.pos,
        v.bg,
        v.text,
        className,
      )}
      aria-label={v.aria}
    >
      {v.label}
    </div>
  );
};
