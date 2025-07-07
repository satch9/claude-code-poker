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
  }>,
  currentBet: number,
  lastRaiserPosition?: number
): boolean {
  const activePlayers = players.filter(p => !p.isFolded);
  
  // Only one player left
  if (activePlayers.length <= 1) return true;
  
  // All players are all-in except one
  const playersNotAllIn = activePlayers.filter(p => !p.isAllIn);
  if (playersNotAllIn.length <= 1) return true;
  
  // Check if all active players have acted and matched the current bet
  const allActed = activePlayers.every(p => 
    p.hasActed && (p.currentBet === currentBet || p.isAllIn)
  );
  
  if (!allActed) return false;
  
  // If there was a raiser, make sure we've gone around to them
  if (lastRaiserPosition !== undefined) {
    const raiser = players.find(p => p.seatPosition === lastRaiserPosition);
    return raiser ? raiser.hasActed : true;
  }
  
  return true;
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
    return {
      smallBlind: dealerPosition,
      bigBlind: playerPositions.find(pos => pos !== dealerPosition) || dealerPosition
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
      // Heads-up preflop: big blind acts first (non-dealer)
      return playerPositions.find(pos => pos !== dealerPosition) || dealerPosition;
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
  if (currentIndex === -1) return playerPositions[0];
  
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
  return players
    .filter(p => !p.isFolded && !p.isAllIn)
    .map(p => ({
      playerId: p._id,
      resetData: {
        currentBet: 0,
        hasActed: false,
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