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
 * joueur assis. Visible uniquement quand l'utilisateur a au moins
 * une table associée. Inclut les tables privées (contrairement à la
 * section publique).
 */
export const MyTablesSection: React.FC<MyTablesSectionProps> = ({
  tables,
  onJoinTable,
}) => {
  if (tables.length === 0) return null;

  return (
    <section className="bg-poker-green-50/60 border border-poker-green-200 rounded-xl p-3 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Mes tables
        </h2>
        <span className="text-xs sm:text-sm text-gray-600">
          {tables.length} {tables.length > 1 ? "tables" : "table"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {tables.map((table) => (
          <TableCard key={table._id} table={table} onJoin={onJoinTable} />
        ))}
      </div>
    </section>
  );
};
