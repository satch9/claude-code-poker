// Turn and phase management utilities

export interface TurnState {
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  playersInHand: number[];
  bettingRoundComplete: boolean;
  lastRaiserIndex: number;
}

// Get next active player index
export function getNextActivePlayer(
  currentIndex: number, 
  activePlayers: number[], 
  lastRaiserIndex?: number
): number {
  if (activePlayers.length <= 1) return -1;
  
  const currentPos = activePlayers.indexOf(currentIndex);
  if (currentPos === -1) return activePlayers[0];
  
  // If we've gone around to the last raiser, betting round is complete
  if (lastRaiserIndex !== undefined && currentIndex === lastRaiserIndex) {
    return -1;
  }
  
  const nextPos = (currentPos + 1) % activePlayers.length;
  return activePlayers[nextPos];
}

// Check if betting round is complete
export function isBettingRoundComplete(
  players: Array<{
    seatPosition: number;
    currentBet: number;
    hasActed: boolean;
    isFolded: boolean;
    isAllIn: boolean;
    lastAction?: string;
  }>,
  currentBet: number,
  lastRaiserPosition?: number
): boolean {
  const activePlayers = players.filter(p => !p.isFolded);
  
  // Only one player left
  if (activePlayers.length <= 1) return true;
  
  // Check if all non-all-in players have acted properly
  const playersNotAllIn = activePlayers.filter(p => !p.isAllIn);
  console.log("Debug isBettingRoundComplete:", {
    totalActivePlayers: activePlayers.length,
    playersNotAllIn: playersNotAllIn.length,
    playersNotAllInDetails: playersNotAllIn.map(p => ({
      seat: p.seatPosition,
      hasActed: p.hasActed,
      currentBet: p.currentBet,
      lastAction: p.lastAction
    }))
  });
  
  // If all players are all-in, the betting round is complete
  if (playersNotAllIn.length === 0) {
    console.log("All players are all-in - ending betting round");
    return true;
  }
  
  // If only one player is not all-in, they must have had a chance to act AFTER the all-in
  if (playersNotAllIn.length === 1) {
    const remainingPlayer = playersNotAllIn[0];
    
    // Check if there's a raise that this player hasn't responded to
    if (lastRaiserPosition !== undefined) {
      // If someone raised/went all-in and this player hasn't acted since, they need to act
      const hasActedAfterRaise = remainingPlayer.hasActed && (
        remainingPlayer.lastAction === 'call' ||
        remainingPlayer.lastAction === 'raise' ||
        remainingPlayer.lastAction === 'all-in' ||
        remainingPlayer.lastAction === 'fold'
      );
      
      console.log("Only one player not all-in (with raise):", {
        seat: remainingPlayer.seatPosition,
        hasActed: remainingPlayer.hasActed,
        lastAction: remainingPlayer.lastAction,
        currentBet: remainingPlayer.currentBet,
        expectedBet: currentBet,
        hasActedAfterRaise,
        shouldEnd: hasActedAfterRaise && remainingPlayer.currentBet === currentBet
      });
      
      return hasActedAfterRaise && remainingPlayer.currentBet === currentBet;
    }
    
    // No raise, just check if they've acted
    const hasActedAfterAllIn = remainingPlayer.hasActed;
    console.log("Only one player not all-in:", {
      seat: remainingPlayer.seatPosition,
      hasActed: hasActedAfterAllIn,
      shouldEnd: hasActedAfterAllIn
    });
    return hasActedAfterAllIn;
  }
  
  // If there's a current bet, all players must either:
  // 1. Match the bet (call/raise) or be all-in
  // 2. Have folded
  if (currentBet > 0) {
    const playersWhoNeedToAct = activePlayers.filter(p => !p.isAllIn);
    
    console.log("Debug currentBet > 0:", {
      currentBet,
      playersWhoNeedToAct: playersWhoNeedToAct.map(p => ({
        seat: p.seatPosition,
        currentBet: p.currentBet,
        hasActed: p.hasActed,
        lastAction: p.lastAction
      }))
    });
    
    // Check if all non-all-in players have matched the current bet
    const allMatched = playersWhoNeedToAct.every(p => p.currentBet === currentBet);
    
    console.log("Debug allMatched:", { allMatched });
    
    if (!allMatched) {
      console.log("Returning false because not all matched");
      return false;
    }
    
    // If there was a raise, everyone after the raiser must have acted
    if (lastRaiserPosition !== undefined) {
      // Find who raised last
      const lastRaiser = players.find(p => p.seatPosition === lastRaiserPosition);
      if (!lastRaiser) return false;
      
      // All players who can still act must have acted since the last raise
      const playersAfterRaise = playersWhoNeedToAct.filter(p => 
        p.seatPosition !== lastRaiserPosition
      );
      
      // They must have either called, raised again, or folded after the raise
      const allActedAfterRaise = playersAfterRaise.every(p => 
        p.hasActed && (
          p.currentBet === currentBet || 
          p.lastAction === 'fold' ||
          p.lastAction === 'call' ||
          p.lastAction === 'raise' ||
          p.lastAction === 'all-in'
        )
      );
      
      return allActedAfterRaise;
    }
  }
  
  // For no-bet rounds (like initial preflop or post-flop), all must have acted
  const allActed = activePlayers.every(p => 
    p.hasActed && (p.currentBet === currentBet || p.isAllIn)
  );
  
  return allActed;
}

// Get blind positions based on number of players
export function getBlindPositions(
  dealerPosition: number,
  playerPositions: number[]
): { smallBlind: number; bigBlind: number } {
  const numPlayers = playerPositions.length;
  
  if (numPlayers < 2) {
    throw new Error("Need at least 2 players");
  }
  
  if (numPlayers === 2) {
    // Heads-up: dealer is small blind
    const bigBlindPosition = playerPositions.find(pos => pos !== dealerPosition);
    if (bigBlindPosition === undefined) {
      throw new Error("Cannot find big blind position in heads-up");
    }
    return {
      smallBlind: dealerPosition,
      bigBlind: bigBlindPosition
    };
  } else {
    // Multi-way: small blind is next to dealer
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    const sbIndex = (dealerIndex + 1) % numPlayers;
    const bbIndex = (dealerIndex + 2) % numPlayers;
    
    return {
      smallBlind: playerPositions[sbIndex],
      bigBlind: playerPositions[bbIndex]
    };
  }
}

// Get first player to act after blinds
export function getFirstPlayerToAct(
  dealerPosition: number,
  playerPositions: number[],
  phase: 'preflop' | 'postflop'
): number {
  const numPlayers = playerPositions.length;
  
  if (numPlayers < 2) return -1;
  
  if (phase === 'preflop') {
    if (numPlayers === 2) {
      // Heads-up preflop: small blind (dealer) acts first
      return dealerPosition;
    } else {
      // Multi-way preflop: player after big blind acts first
      const dealerIndex = playerPositions.indexOf(dealerPosition);
      const firstActorIndex = (dealerIndex + 3) % numPlayers;
      return playerPositions[firstActorIndex];
    }
  } else {
    // Post-flop: first active player after dealer acts first
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    const firstActorIndex = (dealerIndex + 1) % numPlayers;
    return playerPositions[firstActorIndex];
  }
}

// Advance to next hand
export function getNextDealerPosition(
  currentDealerPosition: number,
  playerPositions: number[]
): number {
  const currentIndex = playerPositions.indexOf(currentDealerPosition);
  
  if (currentIndex === -1) {
    // Dealer éliminé: trouver le prochain dans l'ordre horaire logique
    // Chercher la plus petite position > currentDealerPosition
    const nextPositions = playerPositions.filter(pos => pos > currentDealerPosition);
    if (nextPositions.length > 0) {
      return Math.min(...nextPositions);
    } else {
      // Pas de position supérieure, prendre la plus petite (wrap around)
      return Math.min(...playerPositions);
    }
  }
  
  const nextIndex = (currentIndex + 1) % playerPositions.length;
  return playerPositions[nextIndex];
}

// Reset players for new betting round
export function resetPlayersForNewRound(
  players: Array<{
    _id: string;
    currentBet: number;
    hasActed: boolean;
    isFolded: boolean;
    isAllIn: boolean;
  }>
): Array<{
  playerId: string;
  resetData: {
    currentBet: number;
    hasActed: boolean;
    lastAction?: undefined;
  };
}> {
  // Reset ALL players who are not folded (including all-in players for consistency)
  return players
    .filter(p => !p.isFolded)
    .map(p => ({
      playerId: p._id,
      resetData: {
        currentBet: 0,
        hasActed: p.isAllIn, // All-in players have "acted" automatically
        lastAction: undefined,
      }
    }));
}

// Calculate side pots for all-in scenarios
export function calculateSidePots(
  players: Array<{
    userId: string;
    currentBet: number;
    isAllIn: boolean;
    isFolded: boolean;
  }>
): Array<{ amount: number; eligiblePlayers: string[] }> {
  const activePlayers = players.filter(p => !p.isFolded && p.currentBet > 0);
  
  if (activePlayers.length === 0) return [];
  
  // Sort by bet amount
  const sortedBets = activePlayers
    .map(p => ({ userId: p.userId, bet: p.currentBet, isAllIn: p.isAllIn }))
    .sort((a, b) => a.bet - b.bet);
  
  const sidePots: Array<{ amount: number; eligiblePlayers: string[] }> = [];
  let previousBet = 0;
  
  for (let i = 0; i < sortedBets.length; i++) {
    const currentBet = sortedBets[i].bet;
    const betDifference = currentBet - previousBet;
    
    if (betDifference > 0) {
      const eligiblePlayers = sortedBets.slice(i).map(p => p.userId);
      const potAmount = betDifference * eligiblePlayers.length;
      
      sidePots.push({
        amount: potAmount,
        eligiblePlayers
      });
    }
    
    previousBet = currentBet;
  }
  
  return sidePots;
}

// Check if hand should end (only one player left)
export function shouldEndHand(players: Array<{ isFolded: boolean }>): boolean {
  const activePlayers = players.filter(p => !p.isFolded);
  return activePlayers.length <= 1;
}

// Get phase progression
export function getNextPhase(currentPhase: string): string {
  const phases = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentIndex = phases.indexOf(currentPhase);
  
  if (currentIndex === -1 || currentIndex >= phases.length - 1) {
    return 'showdown';
  }
  
  return phases[currentIndex + 1];
}