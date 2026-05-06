import React from 'react';
import { cn } from '../utils/cn';

type Variant = 'surface' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  surface: 'bg-bg-surface border border-border-default',
  elevated: 'bg-bg-elevated border border-border-default shadow-lg',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'surface', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-lg p-4 text-text-primary', VARIANTS[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
