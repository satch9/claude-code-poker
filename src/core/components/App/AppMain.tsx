import React, { useState } from "react";
import { AuthProvider } from "../Auth/AuthProvider";
import { LoginForm } from "../Auth/LoginForm";
import { Lobby } from "../Lobby/Lobby";
import { CreateTableForm, CreateTableData } from "../Table/CreateTableForm";
import { PokerTable } from "../Game/PokerTable";
import { useAuth } from "../../hooks/useAuth";
import { useTableActions } from "../../hooks/useTables";
import { Table, Player, GameState } from "../../../shared/types";

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

  const handlePlayerAction = (action: string, amount?: number) => {
    console.log("Player action:", action, amount);
    // TODO: Implement player action logic
  };

  const handleJoinSeat = (position: number) => {
    console.log("Joining seat:", position);
    // TODO: Implement join seat logic
  };

  // Mock data for table view
  const mockTable: Table = {
    _id: selectedTableId as any,
    name: "Table de démonstration",
    maxPlayers: 6,
    gameType: "cash",
    smallBlind: 10,
    bigBlind: 20,
    isPrivate: false,
    creatorId: user?._id as any,
    status: "playing",
    createdAt: Date.now(),
  };

  const mockPlayers: Player[] = [
    {
      _id: "player1" as any,
      userId: user?._id as any,
      tableId: selectedTableId as any,
      seatPosition: 0,
      chips: 2500,
      cards: ["Ah", "Kh"],
      currentBet: 0,
      hasActed: false,
      isAllIn: false,
      isFolded: false,
      joinedAt: Date.now(),
      user: user,
    },
    {
      _id: "player2" as any,
      userId: "user2" as any,
      tableId: selectedTableId as any,
      seatPosition: 2,
      chips: 1800,
      cards: ["??", "??"],
      currentBet: 20,
      hasActed: true,
      isAllIn: false,
      isFolded: false,
      lastAction: "call",
      joinedAt: Date.now(),
      user: {
        _id: "user2" as any,
        name: "Alice",
        email: "alice@test.com",
        createdAt: Date.now(),
      },
    },
    {
      _id: "player3" as any,
      userId: "user3" as any,
      tableId: selectedTableId as any,
      seatPosition: 4,
      chips: 3200,
      cards: ["??", "??"],
      currentBet: 0,
      hasActed: false,
      isAllIn: false,
      isFolded: true,
      lastAction: "fold",
      joinedAt: Date.now(),
      user: {
        _id: "user3" as any,
        name: "Bob",
        email: "bob@test.com",
        createdAt: Date.now(),
      },
    },
  ];

  const mockGameState: GameState = {
    _id: "gamestate1" as any,
    tableId: selectedTableId as any,
    phase: "flop",
    communityCards: ["Ac", "Kd", "7h"],
    pot: 150,
    currentBet: 20,
    dealerPosition: 4,
    currentPlayerPosition: 0,
    sidePots: [],
    updatedAt: Date.now(),
  };

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
          table={mockTable}
          players={mockPlayers}
          gameState={mockGameState}
          currentUser={user}
          onLeaveTable={handleLeaveTable}
          onPlayerAction={handlePlayerAction}
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
