// One-shot admin mutation : vider toutes les tables liées au gameplay.
// À supprimer après usage. Conserve users + auth + notifications.

import { mutation } from "../_generated/server";

export const wipeGameData = mutation({
  args: {},
  handler: async (ctx) => {
    const targets = [
      "gameActions",
      "gameStates",
      "players",
      "invitations",
      "tables",
      "chatMessages",
    ] as const;

    const counts: Record<string, number> = {};
    for (const tableName of targets) {
      const rows = await ctx.db.query(tableName as any).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      counts[tableName] = rows.length;
    }
    return counts;
  },
});
