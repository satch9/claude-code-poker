import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
import { PlayerStats } from "./PlayerStats";
import { cn } from "../../../shared/utils/cn";

type Period = "7d" | "30d" | "90d" | "all";
type Mode = "all" | "tournament" | "cash";

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
  /** @deprecated AppShell handles navigation via tabs. Kept for backward compat during the migration. */
  onBack?: () => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({ onExportRequest, onBack: _onBack }) => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [mode, setMode] = useState<Mode>("all");

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

  // Filtre période + mode (tournoi/cash) côté client pour l'historique des mains.
  const filteredHands = useMemo(() => {
    if (!handsHistory) return [];
    const period_ = PERIODS.find((p) => p.id === period);
    const cutoff =
      period_ && period_.days !== null
        ? Date.now() - period_.days * 24 * 60 * 60 * 1000
        : null;
    return handsHistory.filter((h) => {
      if (cutoff !== null && h.endTs < cutoff) return false;
      if (mode !== "all" && h.gameType !== mode) return false;
      return true;
    });
  }, [handsHistory, period, mode]);

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
      <PlayerStats userId={user._id} showDetailed mode={mode} onModeChange={setMode} />

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
