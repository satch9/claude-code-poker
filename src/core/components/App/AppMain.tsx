import React, { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "../Auth/AuthProvider";
import { LoginForm } from "../Auth/LoginForm";
import { PasswordResetForm } from "../Auth/PasswordResetForm";
import { Lobby } from "../Lobby/Lobby";
import { TournamentsScreen } from "../Tournament/TournamentsScreen";
import { CreateTableForm } from "../Table/CreateTableForm";
import type { CreateTableData } from "../Table/CreateTableForm";
import { SuspenseFallback } from "../UI/SuspenseFallback";
import { AppShell } from "../../../shared/ui/AppShell";
import { BottomSheet } from "../../../shared/ui/BottomSheet";
import type { TabItem } from "../../../shared/ui/TabBar";
import { useAuth } from "../../hooks/useAuth";
import { useTableActions } from "../../hooks/useTables";
import { usePendingJoin } from "../../hooks/usePendingJoin";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
// Table, Player, GameState plus nécessaires ici
import { Id } from "../../../../convex/_generated/dataModel";

const PokerTable = lazy(() =>
  import("../Game/PokerTable").then((m) => ({ default: m.PokerTable }))
);
const StatsPage = lazy(() =>
  import("../Stats/StatsPage").then((m) => ({ default: m.StatsPage }))
);

type AppView = "lobby" | "table" | "stats" | "tournois";

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { createTable } = useTableActions();
  const joinTableMutation = useMutation(api.players.joinTable);
  const leaveTableMutation = useMutation(api.players.leaveTable);
  const [currentView, setCurrentView] = useState<AppView>("lobby");
  const [selectedTableId, setSelectedTableId] = useState<Id<"tables"> | null>(
    null
  );
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const exportHandlerRef = React.useRef<(() => void) | null>(null);

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
    setShowCreateSheet(true);
  };

  const handleTableCreated = async (tableData: CreateTableData) => {
    if (!user) return;

    try {
      const tableId = await createTable({
        ...tableData,
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
      setShowCreateSheet(false);
    } catch (error) {
      console.error("Error creating table:", error);
      // TODO: Show error to user
    }
  };

  const handleCancelCreateTable = () => {
    setShowCreateSheet(false);
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

  type TabId = "lobby" | "tournois" | "stats" | "profil";

  const tabs: TabItem[] = [
    { id: "lobby", label: "Lobby", icon: <span aria-hidden>🃏</span> },
    { id: "tournois", label: "Tournois", icon: <span aria-hidden>🏆</span> },
    { id: "stats", label: "Stats", icon: <span aria-hidden>📊</span> },
    { id: "profil", label: "Profil", icon: <span aria-hidden>👤</span> },
  ];

  const viewToTab = (v: AppView): TabId => {
    if (v === "stats") return "stats";
    if (v === "tournois") return "tournois";
    return "lobby";
  };

  const onTabChange = (id: string) => {
    if (id === "stats") setCurrentView("stats");
    else if (id === "lobby") setCurrentView("lobby");
    else if (id === "tournois") setCurrentView("tournois");
    else if (id === "profil") {
      setCurrentView("lobby");
      alert("La refonte Profil arrive au Sprint 5.");
    }
  };

  const headerTitle = (() => {
    switch (currentView) {
      case "lobby": return title;
      case "tournois": return "Tournois";
      case "stats": return "Stats";
      case "table": return title;
      default: return title;
    }
  })();

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case "lobby":
        return <Lobby onJoinTable={handleJoinTable} />;

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
          <Suspense fallback={<SuspenseFallback />}>
            <PokerTable
              key={selectedTableId}
              tableId={selectedTableId}
              appTitle={title}
              onLeaveTable={handleLeaveTable}
              onJoinSeat={handleJoinSeat}
            />
          </Suspense>
        );

      case "tournois":
        return <TournamentsScreen onJoinTable={handleJoinTable} />;

      case "stats":
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <StatsPage
              onExportRequest={(handler) => {
                exportHandlerRef.current = handler;
              }}
            />
          </Suspense>
        );

      default:
        return <Lobby onJoinTable={handleJoinTable} />;
    }
  };

  const headerAction = (() => {
    if (currentView === "lobby" || currentView === "tournois") {
      return {
        label: "Créer",
        onClick: handleCreateTable,
        icon: <span aria-hidden>+</span>,
      };
    }
    if (currentView === "stats") {
      return {
        label: "Exporter",
        onClick: () => exportHandlerRef.current?.(),
        icon: <span aria-hidden>📥</span>,
      };
    }
    return undefined;
  })();

  return (
    <>
      <AppShell
        title={headerTitle}
        tabs={tabs}
        activeTabId={viewToTab(currentView)}
        onTabChange={onTabChange}
        fullscreen={currentView === "table"}
        headerAction={headerAction}
      >
        {renderView()}
      </AppShell>
      <BottomSheet
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title={currentView === "tournois" ? "Créer un nouveau tournoi" : "Créer une nouvelle table"}
      >
        <CreateTableForm
          onSubmit={handleTableCreated}
          onCancel={handleCancelCreateTable}
          defaultGameType={currentView === "tournois" ? "tournament" : "cash"}
        />
      </BottomSheet>
    </>
  );
};

export const AppMain: React.FC = () => {
  // Route /reset?token=… : autonome (n'a pas besoin de l'AuthProvider).
  if (typeof window !== "undefined" && window.location.pathname === "/reset") {
    return <PasswordResetForm />;
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
