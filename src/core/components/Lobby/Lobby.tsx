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
  // Appel Convex pour récupérer les tables publiques
  const tables = useQuery(api.tables.getPublicTables);
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

          <div className="w-full lg:w-auto">
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
            <UserProfile showLogout />

            {/* Quick actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Actions rapides
              </h3>
              <div className="space-y-3">
                <button
                  onClick={onCreateTable}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    Créer une table
                  </div>
                  <div className="text-sm text-gray-500">
                    Commencer une nouvelle partie
                  </div>
                </button>

                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">
                    Rejoindre par code
                  </div>
                  <div className="text-sm text-gray-500">
                    Table privée avec code d'invitation
                  </div>
                </button>

                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">
                    Parties rapides
                  </div>
                  <div className="text-sm text-gray-500">
                    Rejoindre automatiquement
                  </div>
                </button>
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activité récente
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière partie:</span>
                  <span className="font-medium">Il y a 2h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tables créées:</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parties jouées:</span>
                  <span className="font-medium">12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
