import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { calculateMinRaise } from "../utils/poker";
import { shouldEndHand, getNextActivePlayer, isBettingRoundComplete } from "../utils/turnManager";
import { endHand, advanceToNextPhase } from "../core/gameEngine";

// Ces fonctions doivent être importées si elles sont utilisées dans la logique :
// import { endHand, advanceToNextPhase } from "../core/gameEngine";
// (ou bien recopier leur logique ici si besoin)

export const playerAction = internalMutation({
    args: {
        tableId: v.id("tables"),
        userId: v.id("users"),
        action: v.union(
            v.literal("fold"),
            v.literal("check"),
            v.literal("call"),
            v.literal("raise"),
            v.literal("all-in")
        ),
        amount: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const table = await ctx.db.get(args.tableId);
        if (!table) {
            throw new Error("Table not found");
        }

        const gameState = await ctx.db
            .query("gameStates")
            .withIndex("by_table", (q: any) => q.eq("tableId", args.tableId))
            .unique();

        if (!gameState) {
            throw new Error("Game state not found");
        }

        const player = await ctx.db
            .query("players")
            .withIndex("by_table", (q: any) => q.eq("tableId", args.tableId))
            .filter((q: any) => q.eq(q.field("userId"), args.userId))
            .unique();

        if (!player) {
            throw new Error("Player not found");
        }

        // Validate it's player's turn
        if (gameState.currentPlayerPosition !== player.seatPosition) {
            throw new Error("Not your turn");
        }

        // Validate action
        const callAmount = gameState.currentBet - player.currentBet;
        let betAmount = 0;
        let newChips = player.chips;
        let newCurrentBet = player.currentBet;
        let isAllIn = false;

        switch (args.action) {
            case "fold":
                await ctx.db.patch(player._id, {
                    isFolded: true,
                    hasActed: true,
                    lastAction: "fold",
                });
                break;

            case "check":
                if (callAmount > 0) {
                    throw new Error(`Cannot check when there's a bet of ${callAmount} to call. Must call, raise, or fold.`);
                }
                await ctx.db.patch(player._id, {
                    hasActed: true,
                    lastAction: "check",
                });
                break;

            case "call":
                if (callAmount <= 0) {
                    throw new Error("Nothing to call");
                }
                betAmount = Math.min(callAmount, player.chips);
                newChips = player.chips - betAmount;
                newCurrentBet = player.currentBet + betAmount;
                isAllIn = newChips === 0;

                await ctx.db.patch(player._id, {
                    chips: newChips,
                    currentBet: newCurrentBet,
                    hasActed: true,
                    isAllIn,
                    lastAction: "call",
                });
                break;

            case "raise":
                if (!args.amount) {
                    throw new Error("Raise amount required");
                }
                const minRaise = calculateMinRaise(gameState.currentBet, table.bigBlind);
                if (args.amount < minRaise) {
                    throw new Error(`Minimum raise is ${minRaise}`);
                }
                betAmount = Math.min(args.amount - player.currentBet, player.chips);
                newChips = player.chips - betAmount;
                newCurrentBet = player.currentBet + betAmount;
                isAllIn = newChips === 0;

                await ctx.db.patch(player._id, {
                    chips: newChips,
                    currentBet: newCurrentBet,
                    hasActed: true,
                    isAllIn,
                    lastAction: "raise",
                });

                // Update current bet and last raiser
                await ctx.db.patch(gameState._id, {
                    currentBet: newCurrentBet,
                    lastRaiserPosition: player.seatPosition,
                });
                break;

            case "all-in":
                betAmount = player.chips;
                newChips = 0;
                newCurrentBet = player.currentBet + betAmount;
                isAllIn = true;

                await ctx.db.patch(player._id, {
                    chips: newChips,
                    currentBet: newCurrentBet,
                    hasActed: true,
                    isAllIn: true,
                    lastAction: "all-in",
                });

                // Update current bet if all-in is higher
                if (newCurrentBet > gameState.currentBet) {
                    await ctx.db.patch(gameState._id, {
                        currentBet: newCurrentBet,
                        lastRaiserPosition: player.seatPosition,
                    });
                }
                break;
        }

        // Update pot
        const newPot = gameState.pot + betAmount;
        await ctx.db.patch(gameState._id, {
            pot: newPot,
            updatedAt: Date.now(),
        });

        // Check if hand should end immediately (only one player left)
        const allPlayers = await ctx.db
            .query("players")
            .withIndex("by_table", (q: any) => q.eq("tableId", args.tableId))
            .collect();

        if (shouldEndHand(allPlayers)) {
            await endHand(ctx, args.tableId);
            return { success: true };
        }

        const updatedGameState = await ctx.db.get(gameState._id);
        if (!updatedGameState) {
            throw new Error("Game state not found after update");
        }

        // Check if betting round is complete
        if (isBettingRoundComplete(allPlayers, updatedGameState.currentBet, updatedGameState.lastRaiserPosition)) {
            // Move to next phase
            await advanceToNextPhase(ctx, args.tableId);
        } else {
            // Move to next active player
            const activePlayers = allPlayers
                .filter((p: any) => !p.isFolded && !p.isAllIn)
                .map((p: any) => p.seatPosition);

            const nextPlayer = getNextActivePlayer(player.seatPosition, activePlayers);

            if (nextPlayer === -1) {
                // No more active players, end betting round
                await advanceToNextPhase(ctx, args.tableId);
            } else {
                await ctx.db.patch(gameState._id, {
                    currentPlayerPosition: nextPlayer,
                    updatedAt: Date.now(),
                });
            }
        }

        return { success: true };
    },
}); 