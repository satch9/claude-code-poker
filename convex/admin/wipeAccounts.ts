import { internalMutation, mutation } from "../_generated/server";

/**
 * TEMPORARY admin mutation — wipes ALL user/account/session/game data.
 *
 * Used once during the migration to `@convex-dev/auth` to remove all
 * legacy password records (the old custom hashed passwords are
 * incompatible with the new Password provider).
 *
 * Run via:
 *   npx convex run admin/wipeAccounts:wipeAll '{}'
 *
 * This mutation should be deleted in Task 11.
 */
async function wipeHandler(ctx: { db: any }) {
  const tables = [
    // Game data
    "players",
    "gameStates",
    "gameActions",
    "tables",
    "invitations",
    "notifications",
    // App users
    "users",
    // @convex-dev/auth tables
    "authAccounts",
    "authSessions",
    "authRefreshTokens",
    "authVerificationCodes",
    "authVerifiers",
    "authRateLimits",
  ] as const;

  const summary: Record<string, number | string> = {};

  for (const t of tables) {
    try {
      const docs = await ctx.db.query(t as any).collect();
      for (const d of docs) {
        await ctx.db.delete(d._id);
      }
      summary[t] = docs.length;
    } catch (e) {
      summary[t] = `skipped: ${String(e)}`;
    }
  }

  return summary;
}

export const wipeAll = internalMutation({
  args: {},
  handler: async (ctx) => wipeHandler(ctx),
});

// Public alias so we can call it from the CLI without --internal flag.
// (`npx convex run admin/wipeAccounts:wipeAllPublic '{}'`)
export const wipeAllPublic = mutation({
  args: {},
  handler: async (ctx) => wipeHandler(ctx),
});
