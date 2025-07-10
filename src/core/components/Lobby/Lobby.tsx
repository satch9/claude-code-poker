import React from "react";
import { TableList } from "./TableList";
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
  // Appel Convex pour récupérer les tables avec info utilisateur
  const tables = useQuery(
    api.tables.getTablesWithUserInfo,
    user ? { userId: user._id } : "skip"
  );
  const loading = tables === undefined;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-50 to-poker-green-100">
      {/* Header fixe en haut */}
      <header className="bg-poker-green-100 backdrop-blur-sm border-b border-poker-green-300 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 truncate max-w-[300px] sm:max-w-none">🃏 {title}</h1>
            </div>

            {/* Profil utilisateur compact avec dialog */}
            <UserProfile compact />
          </div>
        </div>
      </header>

      {/* Contenu principal avec plus d'espace */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Liste des tables */}
          <TableList
            tables={tables || []}
            onJoinTable={onJoinTable}
            onCreateTable={onCreateTable}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
};
