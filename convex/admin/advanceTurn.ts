// One-shot admin : avance currentPlayerPosition au prochain joueur à agir
// quand la main est bloquée (typiquement après qu'un joueur a quitté).

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { endHand } from "../core/gameEngine";

// Force la montée au niveau suivant en mettant nextBlindIncrease dans le passé.
// Le passage effectif se fait à la prochaine main (startNextHandInternal).
export const forceNextBlindLevel = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table || !table.modules?.tournament) throw new Error("Not a tournament table");
    const t = table.modules.tournament;
    await ctx.db.patch(args.tableId, {
      modules: {
        ...table.modules,
        tournament: {
          ...t,
          nextBlindIncrease: Date.now() - 1000,
        },
      },
    });
    return { ok: true, currentBlindLevel: t.currentBlindLevel };
  },
});

// Force immédiatement le passage au niveau suivant (sans attendre la prochaine main).
// Patche directement currentBlindLevel et table.smallBlind / bigBlind.
export const forceLevelUpNow = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table || !table.modules?.tournament) throw new Error("Not a tournament table");
    const t = table.modules.tournament;
    const newLevelIdx = (t.currentBlindLevel ?? 0) + 1;
    if (newLevelIdx >= t.blindStructure.length) throw new Error("Already at max level");
    const newLevel = t.blindStructure[newLevelIdx];
    await ctx.db.patch(args.tableId, {
      smallBlind: newLevel.smallBlind,
      bigBlind: newLevel.bigBlind,
      modules: {
        ...table.modules,
        tournament: {
          ...t,
          currentBlindLevel: newLevelIdx,
          nextBlindIncrease: Date.now() + newLevel.duration,
        },
      },
    });
    return {
      ok: true,
      newLevel: newLevel.level,
      sb: newLevel.smallBlind,
      bb: newLevel.bigBlind,
    };
  },
});

// Patche tous les joueurs avec eliminatedAt pour les marquer isFolded=true
// et hasActed=true (corrige les états laissés par d'anciennes versions du code).
export const fixGhostEliminated = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();
    let fixed = 0;
    for (const p of players) {
      if (p.eliminatedAt && (!p.isFolded || !p.hasActed)) {
        await ctx.db.patch(p._id, { isFolded: true, hasActed: true });
        fixed++;
      }
    }
    return { fixed };
  },
});

// Force la fin de la main en cours (utile quand un blocage logique a empêché
// shouldEndHand de tirer la conclusion automatiquement).
export const forceEndHand = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await endHand(ctx, args.tableId);
    return { ok: true };
  },
});

export const setCurrentPlayer = mutation({
  args: { tableId: v.id("tables"), seatPosition: v.number() },
  handler: async (ctx, args) => {
    const gs = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();
    if (!gs) throw new Error("gameState not found");
    await ctx.db.patch(gs._id, {
      currentPlayerPosition: args.seatPosition,
      updatedAt: Date.now(),
    });
    return { newCurrent: args.seatPosition };
  },
});

export const advanceTurn = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const gs = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();
    if (!gs) throw new Error("gameState not found");

    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    const seatOrder = allPlayers
      .filter((p) => !p.isFolded && !p.eliminatedAt)
      .map((p) => p.seatPosition)
      .sort((a, b) => a - b);

    const needsToAct = (p: any): boolean => {
      if (p.isFolded || p.isAllIn || p.eliminatedAt) return false;
      if (!p.hasActed) return true;
      return p.currentBet < gs.currentBet;
    };

    // Trouver le startCursor : si le current est dans seatOrder, prendre l'index suivant.
    // Sinon (joueur folded/parti), trouver le premier siège strictement > cur, ou wrap.
    const cur = gs.currentPlayerPosition;
    let startCursor: number;
    const idx = seatOrder.indexOf(cur);
    if (idx >= 0) {
      startCursor = (idx + 1) % seatOrder.length;
    } else {
      const greaterIdx = seatOrder.findIndex((s) => s > cur);
      startCursor = greaterIdx >= 0 ? greaterIdx : 0;
    }

    let nextPlayer = -1;
    for (let i = 0; i < seatOrder.length; i++) {
      const seat = seatOrder[(startCursor + i) % seatOrder.length];
      const candidate = allPlayers.find((p) => p.seatPosition === seat);
      if (candidate && needsToAct(candidate)) {
        nextPlayer = seat;
        break;
      }
    }

    await ctx.db.patch(gs._id, {
      currentPlayerPosition: nextPlayer,
      updatedAt: Date.now(),
    });

    return { previousCurrent: cur, newCurrent: nextPlayer, seatOrder };
  },
});
