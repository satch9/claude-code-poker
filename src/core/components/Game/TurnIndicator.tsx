import React from 'react';
import { cn } from '../../../shared/utils/cn';

interface TurnIndicatorProps {
  currentPhase: string;
  currentPlayerPosition: number;
  dealerPosition: number;
  isMyTurn: boolean;
  playerName?: string;
  className?: string;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  currentPhase,
  currentPlayerPosition,
  dealerPosition,
  isMyTurn,
  playerName,
  className,
}) => {
  const getPhaseDisplay = (phase: string) => {
    const phases = {
      'waiting': { name: 'En Attente', color: 'bg-gray-500', icon: '⏳' },
      'preflop': { name: 'Pré-Flop', color: 'bg-blue-500', icon: '🃏' },
      'flop': { name: 'Flop', color: 'bg-green-500', icon: '🎯' },
      'turn': { name: 'Turn', color: 'bg-yellow-500', icon: '🔄' },
      'river': { name: 'River', color: 'bg-orange-500', icon: '🌊' },
      'showdown': { name: 'Abattage', color: 'bg-purple-500', icon: '👁️' },
    };
    
    return phases[phase as keyof typeof phases] || phases.waiting;
  };

  const phaseInfo = getPhaseDisplay(currentPhase);

  return (
    <div className={cn('bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700', className)}>
      <div className="space-y-3">
        {/* Phase indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 font-medium">Phase actuelle</span>
          <div className={cn(
            'flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium',
            phaseInfo.color
          )}>
            <span>{phaseInfo.icon}</span>
            <span>{phaseInfo.name}</span>
          </div>
        </div>

        {/* Current player turn */}
        {currentPlayerPosition >= 0 && currentPhase !== 'waiting' && currentPhase !== 'showdown' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 font-medium">Tour de</span>
            <div className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border-2',
              isMyTurn 
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 animate-pulse' 
                : 'bg-blue-500/20 text-blue-400 border-blue-500'
            )}>
              <div className={cn(
                'w-2 h-2 rounded-full',
                isMyTurn ? 'bg-yellow-400' : 'bg-blue-400'
              )}></div>
              <span>{isMyTurn ? 'Vous' : playerName || `Joueur ${currentPlayerPosition + 1}`}</span>
            </div>
          </div>
        )}

        {/* Dealer position */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 font-medium">Donneur</span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-medium">
            <div className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center text-xs font-bold">
              D
            </div>
            <span>Position {dealerPosition + 1}</span>
          </div>
        </div>

        {/* Turn progress indicator */}
        {currentPhase !== 'waiting' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progression de la main</span>
              <span>{getProgressPercentage(currentPhase)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={cn(
                  'h-2 rounded-full transition-all duration-500',
                  phaseInfo.color
                )}
                style={{ width: `${getProgressPercentage(currentPhase)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action required indicator */}
        {isMyTurn && currentPhase !== 'waiting' && currentPhase !== 'showdown' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              <span className="text-sm font-medium">Action requise - À vous de jouer !</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get progress percentage
function getProgressPercentage(phase: string): number {
  const progressMap = {
    'waiting': 0,
    'preflop': 20,
    'flop': 40,
    'turn': 60,
    'river': 80,
    'showdown': 100,
  };
  
  return progressMap[phase as keyof typeof progressMap] || 0;
}