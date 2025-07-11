// Game State Machine for Texas Hold'em
// This module manages the state transitions and game flow

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended';

export interface GameStateTransition {
  from: GamePhase;
  to: GamePhase;
  condition: string;
  autoAdvance?: boolean;
  delay?: number; // in milliseconds
}

export const GAME_TRANSITIONS: GameStateTransition[] = [
  { from: 'waiting', to: 'preflop', condition: 'game_started', autoAdvance: false },
  { from: 'preflop', to: 'flop', condition: 'betting_complete', autoAdvance: false },
  { from: 'flop', to: 'turn', condition: 'betting_complete', autoAdvance: false },
  { from: 'turn', to: 'river', condition: 'betting_complete', autoAdvance: false },
  { from: 'river', to: 'showdown', condition: 'betting_complete', autoAdvance: false },
  { from: 'showdown', to: 'ended', condition: 'winner_determined', autoAdvance: true, delay: 3000 },
  
  // Special transitions for all-in scenarios
  { from: 'preflop', to: 'flop', condition: 'all_players_all_in', autoAdvance: true, delay: 1000 },
  { from: 'flop', to: 'turn', condition: 'all_players_all_in', autoAdvance: true, delay: 2000 },
  { from: 'turn', to: 'river', condition: 'all_players_all_in', autoAdvance: true, delay: 2000 },
  { from: 'river', to: 'showdown', condition: 'all_players_all_in', autoAdvance: true, delay: 2000 },
];

export interface PlayerState {
  chips: number;
  currentBet: number;
  hasActed: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  lastAction?: string;
  seatPosition: number;
}

export interface GameConditions {
  allPlayersAllIn: boolean;
  bettingComplete: boolean;
  onlyOnePlayerLeft: boolean;
  gameStarted: boolean;
  winnerDetermined: boolean;
}

export function evaluateGameConditions(
  players: PlayerState[],
  currentBet: number,
  lastRaiserPosition?: number
): GameConditions {
  const activePlayers = players.filter(p => !p.isFolded);
  const playersNotAllIn = activePlayers.filter(p => !p.isAllIn);
  
  // All players are all-in
  const allPlayersAllIn = playersNotAllIn.length === 0 && activePlayers.length > 1;
  
  // Only one player left (others folded)
  const onlyOnePlayerLeft = activePlayers.length <= 1;
  
  // Betting is complete
  let bettingComplete = false;
  
  if (onlyOnePlayerLeft) {
    bettingComplete = true;
  } else if (allPlayersAllIn) {
    bettingComplete = true;
  } else if (playersNotAllIn.length === 1) {
    // Special case: only one player not all-in
    const remainingPlayer = playersNotAllIn[0];
    
    if (lastRaiserPosition !== undefined) {
      // Someone raised/went all-in, remaining player must respond
      const hasActedAfterRaise = remainingPlayer.hasActed && 
        remainingPlayer.currentBet === currentBet;
      bettingComplete = hasActedAfterRaise;
    } else {
      // No raise, just check if they've acted
      bettingComplete = remainingPlayer.hasActed;
    }
  } else {
    // Multiple players not all-in
    if (currentBet > 0) {
      // All players must match the current bet
      const allMatched = playersNotAllIn.every(p => p.currentBet === currentBet);
      
      if (allMatched) {
        if (lastRaiserPosition !== undefined) {
          // Someone raised, all others must have acted since
          const playersAfterRaise = playersNotAllIn.filter(p => 
            p.seatPosition !== lastRaiserPosition
          );
          bettingComplete = playersAfterRaise.every(p => p.hasActed);
        } else {
          // No raise, everyone has acted
          bettingComplete = playersNotAllIn.every(p => p.hasActed);
        }
      }
    } else {
      // No bet, all must have acted
      bettingComplete = playersNotAllIn.every(p => p.hasActed);
    }
  }
  
  return {
    allPlayersAllIn,
    bettingComplete,
    onlyOnePlayerLeft,
    gameStarted: true, // Assume game is started if we're evaluating
    winnerDetermined: false // Will be set externally after showdown
  };
}

export function getValidTransitions(currentPhase: GamePhase): GameStateTransition[] {
  return GAME_TRANSITIONS.filter(t => t.from === currentPhase);
}

export function getNextPhase(
  currentPhase: GamePhase,
  conditions: GameConditions
): { nextPhase: GamePhase; autoAdvance: boolean; delay: number } | null {
  const validTransitions = getValidTransitions(currentPhase);
  
  for (const transition of validTransitions) {
    let conditionMet = false;
    
    switch (transition.condition) {
      case 'game_started':
        conditionMet = conditions.gameStarted;
        break;
      case 'betting_complete':
        conditionMet = conditions.bettingComplete && !conditions.allPlayersAllIn;
        break;
      case 'all_players_all_in':
        conditionMet = conditions.allPlayersAllIn;
        break;
      case 'winner_determined':
        conditionMet = conditions.winnerDetermined;
        break;
      default:
        conditionMet = false;
    }
    
    if (conditionMet) {
      return {
        nextPhase: transition.to,
        autoAdvance: transition.autoAdvance || false,
        delay: transition.delay || 0
      };
    }
  }
  
  return null;
}

export function shouldAutoAdvance(
  currentPhase: GamePhase,
  conditions: GameConditions
): { shouldAdvance: boolean; delay: number } {
  const nextPhaseInfo = getNextPhase(currentPhase, conditions);
  
  if (!nextPhaseInfo) {
    return { shouldAdvance: false, delay: 0 };
  }
  
  return {
    shouldAdvance: nextPhaseInfo.autoAdvance,
    delay: nextPhaseInfo.delay
  };
}

// Debug helper
export function debugGameState(
  currentPhase: GamePhase,
  players: PlayerState[],
  currentBet: number,
  lastRaiserPosition?: number
): void {
  const conditions = evaluateGameConditions(players, currentBet, lastRaiserPosition);
  const nextPhaseInfo = getNextPhase(currentPhase, conditions);
  
  console.log('🎮 Game State Debug:', {
    currentPhase,
    conditions,
    nextPhaseInfo,
    players: players.map(p => ({
      seat: p.seatPosition,
      chips: p.chips,
      bet: p.currentBet,
      hasActed: p.hasActed,
      isFolded: p.isFolded,
      isAllIn: p.isAllIn,
      lastAction: p.lastAction
    }))
  });
}