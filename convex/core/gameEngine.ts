import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  cardToString,
  getNextPlayerPosition,
  calculateMinRaise,
  calculateSidePots,
  evaluateHand,
  stringToCard,
  type Card
} from "../utils/poker";
import {
  getBlindPositions,
  getFirstPlayerToAct,
  isBettingRoundComplete,
  getNextActivePlayer,
  resetPlayersForNewRound,
  shouldEndHand,
  getNextPhase,
  getNextDealerPosition
} from "../utils/turnManager";
import { internal } from "../_generated/api";


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

    // Get current dealer position or set random for first game
    const currentGameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    let dealerPosition: number;
    if (currentGameState && currentGameState.dealerPosition >= 0) {
      // Advance dealer position for next hand
      const playerPositions = players.map(p => p.seatPosition).sort((a, b) => a - b);
      dealerPosition = getNextDealerPosition(currentGameState.dealerPosition, playerPositions);
    } else {
      // Random dealer for first game
      dealerPosition = players[Math.floor(Math.random() * players.length)].seatPosition;
    }

    const playerPositions = players.map(p => p.seatPosition);
    const { smallBlind, bigBlind } = getBlindPositions(dealerPosition, playerPositions);

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

    // Find first player to act (after big blind in preflop)
    const firstPlayerPosition = getFirstPlayerToAct(dealerPosition, playerPositions, 'preflop');

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
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
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
        .filter(p => !p.isFolded && !p.isAllIn)
        .map(p => p.seatPosition);
      
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

// Advance to next phase
async function advanceToNextPhase(ctx: any, tableId: string) {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique();

  if (!gameState) {
    throw new Error("Game state not found");
  }

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  const activePlayers = players.filter((p: any) => !p.isFolded);

  // Check if hand is over (only one player left)
  if (shouldEndHand(players)) {
    await endHand(ctx, tableId);
    return;
  }

  // Reset players for next betting round
  const playersToReset = resetPlayersForNewRound(players);
  await Promise.all(
    playersToReset.map(({ playerId, resetData }) =>
      ctx.db.patch(playerId, resetData)
    )
  );

  // Get next phase
  const nextPhase = getNextPhase(gameState.phase);
  let communityCards = [...gameState.communityCards];

  // Deal community cards for new phase
  if (nextPhase !== 'showdown') {
    // Create deck for community cards (simplified - in real game, use remaining deck)
    const deck = shuffleDeck(createDeck());

    switch (nextPhase) {
      case "flop":
        // Deal 3 community cards
        const flopCards = dealCards(deck, 3);
        communityCards = flopCards.dealtCards.map(cardToString);
        break;

      case "turn":
        // Deal 1 community card
        const turnCard = dealCards(deck, 1);
        communityCards = [...gameState.communityCards, ...turnCard.dealtCards.map(cardToString)];
        break;

      case "river":
        // Deal 1 community card
        const riverCard = dealCards(deck, 1);
        communityCards = [...gameState.communityCards, ...riverCard.dealtCards.map(cardToString)];
        break;
    }
  }

  if (nextPhase === "showdown") {
    await determineWinner(ctx, tableId);
    return;
  }

  // Find first player to act (post-flop)
  const playerPositions = activePlayers
    .filter((p: any) => !p.isAllIn)
    .map((p: any) => p.seatPosition)
    .sort((a: any, b: any) => a - b);

  const firstPlayerPosition = getFirstPlayerToAct(
    gameState.dealerPosition,
    playerPositions,
    'postflop'
  );

  await ctx.db.patch(gameState._id, {
    phase: nextPhase,
    communityCards,
    currentBet: 0,
    currentPlayerPosition: firstPlayerPosition,
    lastRaiserPosition: undefined, // Reset last raiser for new betting round
    updatedAt: Date.now(),
  });
}

// Determine winner and distribute pot
async function determineWinner(ctx: any, tableId: string) {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique();

  if (!gameState) {
    throw new Error("Game state not found");
  }

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  const activePlayers = players.filter((p: any) => !p.isFolded);

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
    const playerHands = activePlayers.map((player: any) => {
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
    playerHands.sort((a: any, b: any) => b.handRank.rank - a.handRank.rank);

    // Handle side pots
    const sidePots = calculateSidePots(
      players.map((p: any) => ({
        chips: p.chips,
        currentBet: p.currentBet,
        isAllIn: p.isAllIn,
        userId: p.userId,
      }))
    );

    // Distribute main pot to winner(s)
    const winners = playerHands.filter((ph: any) => ph.handRank.rank === playerHands[0].handRank.rank);
    const winAmount = Math.floor(gameState.pot / winners.length);

    await Promise.all(
      winners.map((winner: any) =>
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

// End current hand and prepare for next
async function endHand(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique();

  if (!gameState) {
    throw new Error("Game state not found");
  }

  // Check if we should start a new hand automatically
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  const playersWithChips = players.filter((p: any) => p.chips > 0);

  if (playersWithChips.length >= 2) {
    // Prepare for next hand
    await prepareNextHand(ctx, tableId);
  } else {
    // End game - not enough players with chips
    await endGame(ctx, tableId);
  }
}

// Prepare for next hand
async function prepareNextHand(ctx: any, tableId: string) {
  // Reset players for new hand
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  await Promise.all(
    players.map((player: any) =>
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

  // Reset game state but keep dealer position for rotation
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique();

  if (gameState) {
    await ctx.db.patch(gameState._id, {
      phase: "waiting",
      communityCards: [],
      pot: 0,
      currentBet: 0,
      currentPlayerPosition: -1,
      sidePots: [],
      updatedAt: Date.now(),
      // Keep dealerPosition for next hand rotation
    });
  }
}

// End entire game session
async function endGame(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  // Reset game state completely
  await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique()
    .then(async (gameState: any) => {
      if (gameState) {
        await ctx.db.patch(gameState._id, {
          phase: "waiting",
          communityCards: [],
          pot: 0,
          currentBet: 0,
          dealerPosition: 0, // Reset dealer position
          currentPlayerPosition: -1,
          sidePots: [],
          updatedAt: Date.now(),
        });
      }
    });

  // Reset players
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  await Promise.all(
    players.map((player: any) =>
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

    // Check if can check - only if no additional money needed to call
    // This means either no bet, or player already matches the current bet
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
export const forcePlayerFold: any = mutation({
  args: { tableId: v.id("tables"), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.runMutation((internal as any)["internal/gameEngine"].playerAction, {
      tableId: args.tableId,
      userId: args.userId,
      action: "fold",
    });
  },
});


// Start next hand (called after previous hand ends)
export const startNextHand: any = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    if (!gameState || gameState.phase !== "waiting") {
      throw new Error("Cannot start next hand - game not in waiting state");
    }

    // Check if we have enough players
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    const playersWithChips = players.filter(p => p.chips > 0);
    if (playersWithChips.length < 2) {
      throw new Error("Not enough players with chips to start next hand");
    }

    // Start the next hand
    return await ctx.runMutation((internal as any)["core/gameEngine"].startGame, {
      tableId: args.tableId,
    });
  },
});

export { endHand, advanceToNextPhase };

