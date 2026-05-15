// One-shot admin mutation : vider uniquement les tables/parties (gameplay).
// Conserve les utilisateurs, l'auth et les notifications.
// À supprimer après usage.

import { mutation } from "../_generated/server";

export const wipeTablesOnly = mutation({
  args: {},
  handler: async (ctx) => {
    const targets = [
      "gameActions",
      "gameStates",
      "players",
      "invitations",
      "chatMessages",
      "tables",
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
