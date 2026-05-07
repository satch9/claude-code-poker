import React, { useState } from "react";
import { Trophy } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
import { TableCard } from "../Lobby/TableCard";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "../../../shared/utils/cn";

type TournamentFilter = "upcoming" | "running" | "history";

interface TournamentsScreenProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

const FILTERS: { id: TournamentFilter; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "running", label: "En cours" },
  { id: "history", label: "Historique" },
];

function tournamentMatchesFilter(table: Table, filter: TournamentFilter): boolean {
  const subStatus = (table as any).modules?.tournament?.status as
    | "registering"
    | "running"
    | "finished"
    | undefined;

  // Si sub-statut explicite, on l'utilise prioritairement.
  if (subStatus) {
    if (filter === "history") return subStatus === "finished";
    if (filter === "running") return subStatus === "running";
    return subStatus === "registering";
  }

  // Sinon, fallback sur table.status.
  if (filter === "history") return table.status === "finished";
  if (filter === "running") return table.status === "playing";
  return table.status === "waiting";
}

const SkeletonCard: React.FC = () => (
  <div className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
    <div className="h-4 bg-bg-elevated rounded w-1/2 mb-2" />
    <div className="h-3 bg-bg-elevated rounded w-1/3 mb-4" />
    <div className="h-3 bg-bg-elevated rounded w-2/3 mb-4" />
    <div className="flex justify-between items-center">
      <div className="h-3 bg-bg-elevated rounded w-1/4" />
      <div className="h-8 bg-bg-elevated rounded w-20" />
    </div>
  </div>
);

export const TournamentsScreen: React.FC<TournamentsScreenProps> = ({ onJoinTable }) => {
  const { user } = useAuth();
  const data = useQuery(
    api.tables.getTablesWithUserInfo,
    user ? { userId: user._id } : "skip",
  );
  const loading = data === undefined;
  const [filter, setFilter] = useState<TournamentFilter>("upcoming");

  const tournaments = React.useMemo(() => {
    if (!data) return [];
    const all = [...(data.myTables ?? []), ...(data.publicTables ?? [])] as Table[];
    const seen = new Set<string>();
    return all.filter((t) => {
      if (t.gameType !== "tournament") return false;
      const id = String(t._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data]);

  const filtered = tournaments.filter((t) => tournamentMatchesFilter(t, filter));

  return (
    <section className="container mx-auto max-w-5xl px-3 md:px-4 py-4 md:py-6 space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">Tournois</h2>
        <div
          role="tablist"
          aria-label="Filtre par statut de tournoi"
          className="inline-flex rounded-lg bg-bg-elevated p-1 border border-border-default"
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "min-h-tap px-3 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-white" : "text-text-muted hover:text-text-primary",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <TableCard key={t._id} table={t} onJoin={onJoinTable} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 bg-bg-surface border border-border-default rounded-lg">
          <div className="mb-2 flex justify-center" aria-hidden>
            <Trophy size={32} className="text-yellow-500" />
          </div>
          <p className="text-text-primary font-medium">Aucun tournoi</p>
          <p className="mt-1 text-sm text-text-muted">
            {filter === "upcoming"
              ? "Sois le premier à en créer un !"
              : filter === "running"
                ? "Aucun en cours pour le moment."
                : "Rien dans l'historique pour l'instant."}
          </p>
        </div>
      )}
    </section>
  );
};
