import React, { useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '../../../shared/ui/Button';
import { isValidUserId } from '../../../shared/utils/validation';
import { cn } from '../../../shared/utils/cn';

interface PlayerStatsProps {
  userId: Id<'users'>;
  showDetailed?: boolean;
}

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  variant?: 'accent' | 'success' | 'purple' | 'warning' | 'danger' | 'muted';
}> = ({ label, value, variant = 'muted' }) => (
  <div
    className={cn(
      'rounded-lg p-3 text-center border',
      variant === 'accent' && 'bg-accent/10 border-accent/30',
      variant === 'success' && 'bg-sem-success/10 border-sem-success/30',
      variant === 'purple' && 'bg-purple-500/10 border-purple-500/30',
      variant === 'warning' && 'bg-sem-warning/10 border-sem-warning/30',
      variant === 'danger' && 'bg-sem-danger/10 border-sem-danger/30',
      variant === 'muted' && 'bg-bg-elevated border-border-default',
    )}
  >
    <div
      className={cn(
        'text-xl font-bold',
        variant === 'accent' && 'text-accent',
        variant === 'success' && 'text-sem-success',
        variant === 'purple' && 'text-purple-300',
        variant === 'warning' && 'text-sem-warning',
        variant === 'danger' && 'text-sem-danger',
        variant === 'muted' && 'text-text-primary',
      )}
    >
      {value}
    </div>
    <div className="text-xs text-text-muted">{label}</div>
  </div>
);

export const PlayerStats: React.FC<PlayerStatsProps> = ({
  userId,
  showDetailed = false,
}) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [mode, setMode] = useState<'all' | 'tournament' | 'cash'>('all');

  const userIdValid = isValidUserId(userId);

  const userStats = useQuery(
    api.users.stats.getUserStats,
    userIdValid ? { userId, mode } : 'skip',
  );
  const userRanking = useQuery(
    api.users.stats.getUserRanking,
    userIdValid ? { userId } : 'skip',
  );

  if (!userStats) {
    return (
      <div className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-bg-elevated rounded w-3/4 mb-4" />
        <div className="h-8 bg-bg-elevated rounded w-1/2 mb-2" />
        <div className="h-4 bg-bg-elevated rounded w-full" />
      </div>
    );
  }

  if (!showDetailed) {
    return (
      <div className="bg-bg-surface border border-border-default rounded-lg p-4">
        <h3 className="text-base font-semibold text-text-primary mb-3">Mes statistiques</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Victoires" value={userStats.gamesWon} variant="success" />
          <StatTile label="Parties" value={userStats.gamesPlayed} variant="accent" />
        </div>
        {userStats.gamesPlayed > 0 && (
          <div className="mt-3 text-center text-sm text-text-muted">
            Taux de victoire :{' '}
            <span className="font-bold text-sem-success">{userStats.winRate}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4 md:p-6 text-text-primary">
      <header className="flex justify-between items-center mb-5 gap-2">
        <h3 className="text-lg font-semibold">Statistiques détaillées</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLeaderboard((v) => !v)}
        >
          {showLeaderboard ? 'Mes stats' : 'Classement'}
        </Button>
      </header>

      {showLeaderboard && userRanking ? (
        <div>
          <h4 className="text-base font-medium text-text-primary mb-3">
            Classement des joueurs
          </h4>

          <div className="mb-4 p-3 rounded-lg bg-gold/10 border border-gold/30 text-center">
            <div className="text-lg font-bold text-gold">
              Votre position : #{userRanking.userRank}
            </div>
            <div className="text-sm text-text-muted">
              sur {userRanking.totalPlayers} joueurs
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {userRanking.topPlayers.map((player, index) => (
              <li
                key={index}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  index === 0 && 'bg-gold/10 border-gold/30',
                  index === 1 && 'bg-bg-elevated border-border-default',
                  index === 2 && 'bg-sem-warning/10 border-sem-warning/30',
                  index > 2 && 'bg-bg-surface border-border-default',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                      index === 0 && 'bg-gold text-black',
                      index === 1 && 'bg-text-muted text-bg-base',
                      index === 2 && 'bg-sem-warning text-black',
                      index > 2 && 'bg-bg-elevated text-text-muted',
                    )}
                  >
                    {player.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary truncate">
                      {player.name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {player.gamesPlayed} parties · {player.winRate}% victoires
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sem-success">
                    {player.totalWinnings.toLocaleString()}
                  </div>
                  <div className="text-xs text-text-muted">jetons</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4" role="tablist" aria-label="Filtre par type de partie">
            {([
              { id: 'all', label: 'Toutes' },
              { id: 'tournament', label: 'Tournoi' },
              { id: 'cash', label: 'Cash' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                role="tab"
                aria-selected={mode === opt.id}
                onClick={() => setMode(opt.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  mode === opt.id
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-bg-elevated border-border-default text-text-muted hover:text-text-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatTile label="Victoires" value={userStats.gamesWon} variant="success" />
            <StatTile label="Parties" value={userStats.gamesPlayed} variant="accent" />
            <StatTile label="Taux victoire" value={`${userStats.winRate}%`} variant="purple" />
            <StatTile
              label="Jetons gagnés"
              value={userStats.totalWinnings.toLocaleString()}
              variant="success"
            />
          </div>

          <div className={cn(
            'grid gap-3 mb-5',
            mode === 'cash' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
          )}>
            <StatTile label="Plus gros gain" value={userStats.biggestWin.toLocaleString()} variant="warning" />
            {mode !== 'cash' && (
              <StatTile label="Tournois gagnés" value={userStats.tournamentWins} variant="danger" />
            )}
            <StatTile label="Mains jouées" value={userStats.handsPlayed} variant="muted" />
          </div>

          <div className="mb-5">
            <h4 className="text-sm font-medium text-text-primary mb-2">Style de jeu</h4>
            <div className="bg-bg-elevated border border-border-default p-3 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-sm">
                <div>
                  <div className="font-bold text-sem-danger">{userStats.actionBreakdown.fold}</div>
                  <div className="text-xs text-text-muted">Fold</div>
                </div>
                <div>
                  <div className="font-bold text-text-muted">{userStats.actionBreakdown.check}</div>
                  <div className="text-xs text-text-muted">Check</div>
                </div>
                <div>
                  <div className="font-bold text-accent">{userStats.actionBreakdown.call}</div>
                  <div className="text-xs text-text-muted">Call</div>
                </div>
                <div>
                  <div className="font-bold text-sem-success">{userStats.actionBreakdown.raise}</div>
                  <div className="text-xs text-text-muted">Raise</div>
                </div>
                <div>
                  <div className="font-bold text-purple-300">{userStats.actionBreakdown.allIn}</div>
                  <div className="text-xs text-text-muted">All-in</div>
                </div>
              </div>
              <div className="mt-3 text-center text-xs text-text-muted">
                Action favorite :{' '}
                <span className="font-bold capitalize text-sem-success">
                  {userStats.mostFrequentAction}
                </span>
              </div>
            </div>
          </div>

          {(userStats.currentWinStreak > 0 || userStats.longestWinStreak > 0) && (
            <div className="mb-5">
              <h4 className="text-sm font-medium text-text-primary mb-2">Séries de victoires</h4>
              <div className="grid grid-cols-2 gap-3">
                {userStats.currentWinStreak > 0 && (
                  <StatTile
                    label="Série actuelle"
                    value={
                      <span className="inline-flex items-center justify-center gap-1">
                        <Flame size={18} aria-hidden /> {userStats.currentWinStreak}
                      </span>
                    }
                    variant="success"
                  />
                )}
                {userStats.longestWinStreak > 0 && (
                  <StatTile
                    label="Meilleure série"
                    value={
                      <span className="inline-flex items-center justify-center gap-1">
                        <Trophy size={18} aria-hidden /> {userStats.longestWinStreak}
                      </span>
                    }
                    variant="warning"
                  />
                )}
              </div>
            </div>
          )}

          {userStats.recentActivity.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Activité récente</h4>
              <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {userStats.recentActivity.map((activity, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center p-2 bg-bg-elevated border border-border-default rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block w-2 h-2 rounded-full',
                          activity.action === 'win' && 'bg-sem-success',
                          activity.action === 'all-in' && 'bg-purple-300',
                          activity.action !== 'win' && activity.action !== 'all-in' && 'bg-accent',
                        )}
                      />
                      <span className="font-medium capitalize text-text-primary">
                        {activity.action}
                      </span>
                      {activity.phase && (
                        <span className="text-xs text-text-muted">({activity.phase})</span>
                      )}
                    </div>
                    <div className="text-right">
                      {activity.amount && (
                        <div className="text-sm font-bold text-sem-success">
                          {activity.amount.toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-text-muted">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
