import React, { useState, useEffect } from 'react';
import { cn } from '../../../shared/utils/cn';

interface PlayerTimerProps {
  isActive: boolean;
  timeLimit: number; // in seconds
  onTimeOut: () => void;
  className?: string;
}

export const PlayerTimer: React.FC<PlayerTimerProps> = ({
  isActive,
  timeLimit,
  onTimeOut,
  className,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(timeLimit);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLimit, onTimeOut]);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(timeLimit);
    }
  }, [isActive, timeLimit]);

  if (!isActive) return null;

  const progress = (timeLeft / timeLimit) * 100;
  const isUrgent = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div className={cn('relative', className)}>
      {/* Vertical timer bar */}
      <div className="relative w-2 h-16 bg-gray-600 rounded-full overflow-hidden">
        {/* Progress bar */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-linear rounded-full',
            isCritical ? 'bg-red-500' : isUrgent ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ height: `${progress}%` }}
        />
        
        {/* Pulse animation for critical time */}
        {isCritical && (
          <div className="absolute inset-0 bg-red-500/50 animate-ping rounded-full"></div>
        )}
      </div>

      {/* Timer text */}
      <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
        <span className={cn(
          'text-xs font-bold tabular-nums px-1 py-0.5 rounded',
          isCritical 
            ? 'text-red-400 bg-red-500/20 animate-pulse' 
            : isUrgent 
            ? 'text-yellow-400 bg-yellow-500/20' 
            : 'text-green-400 bg-green-500/20'
        )}>
          {timeLeft}s
        </span>
      </div>
    </div>
  );
};