import React, { useState } from "react";
import { TableCard } from "./TableCard";
import { Button } from "../UI/Button";
import { Table } from "../../../shared/types";
import { Id } from "../../../../convex/_generated/dataModel";

interface TableListProps {
  tables: Table[];
  onJoinTable: (tableId: Id<"tables">) => void;
  onCreateTable: () => void;
  loading?: boolean;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  onJoinTable,
  onCreateTable,
  loading = false,
}) => {
  const [filter, setFilter] = useState<"all" | "cash" | "tournament">("all");

  // Note: la checkbox "Tables privées" a été retirée — depuis le fix
  // B-runtime.2 (1.B), getPublicTables filtre déjà isPrivate=false côté
  // serveur, donc la liste ne contient plus que des tables publiques.
  const filteredTables = tables.filter((table) => {
    return filter === "all" || table.gameType === filter;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header — titre + CTA "Créer" sur mobile, tout aligné sur desktop */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Tables disponibles
          </h2>
          {/* CTA "Créer" inline avec le titre sur mobile */}
          <Button
            variant="success"
            className="text-sm font-medium sm:hidden"
            onClick={onCreateTable}
          >
            + Créer
          </Button>
        </div>

        {/* Filtres — scrollable horizontalement si nécessaire sur mobile */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 sm:overflow-visible sm:gap-4">
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant={filter === "all" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Toutes
            </Button>
            <Button
              variant={filter === "cash" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("cash")}
            >
              Cash
            </Button>
            <Button
              variant={filter === "tournament" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("tournament")}
            >
              Tournois
            </Button>
          </div>

          {/* CTA "Créer" version desktop, à droite des filtres */}
          <Button
            variant="success"
            className="text-sm font-medium hidden sm:inline-flex flex-shrink-0"
            onClick={onCreateTable}
          >
            + Créer une table
          </Button>
        </div>
      </div>

      {/* Tables grid */}
      {filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <TableCard key={table._id} table={table} onJoin={onJoinTable} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">
            Aucune table disponible
          </div>
          <p className="text-gray-500 mb-6">
            {filter !== "all"
              ? `Aucune table ${filter} trouvée. Essayez de changer les filtres.`
              : "Soyez le premier à créer une table !"}
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">
              {tables.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Tables</div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-bold text-poker-green-600">
              {tables.filter((t) => t.gameType === "cash").length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Cash</div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {tables.filter((t) => t.gameType === "tournament").length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Tournois</div>
          </div>
        </div>
      </div>
    </div>
  );
};
