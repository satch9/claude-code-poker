// One-shot admin mutation : vider TOUTES les tables (gameplay + users + auth).
// À supprimer après usage.

import { mutation } from "../_generated/server";

export const wipeGameData = mutation({
  args: {},
  handler: async (ctx) => {
    const targets = [
      // Gameplay
      "gameActions",
      "gameStates",
      "players",
      "invitations",
      "tables",
      "chatMessages",
      // Users & notifications
      "notifications",
      "passwordResetTokens",
      "users",
      // Auth (@convex-dev/auth)
      "authAccounts",
      "authSessions",
      "authRefreshTokens",
      "authVerificationCodes",
      "authVerifiers",
      "authRateLimits",
    ] as const;

    const counts: Record<string, number> = {};
    for (const tableName of targets) {
      try {
        const rows = await ctx.db.query(tableName as any).collect();
        for (const row of rows) {
          await ctx.db.delete(row._id);
        }
        counts[tableName] = rows.length;
      } catch (e) {
        counts[tableName] = -1;
      }
    }
    return counts;
  },
});
