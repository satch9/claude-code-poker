import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createTableSchema, validateOrThrow } from "./shared/validation";
import { sanitizeGameState } from "./shared/sanitize";
import { requireUserId } from "./shared/auth";
import { rateLimiter } from "./shared/rateLimit";

// Invite code generation : crypto-secure 6 chars [0-9A-Z]
const INVITE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateInviteCode(): string {
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((n) => INVITE_ALPHABET[n % INVITE_ALPHABET.length])
    .join("");
}

// Create a new table
export const createTable = mutation({
  args: {
    name: v.string(),
    maxPlayers: v.number(),
    gameType: v.union(v.literal("cash"), v.literal("tournament")),
    buyIn: v.optional(v.number()), // Montant payé pour participer (tournois uniquement)
    startingStack: v.number(), // Jetons de départ reçus
    smallBlind: v.number(),
    bigBlind: v.number(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const creatorId = await requireUserId(ctx);
    validateOrThrow(createTableSchema, {
      name: args.name,
      maxPlayers: args.maxPlayers,
      gameType: args.gameType,
      buyIn: args.buyIn,
      startingStack: args.startingStack,
      smallBlind: args.smallBlind,
      bigBlind: args.bigBlind,
      isPrivate: args.isPrivate,
    });

    // Génération inconditionnelle d'un code (6 chars A-Z0-9) pour permettre
    // le partage par code même pour les tables publiques.
    // Crypto-secure RNG + check unicité avec retry max 5x.
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await ctx.db
        .query("tables")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .first();
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const tableId = await ctx.db.insert("tables", {
      name: args.name,
      maxPlayers: args.maxPlayers,
      gameType: args.gameType,
      buyIn: args.buyIn,
      startingStack: args.startingStack,
      smallBlind: args.smallBlind,
      bigBlind: args.bigBlind,
      isPrivate: args.isPrivate,
      inviteCode,
      creatorId,
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
    // Get all tables that are not finished and not private (B-runtime.2)
    const tables = await ctx.db
      .query("tables")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "finished"),
          q.eq(q.field("isPrivate"), false),
        ),
      )
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

// Get tables groupées en 2 catégories pour le lobby :
//   - myTables: tables où l'utilisateur est créateur ou joueur assis
//                (incluant les tables privées) → visible uniquement à lui
//   - publicTables: tables publiques où l'utilisateur n'est PAS lié
//                    (les tables privées d'autres users sont exclues, B-runtime.2)
export const getTablesWithUserInfo = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const allTables = await ctx.db
      .query("tables")
      .filter((q) => q.neq(q.field("status"), "finished"))
      .collect();

    const tablesWithInfo = await Promise.all(
      allTables.map(async (table) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_table", (q) => q.eq("tableId", table._id))
          .collect();

        const playerCount = players.length;
        const isUserSeated = args.userId
          ? players.some((p) => p.userId === args.userId)
          : false;
        const isUserCreator = args.userId
          ? table.creatorId === args.userId
          : false;

        return {
          ...table,
          playerCount,
          isUserSeated,
          isUserCreator,
        };
      })
    );

    const myTables = tablesWithInfo.filter(
      (t) => t.isUserCreator || t.isUserSeated
    );
    const publicTables = tablesWithInfo.filter(
      (t) => !t.isPrivate && !t.isUserCreator && !t.isUserSeated
    );

    return { myTables, publicTables };
  },
});

// Get table by ID
export const getTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tableId);
  },
});

// Mutations pour les players sont maintenant dans convex/players.ts

// Get game state
export const getGameState = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();
    return sanitizeGameState(state);
  },
});
// Lookup d'une table par son inviteCode (6 chars uppercase)
export const getTableByInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.toUpperCase().trim();
    if (code.length !== 6) return null;

    const callerId = await getAuthUserId(ctx);

    const table = await ctx.db
      .query("tables")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();

    if (!table) return null;

    // Privacy filter (C2.20): pour les tables privées, on ne révèle l'existence
    // qu'aux callers déjà membres (creator ou joueur assis).
    if (table.isPrivate) {
      if (!callerId) return null;
      const isCreator = table.creatorId === callerId;
      let isMember = isCreator;
      if (!isMember) {
        const seated = await ctx.db
          .query("players")
          .withIndex("by_table", (q) => q.eq("tableId", table._id))
          .filter((q) => q.eq(q.field("userId"), callerId))
          .first();
        isMember = !!seated;
      }
      if (!isMember) return null;
    }

    // Compter les joueurs pour donner du contexte au frontend
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", table._id))
      .collect();

    return {
      _id: table._id,
      name: table.name,
      status: table.status,
      maxPlayers: table.maxPlayers,
      gameType: table.gameType,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      currentPlayers: players.length,
    };
  },
});

// Wrapper mutation pour rate-limiter le lookup invite code (10/min/caller).
// À utiliser pour les flows "join by code" en remplacement direct de la query.
// La query reste publique pour la lecture passive (useQuery réactif), avec
// privacy filter appliqué.
export const lookupInviteCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    const status = await rateLimiter.limit(ctx, "inviteLookup", {
      key: callerId ?? "anonymous",
    });
    if (!status.ok) {
      throw new ConvexError("RateLimited: too many invite lookups");
    }

    const code = args.code.toUpperCase().trim();
    if (code.length !== 6) return null;

    const table = await ctx.db
      .query("tables")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!table) return null;

    if (table.isPrivate) {
      if (!callerId) return null;
      const isCreator = table.creatorId === callerId;
      let isMember = isCreator;
      if (!isMember) {
        const seated = await ctx.db
          .query("players")
          .withIndex("by_table", (q) => q.eq("tableId", table._id))
          .filter((q) => q.eq(q.field("userId"), callerId))
          .first();
        isMember = !!seated;
      }
      if (!isMember) return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", table._id))
      .collect();

    return {
      _id: table._id,
      name: table.name,
      status: table.status,
      maxPlayers: table.maxPlayers,
      gameType: table.gameType,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      currentPlayers: players.length,
    };
  },
});
