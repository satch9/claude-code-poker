# Sprint 4 — Refonte Stats (visuel + AppShell) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refondre `StatsPage` et `PlayerStats` selon les tokens Sprint 0 (dark, primitives, cohérence visuelle avec le reste de l'app), retirer le header custom (AppShell prend le relai), wirer le bouton "Exporter" dans le `headerAction` AppShell, ajouter un `SegmentedControl` période (`7j` / `30j` / `90j` / `Tout`) qui filtre les `recentActivity` et `handsHistory` côté client.

**Architecture:** Le composant `PlayerStats` (264 lignes) garde sa logique de query (`getUserStats`, `getUserRanking`) et son toggle Stats / Classement. Il est réécrit visuellement : drop des `bg-white / bg-poker-green-50` au profit des tokens Sprint 0. Le composant `StatsPage` (164 lignes) est largement simplifié : drop du header custom + gradient + UserProfile (déjà accessible via Profil tab AppShell). Le tableau des mains jouées passe en cards mobile-first. Le filtre période est un état local côté `StatsPage`. Pas de graphique recharts dans ce sprint (laissé pour Sprint 6 polish ou itération future) — on précise dans la note de release.

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0 + Convex (queries inchangées).

---

## File Structure

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Stats/StatsPage.tsx` | Drop header custom, tokens dark, ajouter SegmentedControl période, table → cards mobile-first |
| `src/core/components/Stats/PlayerStats.tsx` | Tokens dark, primitives Sprint 0, badges classement |
| `src/core/components/App/AppMain.tsx` | Ajouter `headerAction` "Exporter" sur `currentView === 'stats'` (lift le handler depuis StatsPage), retirer la prop `onBack` (AppShell gère le retour via tab navigation) |

### Files NOT touched

- `convex/users/stats.ts` — backend inchangé.
- Reste des composants.

---

## Task 1 : Refondre `PlayerStats` (visuel)

**Files:**
- Modify: `src/core/components/Stats/PlayerStats.tsx`

### Step 1.1 — Replace ENTIRE content of `src/core/components/Stats/PlayerStats.tsx`

```tsx
import React, { useState } from 'react';
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

  const userIdValid = isValidUserId(userId);

  const userStats = useQuery(
    api.users.stats.getUserStats,
    userIdValid ? { userId } : 'skip',
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
          {/* Performance globale */}
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

          {/* Métriques détaillées */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatTile label="Plus gros gain" value={userStats.biggestWin.toLocaleString()} variant="warning" />
            <StatTile label="Tournois gagnés" value={userStats.tournamentWins} variant="danger" />
            <StatTile label="Mains jouées" value={userStats.handsPlayed} variant="muted" />
          </div>

          {/* Style de jeu */}
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

          {/* Séries */}
          {(userStats.currentWinStreak > 0 || userStats.longestWinStreak > 0) && (
            <div className="mb-5">
              <h4 className="text-sm font-medium text-text-primary mb-2">Séries de victoires</h4>
              <div className="grid grid-cols-2 gap-3">
                {userStats.currentWinStreak > 0 && (
                  <StatTile
                    label="Série actuelle"
                    value={`🔥 ${userStats.currentWinStreak}`}
                    variant="success"
                  />
                )}
                {userStats.longestWinStreak > 0 && (
                  <StatTile
                    label="Meilleure série"
                    value={`🏆 ${userStats.longestWinStreak}`}
                    variant="warning"
                  />
                )}
              </div>
            </div>
          )}

          {/* Activité récente */}
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
```

### Step 1.2 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # 105 tests should still pass
```

### Step 1.3 — Commit

```bash
git add src/core/components/Stats/PlayerStats.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(stats): PlayerStats refondu mobile-first dark (StatTile + tokens Sprint 0)"
```

---

## Task 2 : Refondre `StatsPage` (drop header custom + AppShell-friendly + SegmentedControl période)

**Files:**
- Modify: `src/core/components/Stats/StatsPage.tsx`

### Step 2.1 — Replace ENTIRE content of `src/core/components/Stats/StatsPage.tsx`

```tsx
import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
import { PlayerStats } from "./PlayerStats";
import { cn } from "../../../shared/utils/cn";

type Period = "7d" | "30d" | "90d" | "all";

const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: "7d", label: "7j", days: 7 },
  { id: "30d", label: "30j", days: 30 },
  { id: "90d", label: "90j", days: 90 },
  { id: "all", label: "Tout", days: null },
];

interface StatsPageProps {
  /** Handler exposé pour permettre à AppShell de déclencher l'export
   *  via headerAction. Appelé sans argument côté UI. */
  onExportRequest?: (handler: () => void) => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({ onExportRequest }) => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");

  const detailedStats = useQuery(
    api.users.stats.getUserStats,
    user ? { userId: user._id } : "skip",
  );
  const handsHistory = useQuery(
    api.users.stats.getUserHandsHistory,
    user ? { userId: user._id, limit: 100 } : "skip",
  );

  const handleExportJson = React.useCallback(() => {
    if (!detailedStats || !user) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      userId: user._id,
      userName: user.name,
      stats: detailedStats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poker-stats-${user.name}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [detailedStats, user]);

  // Expose le handler à AppMain pour l'utiliser dans headerAction.
  React.useEffect(() => {
    onExportRequest?.(handleExportJson);
  }, [onExportRequest, handleExportJson]);

  // Filtre période côté client pour l'historique des mains.
  const filteredHands = useMemo(() => {
    if (!handsHistory) return [];
    const period_ = PERIODS.find((p) => p.id === period);
    if (!period_ || period_.days === null) return handsHistory;
    const cutoff = Date.now() - period_.days * 24 * 60 * 60 * 1000;
    return handsHistory.filter((h) => h.endTs >= cutoff);
  }, [handsHistory, period]);

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-5xl px-3 md:px-4 py-4 md:py-6 space-y-4">
      {/* Filtre période */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Période
        </h2>
        <div
          role="tablist"
          aria-label="Filtre par période"
          className="inline-flex rounded-lg bg-bg-elevated p-1 border border-border-default"
        >
          {PERIODS.map((p) => {
            const isActive = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "min-h-tap px-3 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-white" : "text-text-muted hover:text-text-primary",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats détaillées (carrière) */}
      <PlayerStats userId={user._id} showDetailed />

      {/* Mains jouées */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-3 md:p-5 text-text-primary">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold">
            Mains jouées
          </h2>
          <span className="text-xs md:text-sm text-text-muted">
            {filteredHands.length} {filteredHands.length > 1 ? "mains" : "main"}
          </span>
        </header>

        {handsHistory === undefined && (
          <div className="text-sm text-text-muted">Chargement…</div>
        )}
        {handsHistory && filteredHands.length === 0 && (
          <div className="text-sm text-text-muted">
            Aucune main jouée sur cette période.
          </div>
        )}
        {filteredHands.length > 0 && (
          <ul className="flex flex-col gap-2">
            {filteredHands.map((h) => (
              <li
                key={`${h.tableId}-${h.handNumber}`}
                className="bg-bg-elevated border border-border-default rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary truncate">
                      {h.tableName}
                    </span>
                    {h.gameType === "tournament" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                        Tournoi
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted flex flex-wrap gap-x-3 gap-y-1">
                    <span>{new Date(h.endTs).toLocaleString()}</span>
                    <span>Main #{h.handNumber}</span>
                    {h.finalAction && (
                      <span className="capitalize">Action : {h.finalAction}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  {h.won ? (
                    <span className="px-2 py-0.5 rounded-full bg-sem-success/20 text-sem-success text-xs font-medium">
                      Gagnée
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-bg-surface text-text-muted text-xs font-medium border border-border-default">
                      Perdue
                    </span>
                  )}
                  {h.won && (
                    <span className="font-bold text-sem-success">
                      +{h.amountWon.toLocaleString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Note IA */}
      <section className="bg-bg-elevated border border-border-default rounded-lg p-3 md:p-5 text-sm text-text-muted">
        <h2 className="text-base font-semibold text-text-primary mb-2">
          Données brutes &amp; IA
        </h2>
        <p>
          Le bouton « Exporter » du header télécharge un JSON contenant toutes
          les statistiques agrégées. L&apos;historique main-par-main ci-dessus
          servira de base à l&apos;analyse / entraînement IA — graphiques et
          replay viendront enrichir cette page dans une itération future.
        </p>
      </section>
    </div>
  );
};
```

(La prop `onBack` est retirée — AppShell gère la navigation via la bottom tab bar / sidebar.)

### Step 2.2 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui   # 105 still pass
```

### Step 2.3 — Commit

```bash
git add src/core/components/Stats/StatsPage.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(stats): StatsPage refondu (drop header custom, période SegmentedControl, dark)"
```

---

## Task 3 : Wirer l'export dans `headerAction` AppShell

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

### Step 3.1 — Lire l'état actuel

Identifier :
- Le `case "stats"` du `renderView()` qui passe `onBack`.
- Le calcul de `headerAction`.

### Step 3.2 — Modifier `AppMain.tsx`

**a)** Ajouter un state pour le handler d'export :

```tsx
const exportHandlerRef = React.useRef<(() => void) | null>(null);
```

(Ou utiliser un `useState` si préféré. Le `useRef` est plus simple — on n'a pas besoin de re-render quand le handler change.)

**b)** Modifier le `case "stats"` du `renderView()` (le composant n'a plus de prop `onBack`) :

```tsx
case "stats":
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <StatsPage
        onExportRequest={(handler) => {
          exportHandlerRef.current = handler;
        }}
      />
    </Suspense>
  );
```

**c)** Modifier `headerAction` pour ajouter le bouton "Exporter" sur la vue stats :

```tsx
const headerAction = (() => {
  if (currentView === "lobby" || currentView === "tournois") {
    return {
      label: "Créer",
      onClick: handleCreateTable,
      icon: <span aria-hidden>+</span>,
    };
  }
  if (currentView === "stats") {
    return {
      label: "Exporter",
      onClick: () => exportHandlerRef.current?.(),
      icon: <span aria-hidden>📥</span>,
    };
  }
  return undefined;
})();
```

### Step 3.3 — Verify

```bash
npm run typecheck
npm run build
npx vitest run tests/ui
npm run test -- --run
```

Tester en local :
- Aller sur Stats → bouton "Exporter" dans le header → télécharge le JSON.
- Lobby → bouton "Créer" → ouvre BottomSheet.
- Tournois → bouton "Créer" → ouvre BottomSheet pré-réglé tournoi.
- Table fullscreen → pas de bouton (header masqué).

### Step 3.4 — Commit

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(stats): wirer headerAction Exporter via AppShell (vue stats)"
```

---

## Task 4 : Audit + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 4.1 — Audits

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

### Step 4.2 — Update `CHANGELOG.md`

Ajouter en haut :

```markdown
## [Unreleased] — Sprint 4 Refonte Stats

### Modifié
- `PlayerStats` réécrit visuellement : tokens Sprint 0 dark (`bg-bg-surface`, `bg-bg-elevated`, `text-text-primary`), composant pur `StatTile` factor pour les pavés (Victoires / Parties / Taux victoire / Jetons gagnés / etc.), badges classement (or, argent, bronze) avec tokens sémantiques. Logique inchangée (queries, leaderboard toggle).
- `StatsPage` réécrit : drop du header custom (gradient + Bouton Retour + UserProfile), tokens dark, `SegmentedControl` période (`7j` / `30j` / `90j` / `Tout`) qui filtre la liste des mains côté client, layout cards mobile-first au lieu d'une table HTML rigide. Prop `onBack` retirée — AppShell gère la navigation. Nouvelle prop `onExportRequest` qui expose le handler d'export à AppMain.
- `AppMain` : `headerAction` "Exporter" affiché sur la vue Stats (icône 📥), déclenche le téléchargement JSON via le handler exposé par StatsPage. Cohérent avec "Créer" sur lobby/tournois.

### Notes
- Pas de graphique recharts dans ce sprint (laissé pour itération future ou Sprint 6 polish).
- Pas de replay des mains (laissé pour itération).
- L'API publique des composants Stats est légèrement modifiée : `StatsPage.onBack` retiré, ajout de `StatsPage.onExportRequest`.
```

### Step 4.3 — Commit

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 4 refonte Stats"
```

---

## Critères de "Done" du Sprint 4

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] La page Stats est cohérente visuellement avec le reste de l'app (dark tokens).
- [ ] Le bouton "Exporter" du header AppShell télécharge le JSON quand on est sur la vue Stats.
- [ ] Le SegmentedControl période filtre la liste des mains affichées.
- [ ] CHANGELOG mis à jour.

## Hors scope

- Graphique d'évolution stack (recharts) → Sprint 6 ou itération.
- Replay des mains avec navigation ◀ ▶ → itération future.
- Filtres avancés (par type de partie, par adversaire, etc.) → backlog.
