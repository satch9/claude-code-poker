import React, { useState, useEffect } from 'react';
import { cn } from '../../../shared/utils/cn';

interface ActionTimerProps {
  isActive: boolean;
  timeLimit: number; // in seconds
  onTimeOut: () => void;
  className?: string;
}

export const ActionTimer: React.FC<ActionTimerProps> = ({
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
      {/* Timer circle */}
      <div className="relative w-16 h-16">
        {/* Background circle */}
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className="stroke-gray-600"
            strokeWidth="2"
          />
          {/* Progress circle */}
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className={cn(
              'transition-all duration-1000 ease-linear',
              isCritical ? 'stroke-red-500' : isUrgent ? 'stroke-yellow-500' : 'stroke-green-500'
            )}
            strokeWidth="2"
            strokeDasharray="100.53"
            strokeDashoffset={100.53 - (progress * 100.53) / 100}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'text-lg font-bold tabular-nums',
            isCritical ? 'text-red-500 animate-pulse' : isUrgent ? 'text-yellow-500' : 'text-green-500'
          )}>
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Timer label */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
        <div className={cn(
          'text-xs font-medium px-2 py-1 rounded-full',
          isCritical 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
            : isUrgent 
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        )}>
          {isCritical ? 'URGENT!' : isUrgent ? 'Dépêchez-vous' : 'À vous de jouer'}
        </div>
      </div>

      {/* Pulse animation for critical time */}
      {isCritical && (
        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
      )}
    </div>
  );
};