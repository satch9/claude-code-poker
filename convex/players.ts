import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rebuyAmountSchema, validateOrThrow } from "./shared/validation";
import { requireSelf } from "./shared/auth";
import { sanitizePlayer } from "./shared/sanitize";
import { rateLimiter } from "./shared/rateLimit";

// Join a table as a player
export const joinTable = mutation({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
    buyInAmount: v.optional(v.number()),
    seatPosition: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    {
      const status = await rateLimiter.limit(ctx, "joinTable", { key: args.userId });
      if (!status.ok) throw new ConvexError("RateLimited: joinTable");
    }
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    // Check if user is already in the table
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingPlayer) {
      throw new Error("User already in table");
    }

    // Check if table is full
    const currentPlayers = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    if (currentPlayers.length >= table.maxPlayers) {
      throw new Error("Table is full");
    }

    // Get occupied seats
    const occupiedSeats = currentPlayers.map(p => p.seatPosition);
    
    let seatPosition: number;
    
    if (args.seatPosition !== undefined) {
      // User wants a specific seat
      if (args.seatPosition < 0 || args.seatPosition >= table.maxPlayers) {
        throw new Error("Invalid seat position");
      }
      
      if (occupiedSeats.includes(args.seatPosition)) {
        throw new Error("Seat is already occupied");
      }
      
      seatPosition = args.seatPosition;
    } else {
      // Find next available seat
      seatPosition = 0;
      for (let i = 0; i < table.maxPlayers; i++) {
        if (!occupiedSeats.includes(i)) {
          seatPosition = i;
          break;
        }
      }
    }

    // Determine starting chips amount, clamped between 1 and table.startingStack
    const startingChips =
      args.buyInAmount !== undefined
        ? Math.min(Math.max(1, Math.floor(args.buyInAmount)), table.startingStack)
        : table.startingStack;

    // Add player to table with starting chips
    const playerId = await ctx.db.insert("players", {
      userId: args.userId,
      tableId: args.tableId,
      seatPosition,
      chips: startingChips,
      cards: [],
      currentBet: 0,
      hasActed: false,
      isAllIn: false,
      isFolded: false,
      joinedAt: Date.now(),
    });

    // C6.3 : sync atomique du compteur dénormalisé.
    await ctx.db.patch(args.tableId, {
      playerCount: (table.playerCount ?? 0) + 1,
    });

    return { playerId, seatPosition };
  },
});

// Leave a table
export const leaveTable = mutation({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    const player = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!player) {
      throw new Error("Player not found in table");
    }

    // Check if game is active
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();

    // If hand is in progress, fold the player automatically before removing
    if (gameState && gameState.phase !== "waiting" && gameState.phase !== "showdown") {
      if (!player.isFolded) {
        await ctx.db.patch(player._id, {
          isFolded: true,
          hasActed: true,
          lastAction: "fold",
        });
      }
    }

    // Remove player from table
    await ctx.db.delete(player._id);

    // C6.3 : sync atomique du compteur dénormalisé.
    {
      const tbl = await ctx.db.get(args.tableId);
      if (tbl) {
        await ctx.db.patch(args.tableId, {
          playerCount: Math.max(0, (tbl.playerCount ?? 0) - 1),
        });
      }
    }

    // Log the leave event in the action feed
    const user = await ctx.db.get(player.userId);
    await ctx.db.insert("gameActions", {
      tableId: args.tableId,
      playerId: undefined,
      playerName: user?.name || "Joueur",
      action: "left",
      message: `${user?.name || "Joueur"} a quitté la table`,
      isSystem: true,
      timestamp: Date.now(),
    });

    // If fewer than 2 players remain, reset gameState to waiting (solo state)
    const remainingPlayers = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    if (remainingPlayers.length < 2 && gameState) {
      await ctx.db.patch(gameState._id, {
        phase: "waiting",
        pot: 0,
        currentBet: 0,
        communityCards: [],
        remainingDeck: [],
        sidePots: [],
        currentPlayerPosition: -1,
        autoAdvanceAt: undefined,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(args.tableId, { status: "waiting" });
    }

    return { success: true, chips: player.chips };
  },
});

// Get table players with user info
export const getTablePlayers = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Get user info for each player + sanitize private cards
    const playersWithUserInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...sanitizePlayer(player, callerId),
          user,
        };
      })
    );

    return playersWithUserInfo.sort((a, b) => a.seatPosition - b.seatPosition);
  },
});

// Get player by user and table
export const getPlayerByUserAndTable = query({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (player) {
      const user = await ctx.db.get(player.userId);
      return {
        ...player,
        user,
      };
    }

    return null;
  },
});

// Get active players (not folded)
export const getActivePlayers = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("isFolded"), false))
      .collect();

    const playersWithUserInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...sanitizePlayer(player, callerId),
          user,
        };
      })
    );

    return playersWithUserInfo.sort((a, b) => a.seatPosition - b.seatPosition);
  },
});
// Rebuy: remplace la stack du joueur en cash game (entre les mains)
export const rebuy = mutation({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    {
      const status = await rateLimiter.limit(ctx, "rebuy", { key: args.userId });
      if (!status.ok) throw new ConvexError("RateLimited: rebuy");
    }
    validateOrThrow(rebuyAmountSchema, args.amount);

    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    if (table.gameType !== "cash") {
      throw new Error("Rebuy n'est disponible qu'en cash game");
    }

    if (args.amount > table.startingStack) {
      throw new Error(`Le montant ne peut pas dépasser ${table.startingStack}`);
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!player) throw new Error("Joueur non trouvé à la table");

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();

    const phase = gameState?.phase ?? "waiting";
    const allowedBetweenHands = phase === "waiting" || phase === "showdown";
    const allowedAsFolded = player.isFolded === true;

    if (!allowedBetweenHands && !allowedAsFolded) {
      throw new Error("Recharge possible seulement entre les mains");
    }

    // Décision spec: remplace le stack (pas additif)
    await ctx.db.patch(player._id, { chips: args.amount });

    // Log dans le feed
    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("gameActions", {
      tableId: args.tableId,
      playerId: player._id,
      playerName: user?.name ?? "Joueur",
      action: "rebuy",
      amount: args.amount,
      message: `${user?.name ?? "Joueur"} se recave pour ${args.amount} jetons`,
      isSystem: true,
      timestamp: Date.now(),
    });

    return { success: true, chips: args.amount };
  },
});
