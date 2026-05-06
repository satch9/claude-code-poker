import React from 'react';
import { cn } from '../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface TabBarProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant: 'bottom' | 'rail';
}

export const TabBar: React.FC<TabBarProps> = ({ items, activeId, onChange, variant }) => {
  const isBottom = variant === 'bottom';

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className={cn(
        'bg-bg-surface border-border-default text-text-primary',
        isBottom
          ? 'fixed bottom-0 left-0 right-0 z-30 flex h-14 border-t safe-bottom'
          : 'flex flex-col w-[72px] h-full border-r py-2 gap-1',
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-label={item.label}
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-center justify-center min-h-tap-comfort',
              'transition-colors duration-fast',
              isBottom ? 'flex-1 flex-col gap-0.5' : 'w-full flex-col gap-1 py-2',
              isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary',
            )}
          >
            <span className="relative inline-flex">
              {item.icon}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  aria-label={`${item.badge} non lus`}
                  className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-sem-danger text-[10px] font-semibold text-white inline-flex items-center justify-center"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className={cn('text-xs', !isBottom && 'sr-only')}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
