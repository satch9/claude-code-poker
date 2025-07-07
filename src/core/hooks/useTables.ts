import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function useTables() {
  const tables = useQuery(api.tables.getPublicTables);

  return {
    tables: tables || [],
    isLoading: tables === undefined,
  };
}

export function useTable(tableId?: Id<"tables">) {
  const table = useQuery(
    api.tables.getTable,
    tableId ? { tableId } : "skip"
  );

  const gameState = useQuery(
    api.tables.getGameState,
    tableId ? { tableId } : "skip"
  );

  return {
    table,
    gameState,
    isLoading: table === undefined || gameState === undefined,
  };
}

export function useTableActions() {
  const createTable = useMutation(api.tables.createTable);

  const handleCreateTable = async (tableData: {
    name: string;
    maxPlayers: number;
    gameType: "cash" | "tournament";
    buyIn?: number;
    smallBlind: number;
    bigBlind: number;
    isPrivate: boolean;
    creatorId: Id<"users">;
  }) => {
    try {
      const tableId = await createTable(tableData);
      return tableId;
    } catch (error) {
      console.error("Error creating table:", error);
      throw error;
    }
  };

  return {
    createTable: handleCreateTable,
  };
}