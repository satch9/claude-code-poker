import React from 'react';
import { cn } from '../../../shared/utils/cn';

interface HandStatsProps {
  handNumber: number;
  potSize: number;
  totalPlayers: number;
  activePlayers: number;
  bigBlind: number;
  averageStack: number;
  className?: string;
}

export const HandStats: React.FC<HandStatsProps> = ({
  handNumber,
  potSize,
  totalPlayers,
  activePlayers,
  bigBlind,
  averageStack,
  className,
}) => {
  const potOddsRatio = potSize > 0 ? (potSize / bigBlind).toFixed(1) : '0';

  const stats = [
    {
      label: 'Main #',
      value: handNumber.toString(),
      icon: '🃏',
      color: 'text-blue-400',
    },
    {
      label: 'Pot',
      value: potSize.toLocaleString(),
      icon: '💰',
      color: 'text-green-400',
    },
    {
      label: 'Joueurs',
      value: `${activePlayers}/${totalPlayers}`,
      icon: '👥',
      color: 'text-purple-400',
    },
    {
      label: 'Big Blind',
      value: bigBlind.toLocaleString(),
      icon: '🎯',
      color: 'text-yellow-400',
    },
    {
      label: 'Stack moyen',
      value: averageStack.toLocaleString(),
      icon: '📊',
      color: 'text-cyan-400',
    },
    {
      label: 'Pot/BB',
      value: `${potOddsRatio}x`,
      icon: '📈',
      color: 'text-orange-400',
    },
  ];

  return (
    <div className={cn('bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Statistiques de la main</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:bg-gray-800/70 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
            </div>
            <div className={cn('text-sm font-bold', stat.color)}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Taille moyenne du pot</span>
          <span className="font-medium">{(potSize / Math.max(activePlayers, 1)).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};