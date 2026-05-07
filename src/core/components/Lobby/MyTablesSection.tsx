import React from "react";
import { TableCard } from "./TableCard";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";

interface MyTablesSectionProps {
  tables: Table[];
  onJoinTable: (tableId: Id<"tables">) => void;
}

/**
 * Section dédiée aux tables où l'utilisateur courant est créateur ou
 * joueur assis. Visible uniquement quand non-vide. Inclut les tables
 * privées (contrairement à la section publique).
 */
export const MyTablesSection: React.FC<MyTablesSectionProps> = ({
  tables,
  onJoinTable,
}) => {
  if (tables.length === 0) return null;

  return (
    <section className="bg-bg-elevated border border-accent/30 rounded-xl p-3 md:p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Mes tables
        </h2>
        <span className="text-xs md:text-sm text-text-muted">
          {tables.length} {tables.length > 1 ? "tables" : "table"}
        </span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((table) => (
          <TableCard key={table._id} table={table} onJoin={onJoinTable} />
        ))}
      </div>
    </section>
  );
};
