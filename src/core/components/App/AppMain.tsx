import React, { useEffect, useState } from "react";
import { AuthProvider } from "../Auth/AuthProvider";
import { LoginForm } from "../Auth/LoginForm";
import { Lobby } from "../Lobby/Lobby";
import { CreateTableForm, CreateTableData } from "../Table/CreateTableForm";
import { PokerTable } from "../Game/PokerTable";
import { useAuth } from "../../hooks/useAuth";
import { useTableActions } from "../../hooks/useTables";
import { usePendingJoin } from "../../hooks/usePendingJoin";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
// Table, Player, GameState plus nécessaires ici
import { Id } from "../../../../convex/_generated/dataModel";

type AppView = "lobby" | "table" | "create-table";

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { createTable } = useTableActions();
  const joinTableMutation = useMutation(api.players.joinTable);
  const leaveTableMutation = useMutation(api.players.leaveTable);
  const [currentView, setCurrentView] = useState<AppView>("lobby");
  const [selectedTableId, setSelectedTableId] = useState<Id<"tables"> | null>(
    null
  );

  const { pendingCode, clearPending } = usePendingJoin();

  // Lookup de la table associée au code en attente
  const pendingTable = useQuery(
    api.tables.getTableByInviteCode,
    pendingCode ? { code: pendingCode } : "skip"
  );

  // Auto-join quand user authentifié + table résolue
  useEffect(() => {
    if (!user || !pendingCode || pendingTable === undefined) return;

    if (pendingTable === null) {
      // Code invalide (ou table supprimée) — clear et continue
      console.warn("Invalid invite code:", pendingCode);
      clearPending();
      return;
    }

    // Table trouvée. Naviguer + tenter l'auto-join (idempotent).
    setSelectedTableId(pendingTable._id);
    setCurrentView("table");

    // Tenter de s'asseoir sur un siège libre. Si déjà assis,
    // joinTable jettera "User already in table" → on l'ignore silencieusement.
    joinTableMutation({
      tableId: pendingTable._id,
      userId: user._id,
    })
      .catch((err) => {
        const msg = err?.message ?? String(err);
        if (msg.includes("User already in table")) {
          // OK, l'utilisateur est déjà à la table — on garde la navigation
          return;
        }
        if (msg.includes("Table is full")) {
          alert("La table est complète, impossible de rejoindre.");
          setCurrentView("lobby");
          setSelectedTableId(null);
          return;
        }
        console.error("Auto-join failed:", err);
      })
      .finally(() => {
        clearPending();
      });
  }, [user, pendingCode, pendingTable, joinTableMutation, clearPending]);

  const title = "Poker Famille !";

  const handleJoinTable = async (tableId: Id<"tables">) => {
    if (!user) return;

    // Check if user is already seated at this table
    try {
      // First, just navigate to the table - if user is seated, they'll see the game
      // If not seated, they can click on an empty seat
      setSelectedTableId(tableId);
      setCurrentView("table");
    } catch (error) {
      console.error("Error joining table:", error);
    }
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

      // Auto-seat le créateur sur le siège 0 (B2.4)
      try {
        await joinTableMutation({
          tableId,
          userId: user._id,
          seatPosition: 0,
        });
      } catch (joinError) {
        console.warn(
          "Auto-seat échoué, l'utilisateur devra cliquer manuellement",
          joinError,
        );
      }

      // Automatically open the created table
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

  const handleLeaveTable = async () => {
    if (user && selectedTableId) {
      try {
        await leaveTableMutation({ tableId: selectedTableId, userId: user._id });
      } catch (error) {
        // Si le user n'est pas dans la table (déjà parti, etc.), on continue la navigation
        console.warn("leaveTable failed (continuing to lobby):", error);
      }
    }
    setCurrentView("lobby");
    setSelectedTableId(null);
  };

  // handlePlayerAction supprimé - géré directement par PokerTable

  const handleJoinSeat = async (position: number) => {
    if (!user || !selectedTableId) {
      console.error("User or table not available");
      return;
    }

    try {
      const result = await joinTableMutation({
        tableId: selectedTableId,
        userId: user._id,
        seatPosition: position,
      });

      console.log("Successfully joined seat:", result.seatPosition);
    } catch (error) {
      console.error("Error joining seat:", error);
      // TODO: Show error notification to user
    }
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
          title={title}
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

      // selectedTableId est garanti d'être non-null ici grâce au check ci-dessus
      return (
        <PokerTable
          key={selectedTableId}
          tableId={selectedTableId}
          appTitle={title}
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
          title={title}
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
