import React, { useState } from "react";
import { TableCard } from "./TableCard";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "../../../shared/utils/cn";

type Filter = "all" | "cash" | "tournament";

interface TableListProps {
  tables: Table[];
  onJoinTable: (tableId: Id<"tables">) => void;
  loading?: boolean;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "cash", label: "Cash" },
  { id: "tournament", label: "Tournois" },
];

const SkeletonCard: React.FC = () => (
  <div className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
    <div className="h-4 bg-bg-elevated rounded w-1/2 mb-2" />
    <div className="h-3 bg-bg-elevated rounded w-1/3 mb-4" />
    <div className="h-3 bg-bg-elevated rounded w-2/3 mb-2" />
    <div className="h-3 bg-bg-elevated rounded w-1/2 mb-4" />
    <div className="flex justify-between items-center">
      <div className="h-3 bg-bg-elevated rounded w-1/4" />
      <div className="h-8 bg-bg-elevated rounded w-20" />
    </div>
  </div>
);

export const TableList: React.FC<TableListProps> = ({
  tables,
  onJoinTable,
  loading = false,
}) => {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = tables.filter((t) => filter === "all" || t.gameType === filter);

  return (
    <section className="space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Tables disponibles
        </h2>
        <div
          role="tablist"
          aria-label="Filtre par type de partie"
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
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-primary",
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
          <div className="text-3xl mb-2" aria-hidden>
            🃏
          </div>
          <p className="text-text-primary font-medium">Aucune table disponible</p>
          <p className="mt-1 text-sm text-text-muted">
            {filter !== "all"
              ? `Aucune table ${filter === "cash" ? "cash" : "tournoi"} pour le moment.`
              : "Sois le premier à en créer une !"}
          </p>
        </div>
      )}
    </section>
  );
};
