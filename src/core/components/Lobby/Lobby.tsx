import React from "react";
import { TableList } from "./TableList";
import { UserProfile } from "../Auth/UserProfile";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface LobbyProps {
  onJoinTable: (tableId: Id<"tables">) => void;
  onCreateTable: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinTable, onCreateTable }) => {
  const { user } = useAuth();
  // Appel Convex pour récupérer les tables avec info utilisateur
  const tables = useQuery(api.tables.getTablesWithUserInfo, 
    user ? { userId: user._id } : "skip"
  );
  const loading = tables === undefined;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-50 to-poker-green-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Votre tableau de jeu
            </h1>
            <p className="text-gray-600">
              Choisissez une table et commencez à jouer au poker avec d'autres
              joueurs
            </p>
          </div>

          <div className="w-full lg:w-auto lg:hidden">
            <UserProfile compact />
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Tables list - main content */}
          <div className="lg:col-span-3">
            <TableList
              tables={tables || []}
              onJoinTable={onJoinTable}
              onCreateTable={onCreateTable}
              loading={loading}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User profile */}
            <div className="hidden lg:block">
              <UserProfile showLogout />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
