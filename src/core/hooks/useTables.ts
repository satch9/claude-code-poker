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
    isLoading: tableId ? (table === undefined || gameState === undefined) : false,
  };
}

export function useTableActions() {
  const createTable = useMutation(api.tables.createTable);

  const handleCreateTable = async (tableData: {
    name: string;
    maxPlayers: number;
    gameType: "cash" | "tournament";
    buyIn?: number;
    startingStack: number;
    smallBlind: number;
    bigBlind: number;
    isPrivate: boolean;
    preset?: "turbo" | "standard" | "long" | "custom";
    levelDurationMin?: number;
  }) => {
    try {
      // Whitelist explicite des champs envoyés au serveur. Évite qu'un
      // champ "extra" (ajouté par erreur côté UI ou en cache) ne fasse
      // jeter ArgumentValidationError par le validator strict de Convex.
      const payload = {
        name: tableData.name,
        maxPlayers: tableData.maxPlayers,
        gameType: tableData.gameType,
        buyIn: tableData.buyIn,
        startingStack: tableData.startingStack,
        smallBlind: tableData.smallBlind,
        bigBlind: tableData.bigBlind,
        isPrivate: tableData.isPrivate,
        preset: tableData.preset,
        levelDurationMin: tableData.levelDurationMin,
      };
      const tableId = await createTable(payload);
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