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

// Get all tables (public and private for lobby filtering)
export const getPublicTables = query({
  handler: async (ctx) => {
    // Get all tables that are not finished
    const tables = await ctx.db
      .query("tables")
      .filter((q) => q.neq(q.field("status"), "finished"))
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

// Mutations pour les players sont maintenant dans convex/players.ts

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