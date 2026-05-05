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
}

export const Lobby: React.FC<LobbyProps> = ({
  title,
  onJoinTable,
  onCreateTable,
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
          <div className="flex justify-between items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate min-w-0">
              🃏 {title}
            </h1>
            <UserProfile compact />
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
            onCreateTable={onCreateTable}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
};
