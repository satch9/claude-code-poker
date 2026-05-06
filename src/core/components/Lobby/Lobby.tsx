import React from "react";
import { TableList } from "./TableList";
import { MyTablesSection } from "./MyTablesSection";
import { JoinByCodeForm } from "./JoinByCodeForm";
import { UserProfile } from "../Auth/UserProfile";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface LobbyProps {
  title: string;
  onJoinTable: (tableId: Id<"tables">) => void;
  onCreateTable: () => void;
  onViewStats?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  title,
  onJoinTable,
  onCreateTable,
  onViewStats,
}) => {
  const { user } = useAuth();
  const data = useQuery(
    api.tables.getTablesWithUserInfo,
    user ? { userId: user._id } : "skip"
  );
  const loading = data === undefined;
  const myTables = data?.myTables ?? [];
  const publicTables = data?.publicTables ?? [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-50 to-poker-green-100">
      {/* Header fixe en haut */}
      <header className="bg-poker-green-100 backdrop-blur-sm border-b border-poker-green-300 sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-1 sm:gap-2">
            <h1 className="text-base sm:text-2xl font-bold text-gray-900 truncate min-w-0">
              🃏 {title}
            </h1>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onCreateTable}
                title="Créer une nouvelle table"
                className="h-10 sm:h-12 px-3 sm:px-4 inline-flex items-center gap-1 sm:gap-2 text-sm font-semibold rounded-lg bg-poker-green-700 hover:bg-poker-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <span aria-hidden>+</span>
                <span className="hidden sm:inline">Créer une table</span>
                <span className="sm:hidden">Créer</span>
              </button>
              {onViewStats && (
                <button
                  type="button"
                  onClick={onViewStats}
                  title="Mes statistiques"
                  className="h-10 sm:h-12 px-3 sm:px-4 inline-flex items-center gap-1 sm:gap-2 text-sm font-medium rounded-lg bg-white shadow-sm hover:shadow-md hover:bg-gray-50 text-gray-900 transition-all duration-200"
                >
                  <span aria-hidden>📊</span>
                  <span className="hidden sm:inline">Stats</span>
                </button>
              )}
              <UserProfile compact />
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <JoinByCodeForm onJoinTable={onJoinTable} />

          {/* Section "Mes tables" — visible seulement si non-vide */}
          {!loading && myTables.length > 0 && (
            <MyTablesSection tables={myTables} onJoinTable={onJoinTable} />
          )}

          {/* Section "Tables publiques" — toujours affichée */}
          <TableList
            tables={publicTables}
            onJoinTable={onJoinTable}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
};
