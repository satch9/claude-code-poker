// Mutation interne pour patcher le secret d'un authAccount.
// Séparée de l'action (resetPasswords.ts) car celle-ci est en "use node".

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const patchSecret = internalMutation({
  args: { email: v.string(), hash: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), args.email),
        ),
      )
      .unique();
    if (!account) {
      return { ok: false, reason: "account not found" };
    }
    await ctx.db.patch(account._id, { secret: args.hash } as any);
    return { ok: true, accountId: account._id };
  },
});
