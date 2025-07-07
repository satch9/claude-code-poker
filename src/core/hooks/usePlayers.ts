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
  const updatePlayerChips = useMutation(api.players.updatePlayerChips);
  const updatePlayerAction = useMutation(api.players.updatePlayerAction);

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

  const handleUpdateChips = async (playerId: Id<"players">, chips: number) => {
    try {
      await updatePlayerChips({ playerId, chips });
    } catch (error) {
      console.error("Error updating chips:", error);
      throw error;
    }
  };

  const handlePlayerAction = async (
    playerId: Id<"players">,
    action: "fold" | "check" | "call" | "raise" | "all-in",
    currentBet: number,
    hasActed: boolean,
    isAllIn?: boolean,
    isFolded?: boolean
  ) => {
    try {
      await updatePlayerAction({
        playerId,
        action,
        currentBet,
        hasActed,
        isAllIn,
        isFolded,
      });
    } catch (error) {
      console.error("Error updating player action:", error);
      throw error;
    }
  };

  return {
    joinTable: handleJoinTable,
    leaveTable: handleLeaveTable,
    updateChips: handleUpdateChips,
    updateAction: handlePlayerAction,
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