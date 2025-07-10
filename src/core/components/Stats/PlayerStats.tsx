import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '../UI/Button';

interface PlayerStatsProps {
  userId: Id<'users'>;
  showDetailed?: boolean;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({
  userId,
  showDetailed = false,
}) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const userStats = useQuery(
    api.users.getUserStats, 
    userId && userId.length > 20 ? { userId } : "skip"
  );
  const userRanking = useQuery(
    api.users.getUserRanking, 
    userId && userId.length > 20 ? { userId } : "skip"
  );

  if (!userStats) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!showDetailed) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes statistiques</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-poker-green-50 rounded-lg">
            <div className="text-xl font-bold text-poker-green-600">{userStats.gamesWon}</div>
            <div className="text-sm text-gray-600">Victoires</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{userStats.gamesPlayed}</div>
            <div className="text-sm text-gray-600">Parties</div>
          </div>
        </div>
        {userStats.gamesPlayed > 0 && (
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Taux de victoire: <span className="font-bold text-poker-green-600">{userStats.winRate}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Statistiques détaillées</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          {showLeaderboard ? 'Mes stats' : 'Classement'}
        </Button>
      </div>

      {showLeaderboard && userRanking ? (
        <div>
          <h4 className="text-lg font-medium text-gray-800 mb-4">Classement des joueurs</h4>
          
          {/* User's current position */}
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                Votre position: #{userRanking.userRank}
              </div>
              <div className="text-sm text-orange-500">
                sur {userRanking.totalPlayers} joueurs
              </div>
            </div>
          </div>

          {/* Top players */}
          <div className="space-y-2">
            {userRanking.topPlayers.map((player, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border border-gray-200' :
                  index === 2 ? 'bg-orange-50 border border-orange-200' :
                  'bg-white border border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {player.rank}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{player.name}</div>
                    <div className="text-xs text-gray-500">
                      {player.gamesPlayed} parties • {player.winRate}% victoires
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-poker-green-600">
                    {player.totalWinnings.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">jetons</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Overall performance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-poker-green-50 rounded-lg">
              <div className="text-2xl font-bold text-poker-green-600">{userStats.gamesWon}</div>
              <div className="text-sm text-gray-600">Victoires</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{userStats.gamesPlayed}</div>
              <div className="text-sm text-gray-600">Parties</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{userStats.winRate}%</div>
              <div className="text-sm text-gray-600">Taux victoire</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userStats.totalWinnings.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Jetons gagnés</div>
            </div>
          </div>

          {/* Detailed metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{userStats.biggestWin.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Plus gros gain</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">{userStats.tournamentWins}</div>
              <div className="text-xs text-gray-600">Tournois gagnés</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-lg font-bold text-indigo-600">{userStats.handsPlayed}</div>
              <div className="text-xs text-gray-600">Mains jouées</div>
            </div>
          </div>

          {/* Playing style */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-3">Style de jeu</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-sm">
                <div>
                  <div className="font-bold text-red-600">{userStats.actionBreakdown.fold}</div>
                  <div className="text-gray-600">Fold</div>
                </div>
                <div>
                  <div className="font-bold text-gray-600">{userStats.actionBreakdown.check}</div>
                  <div className="text-gray-600">Check</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{userStats.actionBreakdown.call}</div>
                  <div className="text-gray-600">Call</div>
                </div>
                <div>
                  <div className="font-bold text-green-600">{userStats.actionBreakdown.raise}</div>
                  <div className="text-gray-600">Raise</div>
                </div>
                <div>
                  <div className="font-bold text-purple-600">{userStats.actionBreakdown.allIn}</div>
                  <div className="text-gray-600">All-in</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm text-gray-600">
                  Action favorite: <span className="font-bold capitalize text-poker-green-600">{userStats.mostFrequentAction}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Win streaks */}
          {(userStats.currentWinStreak > 0 || userStats.longestWinStreak > 0) && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 mb-3">Séries de victoires</h4>
              <div className="grid grid-cols-2 gap-4">
                {userStats.currentWinStreak > 0 && (
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xl font-bold text-green-600">🔥 {userStats.currentWinStreak}</div>
                    <div className="text-sm text-green-600">Série actuelle</div>
                  </div>
                )}
                {userStats.longestWinStreak > 0 && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-xl font-bold text-yellow-600">🏆 {userStats.longestWinStreak}</div>
                    <div className="text-sm text-yellow-600">Meilleure série</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {userStats.recentActivity.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">Activité récente</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userStats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        activity.action === 'win' ? 'bg-green-500' :
                        activity.action === 'all-in' ? 'bg-purple-500' :
                        'bg-blue-500'
                      }`}></span>
                      <span className="text-sm font-medium capitalize">{activity.action}</span>
                      {activity.phase && (
                        <span className="text-xs text-gray-500">({activity.phase})</span>
                      )}
                    </div>
                    <div className="text-right">
                      {activity.amount && (
                        <div className="text-sm font-bold text-poker-green-600">
                          {activity.amount.toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};