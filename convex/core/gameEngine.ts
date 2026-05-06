import { mutation, query, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { rateLimiter } from "../shared/rateLimit";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  cardToString,
  stringToCard,
  type Card,
  calculateMinRaise,
} from "../utils/poker";
import {
  evaluateHandRobust,
  determineWinners,
  getHandDescription,
} from "../utils/handEvaluator";
import {
  getBlindPositions,
  getFirstPlayerToAct,
  getNextActivePlayer,
  resetPlayersForNewRound,
  shouldEndHand,
  getNextPhase,
  getNextDealerPosition,
  calculateSidePots
} from "../utils/turnManager";
import {
  evaluateGameConditions,
  getNextPhase as getNextPhaseFromStateMachine,
  debugGameState,
  type PlayerState
} from "../utils/gameStateMachine";
import { internal } from "../_generated/api";
import { requireSelf, requireTableCreator, requireUserId } from "../shared/auth";

// Helper function to add action to server-side feed
async function addActionToFeed(ctx: any, tableId: string, data: {
  playerId?: string;
  playerName: string;
  action: string;
  amount?: number;
  message?: string;
  phase?: string;
  handNumber?: number;
  isSystem?: boolean;
}) {
  // Get current hand number if not provided
  let handNumber = data.handNumber;
  if (!handNumber) {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
      .unique();
    handNumber = gameState?.handNumber || 1;
  }

  await ctx.db.insert("gameActions", {
    tableId,
    playerId: data.playerId,
    playerName: data.playerName,
    action: data.action,
    amount: data.amount,
    message: data.message,
    phase: data.phase,
    handNumber: handNumber,
    isSystem: data.isSystem || false,
    timestamp: Date.now(),
  });
}


// Internal function to start a new game
async function startGameInternal(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  // Get all players
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  if (players.length < 2) {
    throw new Error("Need at least 2 players to start");
  }

  // Tournoi : exclure les éliminés (chips=0 + eliminatedAt) du flow de la main
  const activePlayers = table.gameType === "tournament"
    ? players.filter((p: any) => !p.eliminatedAt && p.chips > 0)
    : players;

  if (activePlayers.length < 2) {
    // 1 seul joueur restant ou aucun → fin tournoi à gérer en aval (par endHand)
    // Pour cash game, ce cas n'arrive normalement pas
    return { success: false, reason: "not enough active players" };
  }

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());
  let remainingDeck = deck;

  // Deal 2 cards to each active player
  const playerCards: { [playerId: string]: Card[] } = {};
  for (const player of activePlayers) {
    const { dealtCards, remainingDeck: newDeck } = dealCards(remainingDeck, 2);
    playerCards[player._id] = dealtCards;
    remainingDeck = newDeck;
  }

  // Get current dealer position or set random for first game
  const currentGameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique();

  let dealerPosition: number;
  if (currentGameState && currentGameState.dealerPosition >= 0) {
    // Advance dealer position for next hand
    const playerPositions = activePlayers.map((p: any) => p.seatPosition).sort((a: any, b: any) => a - b);
    dealerPosition = getNextDealerPosition(currentGameState.dealerPosition, playerPositions);
  } else {
    // Random dealer for first game (crypto-secure RNG)
    const rngArr = new Uint32Array(1);
    crypto.getRandomValues(rngArr);
    dealerPosition = activePlayers[rngArr[0] % activePlayers.length].seatPosition;
  }

  const playerPositions = activePlayers.map((p: any) => p.seatPosition);
  const { smallBlind, bigBlind } = getBlindPositions(dealerPosition, playerPositions);


  // Post blinds
  let pot = 0;
  const currentBet = table.bigBlind;

  // Reset active players and post blinds (eliminated players stay as-is)
  await Promise.all(
    activePlayers.map(async (player: any) => {
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

  // Add blind actions to feed
  // Pre-load SB+BB users in parallel to avoid sequential ctx.db.get in loop
  const blindUsers = await Promise.all(
    activePlayers
      .filter((p: any) => p.seatPosition === smallBlind || p.seatPosition === bigBlind)
      .map(async (p: any) => [p.userId, await ctx.db.get(p.userId)] as const)
  );
  const userBy = new Map<string, any>(blindUsers);

  for (const player of activePlayers) {
    if (player.seatPosition === smallBlind) {
      const user = userBy.get(player.userId);
      await addActionToFeed(ctx, tableId, {
        playerId: player._id,
        playerName: user?.name || "Joueur",
        action: "blind",
        amount: Math.min(table.smallBlind, player.chips),
        message: `paie la petite blind (${Math.min(table.smallBlind, player.chips)} jetons)`,
        isSystem: false,
      });
    } else if (player.seatPosition === bigBlind) {
      const user = userBy.get(player.userId);
      await addActionToFeed(ctx, tableId, {
        playerId: player._id,
        playerName: user?.name || "Joueur",
        action: "blind",
        amount: Math.min(table.bigBlind, player.chips),
        message: `paie la grosse blind (${Math.min(table.bigBlind, player.chips)} jetons)`,
        isSystem: false,
      });
    }
  }

  // Find first player to act (after big blind in preflop)
  console.log(`🎯 === ANALYSE ORDRE D'ACTION - PHASE: PREFLOP ===`);
  console.log(`📍 Dealer position: ${dealerPosition}`);
  console.log(`👥 All players: ${JSON.stringify(playerPositions)}`);

  const firstPlayerPosition = getFirstPlayerToAct(dealerPosition, playerPositions, 'preflop');

  console.log(`✅ Premier joueur calculé (preflop): Pos${firstPlayerPosition}`);
  console.log(`📜 Règle: En preflop, UTG (Dealer+3) parle en premier`);
  console.log(`🎯 Logique: Dealer(${dealerPosition}) + 3 → Pos${firstPlayerPosition}`);
  console.log("========================");

  // Update game state
  await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique()
    .then(async (gameState: any) => {
      if (gameState) {
        const currentHandNumber = (gameState.handNumber || 0) + 1;
        await ctx.db.patch(gameState._id, {
          phase: "preflop",
          communityCards: [],
          remainingDeck: remainingDeck.map(cardToString),
          pot,
          currentBet,
          dealerPosition,
          currentPlayerPosition: firstPlayerPosition,
          sidePots: [],
          handNumber: currentHandNumber,
          updatedAt: Date.now(),
        });
      }
    });

  // Update table status
  await ctx.db.patch(tableId, { status: "playing" });

  // Tournoi : passer en status "running" et initialiser le timer du niveau 1
  if (table.gameType === "tournament" && table.modules?.tournament) {
    const now = Date.now();
    const tournament = table.modules.tournament;
    const blindLvl = tournament.blindStructure[tournament.currentBlindLevel ?? 0];
    await ctx.db.patch(tableId, {
      modules: {
        ...table.modules,
        tournament: {
          ...tournament,
          status: "running",
          startedAt: tournament.startedAt && tournament.startedAt > 0 ? tournament.startedAt : now,
          nextBlindIncrease: now + blindLvl.duration,
        },
      },
    });
    await addActionToFeed(ctx, tableId, {
      playerName: "Système",
      action: "system",
      message: `Tournoi démarré · Niveau 1 : SB ${blindLvl.smallBlind} / BB ${blindLvl.bigBlind}`,
      isSystem: true,
    });
  }

  return { success: true, dealerPosition, pot, currentBet };
}

// Start a new game
// NOTE B-runtime.3 : la restriction "seul le créateur peut démarrer" est
// appliquée côté UI (PokerTable.tsx — visibilité du bouton). Convex Auth
// n'est pas activé sur l'app (auth maison email/password), donc on ne peut
// pas vérifier identity.subject côté serveur sans modifier la signature de
// startGame pour passer userId. À reconsidérer en phase 0.C lors de la
// migration vers Convex Auth.
export const startGame = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await requireTableCreator(ctx, args.tableId);
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");
    return await startGameInternal(ctx, args.tableId);
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
    await requireSelf(ctx, args.userId);
    {
      const status = await rateLimiter.limit(ctx, "playerAction", { key: args.userId });
      if (!status.ok) throw new ConvexError("RateLimited: playerAction");
    }
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

    // Log player action for debugging
    console.log(`🎮 === ACTION JOUEUR - PHASE: ${gameState.phase.toUpperCase()} ===`);
    console.log(`👤 Joueur: Pos${player.seatPosition} | Action: ${args.action}`);
    console.log(`📊 État: Dealer=Pos${gameState.dealerPosition}, JoueurActuel=Pos${gameState.currentPlayerPosition}`);
    console.log(`💰 Mise: ${gameState.currentBet}, Joueur payé: ${player.currentBet}`);

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

        // Add to action feed
        const foldUser = await ctx.db.get(player.userId);
        await addActionToFeed(ctx, args.tableId, {
          playerId: player._id,
          playerName: foldUser?.name || "Joueur",
          action: "fold",
          message: "se couche",
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

        // Add to action feed
        const checkUser = await ctx.db.get(player.userId);
        await addActionToFeed(ctx, args.tableId, {
          playerId: player._id,
          playerName: checkUser?.name || "Joueur",
          action: "check",
          message: "check",
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

        // Add to action feed
        const callUser = await ctx.db.get(player.userId);
        await addActionToFeed(ctx, args.tableId, {
          playerId: player._id,
          playerName: callUser?.name || "Joueur",
          action: "call",
          amount: betAmount,
          message: `suit pour ${betAmount} jetons`,
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

        // Add to action feed
        const raiseUser = await ctx.db.get(player.userId);
        await addActionToFeed(ctx, args.tableId, {
          playerId: player._id,
          playerName: raiseUser?.name || "Joueur",
          action: "raise",
          amount: betAmount,
          message: `relance à ${newCurrentBet} jetons`,
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

        // Add to action feed
        const allInUser = await ctx.db.get(player.userId);
        await addActionToFeed(ctx, args.tableId, {
          playerId: player._id,
          playerName: allInUser?.name || "Joueur",
          action: "all-in",
          amount: betAmount,
          message: `fait tapis pour ${betAmount} jetons`,
        });
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

    // Use state machine to determine next action
    const playerStates: PlayerState[] = allPlayers.map(p => ({
      chips: p.chips,
      currentBet: p.currentBet,
      hasActed: p.hasActed,
      isFolded: p.isFolded,
      isAllIn: p.isAllIn,
      lastAction: p.lastAction,
      seatPosition: p.seatPosition
    }));

    const conditions = evaluateGameConditions(playerStates, updatedGameState.currentBet, updatedGameState.lastRaiserPosition);
    const nextPhaseInfo = getNextPhaseFromStateMachine(updatedGameState.phase as any, conditions);

    debugGameState(updatedGameState.phase as any, playerStates, updatedGameState.currentBet, updatedGameState.lastRaiserPosition);

    if (nextPhaseInfo) {
      // Move to next phase
      await advanceToNextPhaseWithStateMachine(ctx, args.tableId, nextPhaseInfo);
    } else {
      // Move to next active player
      // Don't filter all-in players when looking for next player, 
      // as other players still need to act against all-in
      const activePlayers = allPlayers
        .filter(p => !p.isFolded)
        .map(p => p.seatPosition);

      const nextPlayer = getNextActivePlayer(player.seatPosition, activePlayers);

      console.log("Debug next player:", {
        currentPlayerPosition: player.seatPosition,
        activePlayers,
        nextPlayer,
        allPlayers: allPlayers.map(p => ({
          seat: p.seatPosition,
          isFolded: p.isFolded,
          isAllIn: p.isAllIn,
          hasActed: p.hasActed
        }))
      });

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

// Auto-advance to next phase (called by client timer)
export const advancePhase = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    // Tout user authentifié peut déclencher : l'avancement est state-driven
    // (vérifie autoAdvanceAt côté state machine), donc idempotent et non
    // exploitable. Plusieurs clients trigger le timer simultanément, seul le
    // premier passe les conditions et fait avancer.
    await requireUserId(ctx);
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // Only advance if autoAdvanceAt is set and time has passed
    // Add 500ms tolerance for client-server clock differences
    const tolerance = 500;
    const now = Date.now();
    if (!gameState.autoAdvanceAt || now < (gameState.autoAdvanceAt - tolerance)) {
      console.log(`🎮 Server: advancePhase called but not ready. autoAdvanceAt: ${gameState.autoAdvanceAt}, now: ${now}, tolerance: ${tolerance}ms`);
      return { success: false };
    }

    console.log(`🎮 Server: Advancing from phase ${gameState.phase} (auto-advance triggered)`);

    // Clear the autoAdvanceAt flag
    await ctx.db.patch(gameState._id, {
      autoAdvanceAt: undefined,
    });

    // If we're in showdown phase, determine winner instead of advancing
    if (gameState.phase === "showdown") {
      console.log("🎮 Server: Showdown phase, determining winner");
      await determineWinner(ctx, args.tableId);
      return { success: true };
    }

    // Use state machine to determine next phase
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    const playerStates: PlayerState[] = players.map(p => ({
      chips: p.chips,
      currentBet: p.currentBet,
      hasActed: p.hasActed,
      isFolded: p.isFolded,
      isAllIn: p.isAllIn,
      lastAction: p.lastAction,
      seatPosition: p.seatPosition
    }));

    const conditions = evaluateGameConditions(playerStates, gameState.currentBet, gameState.lastRaiserPosition);
    const nextPhaseInfo = getNextPhaseFromStateMachine(gameState.phase as any, conditions);

    console.log(`🎮 Server: advancePhase checking next phase for ${gameState.phase}`, {
      conditions,
      nextPhaseInfo
    });

    if (nextPhaseInfo) {
      // Continue with state machine
      await advanceToNextPhaseWithStateMachine(ctx, args.tableId, nextPhaseInfo);
    } else {
      // Fallback to regular advance
      await advanceToNextPhase(ctx, args.tableId);
    }
    return { success: true };
  },
});

// Manual advance from showdown (called by client when clicking "Continue")
export const advanceFromShowdown = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    // Idem advancePhase : trigger state-driven, vérifié par le check de phase
    // ci-dessous (n'avance que si actuellement en showdown).
    await requireUserId(ctx);
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // Only allow manual advance from showdown phase
    if (gameState.phase !== "showdown") {
      console.log(`🎮 Server: advanceFromShowdown called but not in showdown phase. Current phase: ${gameState.phase}`);
      return { success: false };
    }

    console.log(`🎮 Server: Manual advance from showdown triggered`);

    // Determine winner and end hand
    await determineWinner(ctx, args.tableId);
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

  // Use the deck stored from startGameInternal, ensuring no duplicate cards.
  // Fallback: if remainingDeck is missing (old gameStates), reshuffle (legacy).
  let remainingDeckCards: Card[] = (gameState.remainingDeck && gameState.remainingDeck.length > 0)
    ? gameState.remainingDeck.map(stringToCard)
    : shuffleDeck(createDeck());

  // Deal community cards for new phase
  if (nextPhase !== 'showdown') {
    // Burn 1 card before each new street (poker convention)
    if (remainingDeckCards.length > 0) {
      remainingDeckCards = remainingDeckCards.slice(1);
    }

    switch (nextPhase) {
      case "flop": {
        const flopCards = dealCards(remainingDeckCards, 3);
        communityCards = flopCards.dealtCards.map(cardToString);
        remainingDeckCards = flopCards.remainingDeck;
        break;
      }
      case "turn": {
        const turnCard = dealCards(remainingDeckCards, 1);
        communityCards = [...gameState.communityCards, ...turnCard.dealtCards.map(cardToString)];
        remainingDeckCards = turnCard.remainingDeck;
        break;
      }
      case "river": {
        const riverCard = dealCards(remainingDeckCards, 1);
        communityCards = [...gameState.communityCards, ...riverCard.dealtCards.map(cardToString)];
        remainingDeckCards = riverCard.remainingDeck;
        break;
      }
    }
  }
  const remainingDeckStrings = remainingDeckCards.map(cardToString);

  // Check if we should go to showdown, but handle it after allPlayersAllIn logic

  // Find first player to act (post-flop)
  const playerPositions = activePlayers
    .filter((p: any) => !p.isAllIn)
    .map((p: any) => p.seatPosition)
    .sort((a: any, b: any) => a - b);

  // If all players are all-in, we need to continue automatically
  const allPlayersAllIn = playerPositions.length === 0;

  console.log("Debug advanceToNextPhase:", {
    nextPhase,
    allPlayersAllIn,
    playerPositions
  });

  if (allPlayersAllIn) {
    // All players are all-in, set a special flag to trigger auto-advance
    const autoAdvanceDelay = nextPhase === "showdown" ? 6000 : 2000;
    const autoAdvanceAt = Date.now() + autoAdvanceDelay;

    console.log(`🎮 Server: Setting up auto-advance for ${nextPhase} in ${autoAdvanceDelay}ms`);

    await ctx.db.patch(gameState._id, {
      phase: nextPhase,
      communityCards,
      remainingDeck: remainingDeckStrings,
      currentBet: 0,
      currentPlayerPosition: -1, // No player to act
      lastRaiserPosition: undefined,
      autoAdvanceAt: autoAdvanceAt,
      updatedAt: Date.now(),
    });

    // Add phase announcement to action feed
    const phaseNames = {
      'flop': 'Flop',
      'turn': 'Turn',
      'river': 'River',
      'showdown': 'Abattage'
    };

    await addActionToFeed(ctx, tableId, {
      playerName: "Système",
      action: "phase",
      message: `Phase: ${phaseNames[nextPhase as keyof typeof phaseNames]}`,
      phase: nextPhase,
      isSystem: true,
    });

    // If next phase is showdown, trigger winner determination after delay
    if (nextPhase === "showdown") {
      console.log("🎮 Server: Setting up showdown with auto-advance");
    }
    return;
  }

  console.log(`🎯 === ANALYSE ORDRE D'ACTION - PHASE: ${nextPhase.toUpperCase()} ===`);
  console.log(`📍 Dealer position: ${gameState.dealerPosition}`);
  console.log(`👥 Active players (non all-in): ${JSON.stringify(playerPositions)}`);

  const firstPlayerPosition = getFirstPlayerToAct(
    gameState.dealerPosition,
    playerPositions,
    'postflop'
  );

  console.log(`✅ Premier joueur calculé: Pos${firstPlayerPosition}`);
  console.log(`📜 Règle: En ${nextPhase}, SB (ou premier après dealer) parle en premier`);
  console.log(`🎯 Logique: Dealer(${gameState.dealerPosition}) + 1 → Pos${firstPlayerPosition}`);
  console.log("========================");

  await ctx.db.patch(gameState._id, {
    phase: nextPhase,
    communityCards,
    remainingDeck: remainingDeckStrings,
    currentBet: 0,
    currentPlayerPosition: firstPlayerPosition,
    lastRaiserPosition: undefined, // Reset last raiser for new betting round
    updatedAt: Date.now(),
  });

  // Si on entre en showdown (cas check-down sans all-in), déclencher
  // determineWinner directement. Sans ça, la phase reste bloquée car le
  // bouton "Continuer" UI a été retiré (le scheduler runAfter de endHand
  // se charge ensuite du délai 3s avant la main suivante).
  if (nextPhase === "showdown") {
    await determineWinner(ctx, tableId);
  }
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

  // Si un seul joueur reste actif, il gagne automatiquement
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    const winnerUser = await ctx.db.get(winner.userId);

    // Donner le pot au gagnant
    await ctx.db.patch(winner._id, {
      chips: winner.chips + gameState.pot,
    });

    // Ajouter l'action au feed
    await addActionToFeed(ctx, tableId, {
      playerId: winner._id,
      playerName: winnerUser?.name || "Joueur",
      action: "win",
      amount: gameState.pot,
      message: `remporte ${gameState.pot} jetons (tous les autres ont foldé)`,
      isSystem: false,
    });

    // Mettre à jour l'état du jeu
    await ctx.db.patch(gameState._id, {
      phase: "showdown",
      currentPlayerPosition: -1,
      updatedAt: Date.now(),
    });

    // Schedule next hand 3s later (showdown stays visible during this delay)
    await ctx.scheduler.runAfter(
      3000,
      (internal as any)["core/gameEngine"].scheduleStartNextHand,
      { tableId }
    );

    return;
  }

  // Si aucun joueur actif, c'est une erreur
  if (activePlayers.length === 0) {
    throw new Error("No active players found");
  }

  // Evaluate hands and determine winner(s)
  const communityCards = gameState.communityCards.map(stringToCard);
  const playerHands = activePlayers.map((player: any) => {
    const holeCards = player.cards.map(stringToCard);
    const allCards = [...holeCards, ...communityCards];
    const handRank = evaluateHandRobust(allCards);

    return {
      player,
      handRank,
      allCards,
    };
  });

  // Sort by hand rank (highest first) and use kickers for same rank
  playerHands.sort((a: any, b: any) => {
    // First compare by hand rank
    if (b.handRank.rank !== a.handRank.rank) {
      return b.handRank.rank - a.handRank.rank;
    }

    // Same rank, compare kickers using pokersolver
    const handsForComparison = [
      { hand: a.handRank, playerId: 'a' },
      { hand: b.handRank, playerId: 'b' }
    ];
    const winners = determineWinners(handsForComparison);

    // If 'a' wins, return negative; if 'b' wins, return positive
    if (winners.includes('a')) return -1;
    if (winners.includes('b')) return 1;
    return 0; // Tie
  });

  // Add showdown results to action feed
  await addActionToFeed(ctx, tableId, {
    playerName: "Système",
    action: "showdown",
    message: "Abattage des cartes",
    isSystem: true,
  });

  // Pré-charger les users en un seul Promise.all → réutiliser dans les boucles
  const userIdsForShowdown = playerHands.map((h: any) => h.player.userId);
  const usersById = new Map<string, any>(
    await Promise.all(
      userIdsForShowdown.map(async (uid: any) => [uid, await ctx.db.get(uid)] as const)
    )
  );
  const userOf = (userId: any) => usersById.get(userId);

  // Log showdown results for each player
  for (const hand of playerHands) {
    const user = userOf(hand.player.userId);
    await addActionToFeed(ctx, tableId, {
      playerId: hand.player._id,
      playerName: user?.name || "Joueur",
      action: "showdown",
      message: `montre ${getHandDescription(hand.handRank)}`,
      isSystem: false,
    });
  }

  // Calculate side pots for pot distribution
  // Note: calculateSidePots filtre par currentBet > 0. Si tous les joueurs
  // ont check-down (sans all-in), currentBet=0 → sidePots=[]. Dans ce cas
  // on fabrique un pot unique avec gameState.pot et tous les joueurs actifs
  // comme éligibles.
  let sidePots = calculateSidePots(
    players.map((p: any) => ({
      userId: p.userId,
      currentBet: p.currentBet,
      isAllIn: p.isAllIn,
      isFolded: p.isFolded,
    }))
  );

  if (sidePots.length === 0 && gameState.pot > 0) {
    sidePots = [
      {
        amount: gameState.pot,
        eligiblePlayers: activePlayers.map((p: any) => p.userId),
      },
    ];
    console.log("🎰 Fallback main pot (pas d'all-in) :", sidePots);
  } else {
    console.log("🎰 Side pots calculated:", sidePots);
  }

  // Distribute each side pot individually
  for (let i = 0; i < sidePots.length; i++) {
    const sidePot = sidePots[i];
    // Find eligible players for this side pot
    const eligiblePlayers = playerHands.filter((hand: { player: { userId: string } }) =>
      sidePot.eligiblePlayers.includes(hand.player.userId)
    );

    if (eligiblePlayers.length === 0) continue;

    // Use determineWinners (pokersolver-based) to correctly handle kickers and ties.
    // Previously, only ranks were compared, which incorrectly split pots between
    // hands of same rank but different kickers (B-runtime.5).
    const winnerIds = determineWinners(
      eligiblePlayers.map((h: any) => ({
        hand: h.handRank,
        playerId: String(h.player.userId),
      }))
    );
    const potWinners = eligiblePlayers.filter((h: any) =>
      winnerIds.includes(String(h.player.userId))
    );

    // Distribute this side pot among winners.
    // Convention poker: part entière à chaque gagnant, le reste (remainder) va
    // au premier gagnant après le dealer (sens horaire).
    const sharePerWinner = Math.floor(sidePot.amount / potWinners.length);
    const remainder = sidePot.amount - sharePerWinner * potWinners.length;

    // Récupérer la table pour maxPlayers (pour calcul distance dealer)
    const tableDoc = await ctx.db.get(tableId);
    const maxPlayers = tableDoc?.maxPlayers ?? 9;
    const dealerPos = gameState.dealerPosition ?? 0;

    const sortedPotWinners = [...potWinners].sort((a: any, b: any) => {
      const distA = (a.player.seatPosition - dealerPos + maxPlayers) % maxPlayers;
      const distB = (b.player.seatPosition - dealerPos + maxPlayers) % maxPlayers;
      return distA - distB;
    });

    const winAmountForPot = sharePerWinner; // pour le log et le message

    console.log(`🎰 Side pot ${i + 1}: ${sidePot.amount} jetons, ${potWinners.length} gagnant(s), ${sharePerWinner} jetons chacun (reste ${remainder} au 1er après dealer)`);

    await Promise.all(
      sortedPotWinners.map((winner: any, idx: number) => {
        const extra = idx === 0 ? remainder : 0;
        return ctx.db.patch(winner.player._id, {
          chips: winner.player.chips + sharePerWinner + extra,
        });
      })
    );

    // Add winner announcement for this side pot
    if (potWinners.length === 1) {
      const winnerUser = userOf(potWinners[0].player.userId);
      await addActionToFeed(ctx, tableId, {
        playerId: potWinners[0].player._id,
        playerName: winnerUser?.name || "Joueur",
        action: "win",
        amount: winAmountForPot,
        message: `remporte ${winAmountForPot} jetons (pot ${i + 1}) avec ${getHandDescription(potWinners[0].handRank)}`,
        isSystem: false,
      });
    } else {
      // Multiple winners for this side pot (tie)
      const winnerNames = potWinners.map((winner: any) => {
        const user = userOf(winner.player.userId);
        return user?.name || "Joueur";
      });

      await addActionToFeed(ctx, tableId, {
        playerName: "Système",
        action: "tie",
        message: `${winnerNames.join(", ")} se partagent le pot ${i + 1} de ${sidePot.amount} jetons`,
        isSystem: true,
      });
    }
  }

  // Update game state to showdown
  await ctx.db.patch(gameState._id, {
    phase: "showdown",
    currentPlayerPosition: -1,
    updatedAt: Date.now(),
  });

  // According to poker rules, automatically start next hand after showdown
  await endHand(ctx, tableId);
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

  // Tournoi : si plus qu'un joueur a des chips, c'est terminé
  if (table.gameType === "tournament") {
    if (playersWithChips.length <= 1) {
      await endTournament(ctx, tableId);
      return; // ne pas schedule la main suivante
    }
  }

  if (playersWithChips.length >= 2) {
    // Schedule next hand 3s later — showdown phase stays visible to clients
    await ctx.scheduler.runAfter(
      3000,
      (internal as any)["core/gameEngine"].scheduleStartNextHand,
      { tableId }
    );
  } else {
    // End game - not enough players with chips
    await endGame(ctx, tableId);
  }
}

// Prepare for next hand
async function prepareNextHand(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  // Reset players for new hand
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  // Tournoi : marquer les nouveaux éliminés (chips=0 et pas encore eliminatedAt)
  if (table?.gameType === "tournament") {
    const now = Date.now();
    const stillIn = players.filter(
      (p: any) => !p.eliminatedAt && p.chips > 0
    ).length;
    let rankCounter = stillIn;
    for (const player of players) {
      if (!player.eliminatedAt && player.chips === 0) {
        await ctx.db.patch(player._id, {
          eliminatedAt: now,
          tournamentRank: rankCounter,
        });
        rankCounter--;
      }
    }
  }

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
    // Move dealer position to next player
    const playersWithChips = players.filter((p: any) => p.chips > 0);
    const nextDealerPosition = getNextDealerPosition(
      gameState.dealerPosition,
      playersWithChips.map((p: any) => p.seatPosition)
    );

    console.log(`🔄 Dealer rotation: ${gameState.dealerPosition} → ${nextDealerPosition}`);
    console.log(`👥 Players with chips: [${playersWithChips.map((p: any) => p.seatPosition).join(', ')}]`);

    await ctx.db.patch(gameState._id, {
      phase: "waiting",
      communityCards: [],
      pot: 0,
      currentBet: 0,
      currentPlayerPosition: -1,
      sidePots: [],
      dealerPosition: nextDealerPosition,
      updatedAt: Date.now(),
    });
  }
}

// Get showdown results for display
export const getShowdownResults = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .unique();

    if (!gameState || gameState.phase !== "showdown") {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    const activePlayers = players.filter((p) => !p.isFolded);

    if (activePlayers.length <= 1) {
      return null; // No showdown needed
    }

    const communityCards = gameState.communityCards.map(stringToCard);
    const results = [];

    // Pré-charger les users en un seul Promise.all → cache local
    const usersById = new Map<string, any>(
      await Promise.all(
        activePlayers.map(async (p) => [p.userId as string, await ctx.db.get(p.userId)] as const)
      )
    );

    for (const player of activePlayers) {
      const user = usersById.get(player.userId);
      const holeCards = player.cards.map(stringToCard);
      const allCards = [...holeCards, ...communityCards];
      const handRank = evaluateHandRobust(allCards);

      results.push({
        userId: player.userId,
        playerName: user?.name ?? "Joueur",
        seatPosition: player.seatPosition,
        handRank,
        cards: player.cards,
      });
    }

    // Sort by hand rank (highest first), tie-breaking via pokersolver kickers
    results.sort((a, b) => {
      if (b.handRank.rank !== a.handRank.rank) {
        return b.handRank.rank - a.handRank.rank;
      }
      const winners = determineWinners([
        { hand: a.handRank, playerId: 'a' },
        { hand: b.handRank, playerId: 'b' },
      ]);
      if (winners.length === 1) {
        return winners[0] === 'a' ? -1 : 1;
      }
      return 0; // True tie
    });

    // Mark the actual winner(s) for UI consumption (same logic as endHand)
    const winnerIds = determineWinners(
      results.map((r) => ({
        hand: r.handRank,
        playerId: String(r.userId),
      }))
    );
    const resultsWithWinnerFlag = results.map((r) => ({
      ...r,
      isWinner: winnerIds.includes(String(r.userId)),
    }));

    return {
      results: resultsWithWinnerFlag,
      pot: gameState.pot,
      communityCards: gameState.communityCards,
    };
  },
});

// End entire game session
async function endGame(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  const playersWithChips = players.filter((p: any) => p.chips > 0);

  if (table.gameType === "tournament") {
    // Tournament end logic
    if (playersWithChips.length === 1) {
      // Tournament winner!
      const winner = playersWithChips[0];
      const winnerUser = await ctx.db.get(winner.userId);

      // Add tournament winner to action feed
      await addActionToFeed(ctx, tableId, {
        playerId: winner._id,
        playerName: winnerUser?.name || "Joueur",
        action: "win",
        amount: winner.chips,
        message: `remporte le tournoi avec ${winner.chips} jetons!`,
        isSystem: false,
      });

      // Add tournament end system message
      await addActionToFeed(ctx, tableId, {
        playerName: "Système",
        action: "system",
        message: "Tournoi terminé - Redirection vers le lobby",
        isSystem: true,
      });

      // Create notifications for all players about tournament end
      for (const player of players) {
        const user = await ctx.db.get(player.userId);
        if (user) {
          await ctx.db.insert("notifications", {
            userId: player.userId,
            type: "game_end",
            title: "Tournoi terminé",
            message: player.userId === winner.userId
              ? `Félicitations! Vous avez remporté le tournoi avec ${winner.chips} jetons!`
              : `Le tournoi est terminé. ${winnerUser?.name || "Un joueur"} a remporté avec ${winner.chips} jetons.`,
            data: {
              tableId,
              isWinner: player.userId === winner.userId,
              winnerName: winnerUser?.name,
              finalChips: player.chips,
            },
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Mark table as finished for tournament
    await ctx.db.patch(tableId, { status: "finished" });

    // Reset game state for tournament end
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
            currentPlayerPosition: -1,
            sidePots: [],
            updatedAt: Date.now(),
          });
        }
      });

    // Don't reset players chips for tournament - keep final standings
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

  } else {
    // Cash game logic - reset everything and allow restart
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

    // Reset players for cash game
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

    // Update table status to waiting for cash games
    await ctx.db.patch(tableId, { status: "waiting" });
  }
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
    // Special case: in preflop, BB can check if no one has raised above the BB
    if (callAmount === 0) {
      actions.push({ action: "check", amount: 0 });
    } else if (gameState.phase === 'preflop' && gameState.lastRaiserPosition === undefined) {
      // In preflop, if no one has raised and player's bet equals current bet, they can check
      // This allows BB to check if everyone just called
      if (player.currentBet === gameState.currentBet) {
        actions.push({ action: "check", amount: 0 });
      }
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
// Internal-only: appelable uniquement via ctx.scheduler ou ctx.runMutation
// (pas exposé publiquement). Empêche un client malveillant de fold un autre joueur.
export const forcePlayerFold: any = internalMutation({
  args: { tableId: v.id("tables"), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.internal.gameEngine.playerAction, {
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
    await requireTableCreator(ctx, args.tableId);
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

// Internal function to start next hand automatically
async function startNextHandInternal(ctx: any, tableId: string) {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .unique();

  if (!gameState || gameState.phase !== "waiting") {
    return; // Not in waiting state
  }

  // Tournoi : montée de niveau si timer expiré
  const table = await ctx.db.get(tableId);
  if (!table) return;

  if (table.gameType === "tournament" && table.modules?.tournament) {
    const tournament = table.modules.tournament;
    const now = Date.now();
    if (
      tournament.status === "running" &&
      tournament.nextBlindIncrease > 0 &&
      now >= tournament.nextBlindIncrease &&
      (tournament.currentBlindLevel ?? 0) < tournament.blindStructure.length - 1
    ) {
      const newLevelIdx = (tournament.currentBlindLevel ?? 0) + 1;
      const newLevel = tournament.blindStructure[newLevelIdx];
      await ctx.db.patch(tableId, {
        smallBlind: newLevel.smallBlind,
        bigBlind: newLevel.bigBlind,
        modules: {
          ...table.modules,
          tournament: {
            ...tournament,
            currentBlindLevel: newLevelIdx,
            nextBlindIncrease: now + newLevel.duration,
          },
        },
      });
      await addActionToFeed(ctx, tableId, {
        playerName: "Système",
        action: "system",
        message: `Niveau ${newLevel.level} : SB ${newLevel.smallBlind} / BB ${newLevel.bigBlind}`,
        isSystem: true,
      });
    }
  }

  // Check if we have enough players
  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  const playersWithChips = players.filter((p: any) => p.chips > 0);
  if (playersWithChips.length < 2) {
    return; // Not enough players
  }

  // Add system message about new hand
  await addActionToFeed(ctx, tableId, {
    playerName: "Système",
    action: "system",
    message: "Nouvelle main commence",
    isSystem: true,
  });

  // Start the next hand by calling the startGame logic directly
  return await startGameInternal(ctx, tableId);
}

// Internal mutation invoked by ctx.scheduler.runAfter to start the next hand
// after the showdown delay. Wraps prepareNextHand + startNextHandInternal.
export const scheduleStartNextHand = internalMutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    try {
      // Reset gameState phase to waiting first so startNextHandInternal accepts to start
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_table", (q: any) => q.eq("tableId", args.tableId))
        .unique();
      if (gameState && gameState.phase === "showdown") {
        await ctx.db.patch(gameState._id, {
          phase: "waiting",
          autoAdvanceAt: undefined,
          updatedAt: Date.now(),
        });
      }
      await prepareNextHand(ctx, args.tableId);
      await startNextHandInternal(ctx, args.tableId);
    } catch (e) {
      console.error("scheduleStartNextHand error", e);
    }
  },
});

// Get game actions feed
export const getGameActions = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query("gameActions")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .order("desc")
      .take(50); // Get last 50 actions

    return actions; // Return in reverse chronological order (most recent first)
  },
});

// Public game state — sanitized to avoid exposing remainingDeck (C4.4).
import { sanitizeGameState } from "../shared/sanitize";

export const getGameState = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();
    return sanitizeGameState(state);
  },
});

// New state machine-based phase advancement
async function advanceToNextPhaseWithStateMachine(
  ctx: any,
  tableId: string,
  nextPhaseInfo: { nextPhase: any; autoAdvance: boolean; delay: number }
) {
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

  // Handle showdown specially
  if (nextPhaseInfo.nextPhase === "showdown") {
    await ctx.db.patch(gameState._id, {
      phase: "showdown",
      currentPlayerPosition: -1,
      autoAdvanceAt: nextPhaseInfo.autoAdvance ? Date.now() + nextPhaseInfo.delay : undefined,
      updatedAt: Date.now(),
    });
    // Si pas d'all-in (autoAdvance=false), déclencher determineWinner.
    // determineWinner enchaîne sur endHand qui schedule la main suivante via runAfter(3000).
    // Le path all-in garde son scheduler client-side via autoAdvanceAt.
    if (!nextPhaseInfo.autoAdvance) {
      await determineWinner(ctx, tableId);
    }
    return;
  }

  // Handle winner determination
  if (nextPhaseInfo.nextPhase === "ended") {
    await determineWinner(ctx, tableId);
    return;
  }

  // Reset players for new betting round
  const playersToReset = resetPlayersForNewRound(players);
  await Promise.all(
    playersToReset.map(({ playerId, resetData }) =>
      ctx.db.patch(playerId, resetData)
    )
  );

  // Deal community cards for new phase using the persistent deck
  let communityCards = [...gameState.communityCards];
  let remainingDeckCards: Card[] = (gameState.remainingDeck && gameState.remainingDeck.length > 0)
    ? gameState.remainingDeck.map(stringToCard)
    : shuffleDeck(createDeck());

  if (nextPhaseInfo.nextPhase !== 'showdown') {
    // Burn 1 card before each new street
    if (remainingDeckCards.length > 0) {
      remainingDeckCards = remainingDeckCards.slice(1);
    }
    switch (nextPhaseInfo.nextPhase) {
      case "flop": {
        const flopCards = dealCards(remainingDeckCards, 3);
        communityCards = flopCards.dealtCards.map(cardToString);
        remainingDeckCards = flopCards.remainingDeck;
        break;
      }
      case "turn": {
        const turnCard = dealCards(remainingDeckCards, 1);
        communityCards = [...gameState.communityCards, ...turnCard.dealtCards.map(cardToString)];
        remainingDeckCards = turnCard.remainingDeck;
        break;
      }
      case "river": {
        const riverCard = dealCards(remainingDeckCards, 1);
        communityCards = [...gameState.communityCards, ...riverCard.dealtCards.map(cardToString)];
        remainingDeckCards = riverCard.remainingDeck;
        break;
      }
    }
  }
  const remainingDeckStrings = remainingDeckCards.map(cardToString);

  // Find first player to act for post-flop phases
  const activePlayers = players.filter((p: any) => !p.isFolded && !p.isAllIn);
  const playerPositions = activePlayers.map((p: any) => p.seatPosition).sort((a: any, b: any) => a - b);

  let currentPlayerPosition = -1;

  // Only set currentPlayerPosition if there are players who need to act
  if (playerPositions.length > 0 && !nextPhaseInfo.autoAdvance) {
    currentPlayerPosition = getFirstPlayerToAct(
      gameState.dealerPosition,
      playerPositions,
      'postflop'
    );
    console.log(`🎮 Setting currentPlayerPosition to ${currentPlayerPosition} for phase ${nextPhaseInfo.nextPhase}`);
  }

  // Update game state
  await ctx.db.patch(gameState._id, {
    phase: nextPhaseInfo.nextPhase,
    communityCards,
    remainingDeck: remainingDeckStrings,
    currentBet: 0,
    currentPlayerPosition,
    lastRaiserPosition: undefined,
    autoAdvanceAt: nextPhaseInfo.autoAdvance ? Date.now() + nextPhaseInfo.delay : undefined,
    updatedAt: Date.now(),
  });

  // Debug log to verify autoAdvanceAt is set
  console.log(`🎮 Game state updated: phase=${nextPhaseInfo.nextPhase}, autoAdvanceAt=${nextPhaseInfo.autoAdvance ? 'SET' : 'NOT SET'}, delay=${nextPhaseInfo.delay}`);

  console.log(`🎮 Phase advanced to ${nextPhaseInfo.nextPhase}, autoAdvance: ${nextPhaseInfo.autoAdvance}, delay: ${nextPhaseInfo.delay}`);

  // Add phase announcement to action feed
  const phaseNames = {
    'flop': 'Flop',
    'turn': 'Turn',
    'river': 'River',
    'showdown': 'Abattage'
  };

  await addActionToFeed(ctx, tableId, {
    playerName: "Système",
    action: "phase",
    message: `Phase: ${phaseNames[nextPhaseInfo.nextPhase as keyof typeof phaseNames]}`,
    phase: nextPhaseInfo.nextPhase,
    isSystem: true,
  });

}

async function endTournament(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table || table.gameType !== "tournament" || !table.modules?.tournament) return;

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  // Le winner est le seul avec chips > 0
  const winner = players.find((p: any) => p.chips > 0);
  if (!winner) return;
  if (!winner.tournamentRank) {
    await ctx.db.patch(winner._id, { tournamentRank: 1 });
  }

  // Re-fetch winner with updated rank
  const winnerUpdated = await ctx.db.get(winner._id);
  if (!winnerUpdated) return;

  const tournament = table.modules.tournament;
  const totalPot = (table.maxPlayers ?? players.length) * (table.buyIn ?? 0);

  // Build finalRanking : all players sorted by tournamentRank ascending (1 = winner)
  const allPlayers = [winnerUpdated, ...players.filter((p: any) => p._id !== winner._id && p.eliminatedAt)];
  allPlayers.sort((a: any, b: any) => (a.tournamentRank ?? 999) - (b.tournamentRank ?? 999));

  const finalRanking = allPlayers.map((p: any) => {
    const prizeRow = tournament.prizeStructure.find(
      (pz: any) => pz.position === p.tournamentRank
    );
    const prize = prizeRow ? Math.floor(totalPot * prizeRow.percentage / 100) : 0;
    return {
      userId: p.userId,
      position: p.tournamentRank ?? 0,
      prize,
    };
  });

  const now = Date.now();
  await ctx.db.patch(tableId, {
    status: "finished",
    modules: {
      ...table.modules,
      tournament: {
        ...tournament,
        status: "finished",
        finishedAt: now,
        finalRanking,
      },
    },
  });

  const winnerUser = await ctx.db.get(winner.userId);
  await addActionToFeed(ctx, tableId, {
    playerName: "Système",
    action: "system",
    message: `Tournoi terminé · Vainqueur : ${winnerUser?.name ?? "Joueur"}`,
    isSystem: true,
  });
}

export { endHand, advanceToNextPhase, advanceToNextPhaseWithStateMachine };

