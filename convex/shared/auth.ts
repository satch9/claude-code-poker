import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireUserId(ctx: MutationCtx | QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthorized: not authenticated");
  return userId;
}

export async function requireSelf(
  ctx: MutationCtx | QueryCtx,
  claimedUserId: Id<"users">,
): Promise<Id<"users">> {
  const callerId = await requireUserId(ctx);
  if (callerId !== claimedUserId) {
    throw new ConvexError("Unauthorized: identity mismatch");
  }
  return callerId;
}

export async function requireTableCreator(
  ctx: MutationCtx,
  tableId: Id<"tables">,
): Promise<Id<"users">> {
  const callerId = await requireUserId(ctx);
  const table = await ctx.db.get(tableId);
  if (!table) throw new ConvexError("Table not found");
  if (table.creatorId !== callerId) {
    throw new ConvexError("Unauthorized: not creator");
  }
  return callerId;
}
