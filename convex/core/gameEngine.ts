import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  cardToString,
  getNextPlayerPosition,
  isBettingRoundComplete,
  calculateMinRaise,
  getBlindPositions,
  calculateSidePots,
  evaluateHand,
  stringToCard,
  type Card
} from "../utils/poker";

// Start a new game
export const startGame = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    // Get all players
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    if (players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }

    // Create and shuffle deck
    const deck = shuffleDeck(createDeck());
    let remainingDeck = deck;

    // Deal 2 cards to each player
    const playerCards: { [playerId: string]: Card[] } = {};
    for (const player of players) {
      const { dealtCards, remainingDeck: newDeck } = dealCards(remainingDeck, 2);
      playerCards[player._id] = dealtCards;
      remainingDeck = newDeck;
    }

    // Determine dealer position (random for first game)
    const dealerPosition = Math.floor(Math.random() * players.length);
    const { smallBlind, bigBlind } = getBlindPositions(dealerPosition, players.length, table.maxPlayers);

    // Post blinds
    let pot = 0;
    let currentBet = table.bigBlind;

    // Reset all players
    await Promise.all(
      players.map(async (player) => {
        let betAmount = 0;
        let chips = player.chips;

        // Post blinds
        if (player.seatPosition === smallBlind) {
          betAmount = Math.min(table.smallBlind, chips);
        } else if (player.seatPosition === bigBlind) {
          betAmount = Math.min(table.bigBlind, chips);
        }

        chips -= betAmount;
        pot += betAmount;

        return ctx.db.patch(player._id, {
          cards: playerCards[player._id].map(cardToString),
          currentBet: betAmount,
          hasActed: false,
          isAllIn: betAmount > 0 && chips === 0,
          isFolded: false,
          lastAction: undefined,
          chips,
        });
      })
    );

    // Find first player to act (after big blind)
    const firstPlayerPosition = getNextPlayerPosition(
      bigBlind,
      players.map(p => ({ seatPosition: p.seatPosition, isFolded: false, isAllIn: false })),
      table.maxPlayers
    );

    // Update game state
    await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique()
      .then(async (gameState) => {
        if (gameState) {
          await ctx.db.patch(gameState._id, {
            phase: "preflop",
            communityCards: [],
            pot,
            currentBet,
            dealerPosition,
            currentPlayerPosition: firstPlayerPosition,
            sidePots: [],
            updatedAt: Date.now(),
          });
        }
      });

    // Update table status
    await ctx.db.patch(args.tableId, { status: "playing" });

    return { success: true, dealerPosition, pot, currentBet };
  },
});

// Handle player action
export const playerAction = mutation({
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
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
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
          throw new Error("Cannot check, must call or fold");
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

        // Update current bet
        await ctx.db.patch(gameState._id, {
          currentBet: newCurrentBet,
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

    // Check if betting round is complete
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    const updatedGameState = await ctx.db.get(gameState._id);
    if (!updatedGameState) {
      throw new Error("Game state not found after update");
    }

    if (isBettingRoundComplete(allPlayers, updatedGameState.currentBet)) {
      // Move to next phase
      await advanceToNextPhase(ctx, args.tableId);
    } else {
      // Move to next player
      const nextPlayer = getNextPlayerPosition(
        player.seatPosition,
        allPlayers.map(p => ({ seatPosition: p.seatPosition, isFolded: p.isFolded, isAllIn: p.isAllIn })),
        table.maxPlayers
      );

      await ctx.db.patch(gameState._id, {
        currentPlayerPosition: nextPlayer,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Advance to next phase
async function advanceToNextPhase(ctx: any, tableId: string) {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q) => q.eq("tableId", tableId))
    .unique();

  if (!gameState) {
    throw new Error("Game state not found");
  }

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q) => q.eq("tableId", tableId))
    .collect();

  const activePlayers = players.filter(p => !p.isFolded);

  // Check if game is over (only one player left)
  if (activePlayers.length <= 1) {
    await endGame(ctx, tableId);
    return;
  }

  // Reset player actions for next phase
  await Promise.all(
    players.map(player => 
      ctx.db.patch(player._id, {
        hasActed: false,
        currentBet: 0,
        lastAction: undefined,
      })
    )
  );

  let nextPhase: string;
  let communityCards = [...gameState.communityCards];
  
  // Create deck for community cards (simplified - in real game, use remaining deck)
  const deck = shuffleDeck(createDeck());
  
  switch (gameState.phase) {
    case "preflop":
      nextPhase = "flop";
      // Deal 3 community cards
      const flopCards = dealCards(deck, 3);
      communityCards = flopCards.dealtCards.map(cardToString);
      break;
      
    case "flop":
      nextPhase = "turn";
      // Deal 1 community card
      const turnCard = dealCards(deck, 1);
      communityCards = [...gameState.communityCards, ...turnCard.dealtCards.map(cardToString)];
      break;
      
    case "turn":
      nextPhase = "river";
      // Deal 1 community card
      const riverCard = dealCards(deck, 1);
      communityCards = [...gameState.communityCards, ...riverCard.dealtCards.map(cardToString)];
      break;
      
    case "river":
      nextPhase = "showdown";
      await determineWinner(ctx, tableId);
      return;
      
    default:
      throw new Error("Invalid game phase");
  }

  // Find first player to act
  const firstPlayerPosition = getNextPlayerPosition(
    gameState.dealerPosition,
    activePlayers.map(p => ({ seatPosition: p.seatPosition, isFolded: p.isFolded, isAllIn: p.isAllIn })),
    players.length
  );

  await ctx.db.patch(gameState._id, {
    phase: nextPhase,
    communityCards,
    currentBet: 0,
    currentPlayerPosition: firstPlayerPosition,
    updatedAt: Date.now(),
  });
}

// Determine winner and distribute pot
async function determineWinner(ctx: any, tableId: string) {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q) => q.eq("tableId", tableId))
    .unique();

  if (!gameState) {
    throw new Error("Game state not found");
  }

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q) => q.eq("tableId", tableId))
    .collect();

  const activePlayers = players.filter(p => !p.isFolded);

  if (activePlayers.length === 0) {
    throw new Error("No active players");
  }

  // If only one player, they win
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    await ctx.db.patch(winner._id, {
      chips: winner.chips + gameState.pot,
    });
  } else {
    // Evaluate hands and determine winner(s)
    const communityCards = gameState.communityCards.map(stringToCard);
    const playerHands = activePlayers.map(player => {
      const holeCards = player.cards.map(stringToCard);
      const allCards = [...holeCards, ...communityCards];
      const handRank = evaluateHand(allCards);
      
      return {
        player,
        handRank,
        allCards,
      };
    });

    // Sort by hand rank (highest first)
    playerHands.sort((a, b) => b.handRank.rank - a.handRank.rank);

    // Handle side pots
    const sidePots = calculateSidePots(
      players.map(p => ({
        chips: p.chips,
        currentBet: p.currentBet,
        isAllIn: p.isAllIn,
        userId: p.userId,
      }))
    );

    // Distribute main pot to winner(s)
    const winners = playerHands.filter(ph => ph.handRank.rank === playerHands[0].handRank.rank);
    const winAmount = Math.floor(gameState.pot / winners.length);

    await Promise.all(
      winners.map(winner => 
        ctx.db.patch(winner.player._id, {
          chips: winner.player.chips + winAmount,
        })
      )
    );
  }

  // Update game state to showdown
  await ctx.db.patch(gameState._id, {
    phase: "showdown",
    currentPlayerPosition: -1,
    updatedAt: Date.now(),
  });

  // End game after a delay (handled by client)
  setTimeout(() => {
    endGame(ctx, tableId);
  }, 5000);
}

// End current game
async function endGame(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  // Reset game state
  await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q) => q.eq("tableId", tableId))
    .unique()
    .then(async (gameState) => {
      if (gameState) {
        await ctx.db.patch(gameState._id, {
          phase: "waiting",
          communityCards: [],
          pot: 0,
          currentBet: 0,
          currentPlayerPosition: -1,
          sidePots: [],
          updatedAt: Date.now(),
        });
      }
    });

  // Reset players
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q) => q.eq("tableId", tableId))
    .collect();

  await Promise.all(
    players.map(player => 
      ctx.db.patch(player._id, {
        cards: [],
        currentBet: 0,
        hasActed: false,
        isAllIn: false,
        isFolded: false,
        lastAction: undefined,
      })
    )
  );

  // Update table status
  await ctx.db.patch(tableId, { status: "waiting" });
}

// Get game actions available to player
export const getAvailableActions = query({
  args: { tableId: v.id("tables"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    if (!gameState) {
      return { actions: [] };
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (!player || player.isFolded || player.isAllIn) {
      return { actions: [] };
    }

    if (gameState.currentPlayerPosition !== player.seatPosition) {
      return { actions: [] };
    }

    const callAmount = gameState.currentBet - player.currentBet;
    const actions = [];

    // Always can fold
    actions.push({ action: "fold", amount: 0 });

    // Check if can check
    if (callAmount === 0) {
      actions.push({ action: "check", amount: 0 });
    }

    // Check if can call
    if (callAmount > 0 && player.chips >= callAmount) {
      actions.push({ action: "call", amount: callAmount });
    }

    // Check if can raise
    const table = await ctx.db.get(args.tableId);
    if (table) {
      const minRaise = calculateMinRaise(gameState.currentBet, table.bigBlind);
      if (player.chips >= minRaise - player.currentBet) {
        actions.push({ action: "raise", minAmount: minRaise, maxAmount: player.chips + player.currentBet });
      }
    }

    // Always can go all-in
    if (player.chips > 0) {
      actions.push({ action: "all-in", amount: player.chips });
    }

    return { actions };
  },
});

// Force player to fold if they timeout
export const forcePlayerFold = mutation({
  args: { tableId: v.id("tables"), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.core.gameEngine.playerAction, {
      tableId: args.tableId,
      userId: args.userId,
      action: "fold",
    });
  },
});

import { internal } from "../_generated/api";

export { internal };