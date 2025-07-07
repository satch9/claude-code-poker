import React, { useState } from "react";
import { AuthProvider } from "../Auth/AuthProvider";
import { LoginForm } from "../Auth/LoginForm";
import { Lobby } from "../Lobby/Lobby";
import { CreateTableForm, CreateTableData } from "../Table/CreateTableForm";
import { PokerTable } from "../Game/PokerTable";
import { useAuth } from "../../hooks/useAuth";
import { useTableActions } from "../../hooks/useTables";
// Table, Player, GameState plus nécessaires ici
import { Id } from "../../../convex/_generated/dataModel";

type AppView = "lobby" | "table" | "create-table";

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { createTable } = useTableActions();
  const [currentView, setCurrentView] = useState<AppView>("lobby");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleJoinTable = (tableId: string) => {
    setSelectedTableId(tableId);
    setCurrentView("table");
  };

  const handleCreateTable = () => {
    setCurrentView("create-table");
  };

  const handleTableCreated = async (tableData: CreateTableData) => {
    if (!user) return;
    
    try {
      const tableId = await createTable({
        ...tableData,
        creatorId: user._id,
      });
      
      // Automatically join the created table
      setSelectedTableId(tableId);
      setCurrentView("table");
    } catch (error) {
      console.error("Error creating table:", error);
      // TODO: Show error to user
    }
  };

  const handleCancelCreateTable = () => {
    setCurrentView("lobby");
  };

  const handleLeaveTable = () => {
    setCurrentView("lobby");
    setSelectedTableId(null);
  };

  // handlePlayerAction supprimé - géré directement par PokerTable

  const handleJoinSeat = (position: number) => {
    console.log("Joining seat:", position);
    // TODO: Implement join seat logic
  };

  // Les données sont maintenant récupérées directement par PokerTable via Convex

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-poker-green-600"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  // Render different views based on current state
  switch (currentView) {
    case "lobby":
      return (
        <Lobby
          onJoinTable={handleJoinTable}
          onCreateTable={handleCreateTable}
        />
      );

    case "table":
      if (!user || !selectedTableId) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 shadow-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Erreur</h2>
              <p className="text-gray-600 mb-6">
                Impossible de charger la table
              </p>
              <button
                onClick={() => setCurrentView("lobby")}
                className="bg-poker-green-600 text-white px-4 py-2 rounded hover:bg-poker-green-700"
              >
                Retour au lobby
              </button>
            </div>
          </div>
        );
      }

      return (
        <PokerTable
          tableId={selectedTableId as Id<"tables">}
          onLeaveTable={handleLeaveTable}
          onJoinSeat={handleJoinSeat}
        />
      );

    case "create-table":
      return (
        <CreateTableForm
          onSubmit={handleTableCreated}
          onCancel={handleCancelCreateTable}
        />
      );

    default:
      return (
        <Lobby
          onJoinTable={handleJoinTable}
          onCreateTable={handleCreateTable}
        />
      );
  }
};

export const AppMain: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
