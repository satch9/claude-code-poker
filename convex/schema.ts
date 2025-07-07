import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    password: v.optional(v.string()), // For email/password auth
    createdAt: v.number(),
    lastSeen: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // Tables table
  tables: defineTable({
    name: v.string(),
    maxPlayers: v.number(),
    gameType: v.union(v.literal("cash"), v.literal("tournament")),
    buyIn: v.optional(v.number()),
    smallBlind: v.number(),
    bigBlind: v.number(),
    isPrivate: v.boolean(),
    inviteCode: v.optional(v.string()),
    creatorId: v.id("users"),
    status: v.union(
      v.literal("waiting"), 
      v.literal("playing"), 
      v.literal("finished")
    ),
    createdAt: v.number(),
    // Modular data for extensions
    modules: v.optional(v.object({
      tournament: v.optional(v.object({
        blindStructure: v.array(v.object({
          level: v.number(),
          smallBlind: v.number(),
          bigBlind: v.number(),
          duration: v.number(),
        })),
        currentBlindLevel: v.number(),
        nextBlindIncrease: v.number(),
        prizeStructure: v.array(v.object({
          position: v.number(),
          percentage: v.number(),
        })),
      })),
      invitations: v.optional(v.object({
        maxInvitations: v.number(),
        pendingInvitations: v.array(v.id("invitations")),
      })),
    })),
  })
    .index("by_status", ["status"])
    .index("by_creator", ["creatorId"])
    .index("by_invite_code", ["inviteCode"]),

  // Players in tables
  players: defineTable({
    userId: v.id("users"),
    tableId: v.id("tables"),
    seatPosition: v.number(),
    chips: v.number(),
    cards: v.array(v.string()),
    currentBet: v.number(),
    hasActed: v.boolean(),
    isAllIn: v.boolean(),
    isFolded: v.boolean(),
    lastAction: v.optional(v.union(
      v.literal("fold"),
      v.literal("check"),
      v.literal("call"),
      v.literal("raise"),
      v.literal("all-in")
    )),
    joinedAt: v.number(),
  })
    .index("by_table", ["tableId"])
    .index("by_user", ["userId"])
    .index("by_table_seat", ["tableId", "seatPosition"]),

  // Game states
  gameStates: defineTable({
    tableId: v.id("tables"),
    phase: v.union(
      v.literal("waiting"),
      v.literal("preflop"),
      v.literal("flop"),
      v.literal("turn"),
      v.literal("river"),
      v.literal("showdown")
    ),
    communityCards: v.array(v.string()),
    pot: v.number(),
    currentBet: v.number(),
    dealerPosition: v.number(),
    currentPlayerPosition: v.number(),
    lastRaiserPosition: v.optional(v.number()),
    sidePots: v.array(v.object({
      amount: v.number(),
      eligiblePlayers: v.array(v.id("users")),
    })),
    updatedAt: v.number(),
  }).index("by_table", ["tableId"]),

  // Invitations
  invitations: defineTable({
    tableId: v.id("tables"),
    fromUserId: v.id("users"),
    toEmail: v.optional(v.string()),
    toUserId: v.optional(v.id("users")),
    inviteCode: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_table", ["tableId"])
    .index("by_recipient", ["toUserId"])
    .index("by_email", ["toEmail"])
    .index("by_code", ["inviteCode"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("table_invitation"),
      v.literal("game_start"),
      v.literal("turn_reminder"),
      v.literal("game_end")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});