import React from 'react';
import { cn } from '../../../shared/utils/cn';

interface ActionFeedItem {
  id: string;
  playerName: string;
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in' | 'join' | 'leave' | 'system';
  amount?: number;
  message?: string;
  timestamp: number;
}

interface ActionFeedProps {
  actions: ActionFeedItem[];
  className?: string;
}

export const ActionFeed: React.FC<ActionFeedProps> = ({
  actions,
  className,
}) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'fold':
        return 'text-red-400';
      case 'check':
        return 'text-gray-400';
      case 'call':
        return 'text-blue-400';
      case 'raise':
        return 'text-green-400';
      case 'all-in':
        return 'text-purple-400';
      case 'join':
        return 'text-cyan-400';
      case 'leave':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActionText = (item: ActionFeedItem) => {
    const playerName = item.playerName || 'Joueur inconnu';
    
    switch (item.action) {
      case 'fold':
        return `${playerName} se couche`;
      case 'check':
        return `${playerName} check`;
      case 'call':
        return `${playerName} suit${item.amount ? ` (${item.amount.toLocaleString()})` : ''}`;
      case 'raise':
        return `${playerName} relance à ${item.amount?.toLocaleString()}`;
      case 'all-in':
        return `${playerName} fait tapis${item.amount ? ` (${item.amount.toLocaleString()})` : ''}`;
      case 'join':
        return playerName === 'Système' ? 'Nouvelle main commencée' : `${playerName} rejoint la table`;
      case 'leave':
        return `${playerName} quitte la table`;
      case 'system':
        return item.message || 'Message système';
      default:
        return `${playerName} ${item.action}`;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={cn('bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Actions récentes</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {actions.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Aucune action encore
          </div>
        ) : (
          actions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn('font-medium', getActionColor(item.action))}>
                  {getActionText(item)}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(item.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {actions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500 text-center">
            {actions.length} action{actions.length > 1 ? 's' : ''} récente{actions.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};