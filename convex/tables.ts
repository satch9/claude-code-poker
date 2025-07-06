import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new table
export const createTable = mutation({
  args: {
    name: v.string(),
    maxPlayers: v.number(),
    gameType: v.union(v.literal("cash"), v.literal("tournament")),
    buyIn: v.optional(v.number()),
    smallBlind: v.number(),
    bigBlind: v.number(),
    isPrivate: v.boolean(),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    let inviteCode: string | undefined;
    
    if (args.isPrivate) {
      // Generate a 6-character invite code
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const tableId = await ctx.db.insert("tables", {
      name: args.name,
      maxPlayers: args.maxPlayers,
      gameType: args.gameType,
      buyIn: args.buyIn,
      smallBlind: args.smallBlind,
      bigBlind: args.bigBlind,
      isPrivate: args.isPrivate,
      inviteCode,
      creatorId: args.creatorId,
      status: "waiting",
      createdAt: Date.now(),
    });

    // Initialize game state
    await ctx.db.insert("gameStates", {
      tableId,
      phase: "waiting",
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerPosition: 0,
      currentPlayerPosition: 0,
      sidePots: [],
      updatedAt: Date.now(),
    });

    return tableId;
  },
});

// Get all public tables
export const getPublicTables = query({
  handler: async (ctx) => {
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.eq(q.field("isPrivate"), false))
      .collect();

    // Get player count for each table
    const tablesWithPlayerCount = await Promise.all(
      tables.map(async (table) => {
        const playerCount = await ctx.db
          .query("players")
          .withIndex("by_table", (q) => q.eq("tableId", table._id))
          .collect()
          .then(players => players.length);

        return {
          ...table,
          playerCount,
        };
      })
    );

    return tablesWithPlayerCount;
  },
});

// Get table by ID
export const getTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tableId);
  },
});

// Get table by invite code
export const getTableByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();
  },
});

// Join a table
export const joinTable = mutation({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
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

    // Find next available seat
    const occupiedSeats = currentPlayers.map(p => p.seatPosition);
    let seatPosition = 0;
    for (let i = 0; i < table.maxPlayers; i++) {
      if (!occupiedSeats.includes(i)) {
        seatPosition = i;
        break;
      }
    }

    // Get user's chips for buy-in
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const buyInAmount = table.buyIn || 1000;
    if (user.chips < buyInAmount) {
      throw new Error("Not enough chips");
    }

    // Add player to table
    await ctx.db.insert("players", {
      userId: args.userId,
      tableId: args.tableId,
      seatPosition,
      chips: buyInAmount,
      cards: [],
      currentBet: 0,
      hasActed: false,
      isAllIn: false,
      isFolded: false,
      joinedAt: Date.now(),
    });

    // Update user's chips
    await ctx.db.patch(args.userId, {
      chips: user.chips - buyInAmount,
    });

    return seatPosition;
  },
});

// Get table players
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

// Get game state
export const getGameState = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();
  },
});