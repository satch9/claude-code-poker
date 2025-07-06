import React from 'react';
import { cn } from '../../../shared/utils/cn';

interface ChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'red' | 'green' | 'black' | 'blue' | 'purple' | 'orange';
  count?: number;
  onClick?: () => void;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({
  value,
  size = 'md',
  color,
  count = 1,
  onClick,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  // Auto-determine color based on value if not specified
  const getChipColor = (value: number) => {
    if (color) return color;
    
    if (value < 25) return 'white';
    if (value < 100) return 'red';
    if (value < 500) return 'green';
    if (value < 1000) return 'black';
    if (value < 5000) return 'purple';
    if (value < 10000) return 'orange';
    return 'blue';
  };

  const chipColor = getChipColor(value);

  const colorClasses = {
    white: 'bg-white border-gray-400 text-gray-800 shadow-lg',
    red: 'bg-red-600 border-red-700 text-white shadow-red-200',
    green: 'bg-green-600 border-green-700 text-white shadow-green-200',
    black: 'bg-gray-900 border-gray-800 text-white shadow-gray-400',
    blue: 'bg-blue-600 border-blue-700 text-white shadow-blue-200',
    purple: 'bg-purple-600 border-purple-700 text-white shadow-purple-200',
    orange: 'bg-orange-600 border-orange-700 text-white shadow-orange-200',
  };

  const formatValue = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="relative inline-block">
      {/* Stack effect for multiple chips */}
      {count > 1 && (
        <>
          <div 
            className={cn(
              'absolute rounded-full border-4 shadow-md transform translate-x-0.5 translate-y-0.5',
              sizeClasses[size],
              colorClasses[chipColor],
              'opacity-60'
            )}
          />
          {count > 2 && (
            <div 
              className={cn(
                'absolute rounded-full border-4 shadow-md transform translate-x-1 translate-y-1',
                sizeClasses[size],
                colorClasses[chipColor],
                'opacity-40'
              )}
            />
          )}
        </>
      )}
      
      {/* Main chip */}
      <div
        className={cn(
          'relative rounded-full border-4 shadow-lg flex items-center justify-center font-bold cursor-pointer transform transition-all duration-200 z-10',
          sizeClasses[size],
          colorClasses[chipColor],
          onClick && 'hover:scale-110 hover:shadow-xl active:scale-95',
          className
        )}
        onClick={onClick}
      >
        {/* Decorative dots around the edge */}
        <div className="absolute inset-1 rounded-full border border-current opacity-30" />
        <div className="absolute inset-2 rounded-full border border-current opacity-20" />
        
        {/* Value text */}
        <span className="relative z-10 font-bold">
          {formatValue(value)}
        </span>
        
        {/* Inner highlight */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full opacity-40" />
      </div>
      
      {/* Count indicator for stacks */}
      {count > 1 && (
        <div className="absolute -top-1 -right-1 bg-poker-gold-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-20">
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  );
};

// Chip stack component for displaying multiple chip values
interface ChipStackProps {
  chips: { value: number; count: number }[];
  size?: 'sm' | 'md' | 'lg';
  onClick?: (value: number) => void;
  className?: string;
}

const ChipStack: React.FC<ChipStackProps> = ({
  chips,
  size = 'md',
  onClick,
  className,
}) => {
  const totalValue = chips.reduce((sum, chip) => sum + (chip.value * chip.count), 0);
  
  return (
    <div className={cn('flex flex-wrap gap-1 items-center', className)}>
      {chips
        .filter(chip => chip.count > 0)
        .sort((a, b) => b.value - a.value)
        .map((chip, index) => (
          <Chip
            key={`${chip.value}-${index}`}
            value={chip.value}
            count={chip.count}
            size={size}
            onClick={() => onClick?.(chip.value)}
          />
        ))}
      {chips.length > 0 && (
        <div className="ml-2 text-sm font-semibold text-gray-700">
          Total: {totalValue.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export { Chip, ChipStack };