import { mutation, query, internalMutation } from "./_generated/server"; // query + internalMutation used in Tasks 5 & 6
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./shared/auth";
import { rateLimiter } from "./shared/rateLimit";
import { validateChatBody } from "./shared/chatValidation";

async function findSeatedPlayer(
  ctx: { db: any },
  tableId: Id<"tables">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();
}

export const sendMessage = mutation({
  args: {
    tableId: v.id("tables"),
    body: v.string(),
  },
  handler: async (ctx, { tableId, body }) => {
    const userId = await requireUserId(ctx);

    const seated = await findSeatedPlayer(ctx, tableId, userId);
    if (!seated) throw new ConvexError("NOT_SEATED");

    const validation = validateChatBody(body);
    if (!validation.ok) throw new ConvexError(validation.reason);

    const status = await rateLimiter.limit(ctx, "chatMessage", {
      key: `${userId}:${tableId}`,
    });
    if (!status.ok) throw new ConvexError("RATE_LIMIT");

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("USER_NOT_FOUND");

    const id = await ctx.db.insert("chatMessages", {
      tableId,
      userId,
      playerName: user.name,
      body: validation.body,
      createdAt: Date.now(),
    });

    return id;
  },
});
