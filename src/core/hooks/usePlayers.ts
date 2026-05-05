import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function usePlayers(tableId?: Id<"tables">) {
  // Get all players for a table
  const players = useQuery(
    api.players.getTablePlayers, 
    tableId ? { tableId } : "skip"
  );

  // Get active players (not folded)
  const activePlayers = useQuery(
    api.players.getActivePlayers,
    tableId ? { tableId } : "skip"
  );

  return {
    players,
    activePlayers,
    isLoading: tableId ? players === undefined : false,
  };
}

export function usePlayerActions() {
  const joinTable = useMutation(api.players.joinTable);
  const leaveTable = useMutation(api.players.leaveTable);

  const handleJoinTable = async (
    tableId: Id<"tables">,
    userId: Id<"users">,
    buyInAmount?: number
  ) => {
    try {
      const result = await joinTable({ tableId, userId, buyInAmount });
      return result;
    } catch (error) {
      console.error("Error joining table:", error);
      throw error;
    }
  };

  const handleLeaveTable = async (tableId: Id<"tables">, userId: Id<"users">) => {
    try {
      const result = await leaveTable({ tableId, userId });
      return result;
    } catch (error) {
      console.error("Error leaving table:", error);
      throw error;
    }
  };

  return {
    joinTable: handleJoinTable,
    leaveTable: handleLeaveTable,
  };
}

export function usePlayerByUserAndTable(tableId?: Id<"tables">, userId?: Id<"users">) {
  const player = useQuery(
    api.players.getPlayerByUserAndTable,
    tableId && userId ? { tableId, userId } : "skip"
  );

  return {
    player,
    isLoading: (tableId && userId) ? player === undefined : false,
    isInTable: player !== null,
  };
}