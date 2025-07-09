import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Join a table as a player
export const joinTable = mutation({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
    buyInAmount: v.optional(v.number()),
    seatPosition: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

    // Determine starting chips amount
    const startingChips = args.buyInAmount || table.startingStack;

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

    if (gameState && gameState.phase !== "waiting") {
      throw new Error("Cannot leave table during active game");
    }

    // Remove player from table
    await ctx.db.delete(player._id);

    return { success: true, chips: player.chips };
  },
});

// Get table players with user info
export const getTablePlayers = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Get user info for each player
    const playersWithUserInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...player,
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

// Update player chips
export const updatePlayerChips = mutation({
  args: {
    playerId: v.id("players"),
    chips: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, {
      chips: args.chips,
    });
  },
});

// Update player action
export const updatePlayerAction = mutation({
  args: {
    playerId: v.id("players"),
    action: v.union(
      v.literal("fold"),
      v.literal("check"),
      v.literal("call"),
      v.literal("raise"),
      v.literal("all-in")
    ),
    currentBet: v.number(),
    hasActed: v.boolean(),
    isAllIn: v.optional(v.boolean()),
    isFolded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, {
      lastAction: args.action,
      currentBet: args.currentBet,
      hasActed: args.hasActed,
      isAllIn: args.isAllIn || false,
      isFolded: args.isFolded || false,
    });
  },
});

// Reset players for new hand
export const resetPlayersForNewHand = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Reset each player's hand state
    await Promise.all(
      players.map(async (player) => {
        await ctx.db.patch(player._id, {
          cards: [],
          currentBet: 0,
          hasActed: false,
          isAllIn: false,
          isFolded: false,
          lastAction: undefined,
        });
      })
    );
  },
});

// Get active players (not folded)
export const getActivePlayers = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("isFolded"), false))
      .collect();

    const playersWithUserInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...player,
          user,
        };
      })
    );

    return playersWithUserInfo.sort((a, b) => a.seatPosition - b.seatPosition);
  },
});