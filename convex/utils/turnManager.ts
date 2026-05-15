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

// "Dead button" rule : trouve le prochain siège actif strictement après
// `from` en parcourant clockwise (positions triées). Permet au bouton
// dealer de rester sur un siège éliminé tout en assignant SB/BB aux
// joueurs actifs suivants.
function nextActiveAfter(from: number, playerPositions: number[]): number {
  const after = playerPositions.filter((p) => p > from);
  if (after.length > 0) return after[0];
  // wrap around
  return playerPositions[0];
}

// Get blind positions based on number of players.
// Supporte le cas "dead button" : si dealerPosition ne correspond à aucun
// joueur actif (joueur éliminé), on calcule SB en cherchant le premier
// actif clockwise à partir de la position du bouton.
export function getBlindPositions(
  dealerPosition: number,
  playerPositions: number[]
): { smallBlind: number; bigBlind: number } {
  const numPlayers = playerPositions.length;

  if (numPlayers < 2) {
    throw new Error("Need at least 2 players");
  }

  const dealerIndex = playerPositions.indexOf(dealerPosition);
  const dealerIsActive = dealerIndex >= 0;

  if (numPlayers === 2) {
    // Heads-up: dealer = small blind (s'il est actif), sinon le premier
    // actif clockwise après le bouton est SB.
    if (dealerIsActive) {
      const bigBlindPosition = playerPositions.find((pos) => pos !== dealerPosition);
      if (bigBlindPosition === undefined) {
        throw new Error("Cannot find big blind position in heads-up");
      }
      return { smallBlind: dealerPosition, bigBlind: bigBlindPosition };
    }
    const sb = nextActiveAfter(dealerPosition, playerPositions);
    const bb = playerPositions.find((p) => p !== sb)!;
    return { smallBlind: sb, bigBlind: bb };
  }

  // Multi-way
  if (dealerIsActive) {
    const sbIndex = (dealerIndex + 1) % numPlayers;
    const bbIndex = (dealerIndex + 2) % numPlayers;
    return {
      smallBlind: playerPositions[sbIndex],
      bigBlind: playerPositions[bbIndex],
    };
  }
  // Dead button : SB = premier actif clockwise après la position du bouton.
  const sb = nextActiveAfter(dealerPosition, playerPositions);
  const sbIdx = playerPositions.indexOf(sb);
  const bb = playerPositions[(sbIdx + 1) % numPlayers];
  return { smallBlind: sb, bigBlind: bb };
}

// Get first player to act after blinds
export function getFirstPlayerToAct(
  dealerPosition: number,
  playerPositions: number[],
  phase: 'preflop' | 'postflop'
): number {
  const numPlayers = playerPositions.length;

  if (numPlayers < 2) return -1;

  const dealerIndex = playerPositions.indexOf(dealerPosition);
  const dealerIsActive = dealerIndex >= 0;
  // Index "virtuel" du dealer dans la liste active : si dead button, on
  // utilise l'index du premier actif AVANT le dealer (pour que +1, +2, +3
  // pointent correctement vers SB/BB/UTG).
  const effectiveDealerIndex = dealerIsActive
    ? dealerIndex
    : (playerPositions.indexOf(nextActiveAfter(dealerPosition, playerPositions)) - 1 + numPlayers) % numPlayers;

  if (phase === 'preflop') {
    if (numPlayers === 2) {
      // Heads-up preflop: SB acts first
      const { smallBlind } = getBlindPositions(dealerPosition, playerPositions);
      return smallBlind;
    }
    const firstActorIndex = (effectiveDealerIndex + 3) % numPlayers;
    return playerPositions[firstActorIndex];
  }
  // Post-flop: first active player after dealer
  const firstActorIndex = (effectiveDealerIndex + 1) % numPlayers;
  return playerPositions[firstActorIndex];
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

// Calculate side pots from each player's TOTAL contribution to the hand.
// Includes folded players' contributions in the pot amounts (their chips
// stay in the pot) but excludes them from eligibility.
export function calculateSidePots(
  players: Array<{
    userId: string;
    contribution: number; // cumul sur toute la main : blinds + bets/calls/raises/all-in
    isFolded: boolean;
  }>
): Array<{ amount: number; eligiblePlayers: string[] }> {
  const contributors = players.filter(p => p.contribution > 0);
  if (contributors.length === 0) return [];

  // Niveaux uniques de contribution, ordre croissant.
  const levels = Array.from(new Set(contributors.map(p => p.contribution))).sort(
    (a, b) => a - b,
  );

  const sidePots: Array<{ amount: number; eligiblePlayers: string[] }> = [];
  let previousLevel = 0;

  for (const level of levels) {
    const diff = level - previousLevel;
    previousLevel = level;
    if (diff <= 0) continue;

    // Tous les joueurs (foldés inclus) qui ont atteint au moins ce niveau
    // ont contribué `diff` à cette couche.
    const reached = contributors.filter(p => p.contribution >= level);
    const amount = diff * reached.length;

    // Éligibles pour gagner cette couche : ceux atteints qui ne sont pas foldés.
    const eligible = reached.filter(p => !p.isFolded).map(p => p.userId);

    if (eligible.length > 0) {
      sidePots.push({ amount, eligiblePlayers: eligible });
    } else if (sidePots.length > 0) {
      // Tous les éligibles à ce niveau ont fold (cas dégénéré : ne devrait
      // pas survenir car le dernier non-foldé est par construction le plus
      // haut contributeur). Par défense on rattache ce diff au pot précédent.
      sidePots[sidePots.length - 1].amount += amount;
    }
  }

  return sidePots;
}

// Check if hand should end (only one player left)
export function shouldEndHand(players: Array<{ isFolded: boolean; chips: number; eliminatedAt?: number }>): boolean {
  // Un joueur all-in (chips=0) reste actif dans la main : il a déjà engagé son
  // tapis et a droit au pot s'il gagne au showdown. Le seul cas où la main doit
  // s'arrêter immédiatement est : tous les autres ont fold (1 seul non-folded).
  // Les joueurs éliminés (eliminatedAt) sont exclus comme s'ils étaient folded
  // (défense en profondeur si le flag isFolded n'a pas été mis à jour).
  const stillIn = players.filter(p => !p.isFolded && !p.eliminatedAt);
  return stillIn.length <= 1;
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