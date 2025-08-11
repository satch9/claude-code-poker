// Validations serveur renforcées pour sécurité anti-triche

export interface PlayerAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  timestamp?: number;
}

export interface ActionValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedAmount?: number;
}

export interface ValidationContext {
  gameState: GameState;
  player: Player;
  table: {
    bigBlind: number;
    smallBlind: number;
    maxBuyIn?: number;
  };
  action: PlayerAction;
}

/**
 * Validation principale des actions de joueur - SÉCURITÉ CRITIQUE
 */
export function validatePlayerAction(context: ValidationContext): ActionValidationResult {
  const { gameState, player, table, action } = context;
  
  // === VALIDATIONS DE BASE ===
  
  // 1. Vérifier que c'est le tour du joueur
  if (gameState.currentPlayerPosition !== player.seatPosition) {
    return { 
      isValid: false, 
      error: `Not your turn. Current player: ${gameState.currentPlayerPosition}, your position: ${player.seatPosition}` 
    };
  }
  
  // 2. Vérifier que le joueur peut encore agir
  if (player.isFolded) {
    return { isValid: false, error: 'Cannot act after folding' };
  }
  
  if (player.isAllIn && action.action !== 'fold') {
    return { isValid: false, error: 'Cannot act after going all-in except fold' };
  }
  
  // 3. Vérifier la phase de jeu
  if (gameState.phase === 'waiting' || gameState.phase === 'showdown') {
    return { isValid: false, error: `Cannot act during ${gameState.phase} phase` };
  }
  
  // 4. Anti-double-action (prévention spam)
  const now = Date.now();
  if (player.lastActionTime && (now - player.lastActionTime) < 500) { // 500ms minimum
    return { isValid: false, error: 'Action too fast, please wait' };
  }
  
  // === VALIDATIONS SPÉCIFIQUES PAR ACTION ===
  
  switch (action.action) {
    case 'fold':
      return validateFold(context);
    case 'check':
      return validateCheck(context);
    case 'call':
      return validateCall(context);
    case 'raise':
      return validateRaise(context);
    case 'all-in':
      return validateAllIn(context);
    default:
      return { isValid: false, error: `Invalid action: ${action.action}` };
  }
}

/**
 * Validation du fold
 */
function validateFold(context: ValidationContext): ActionValidationResult {
  // Le fold est toujours valide (sauf cas déjà traités ci-dessus)
  return { 
    isValid: true, 
    sanitizedAmount: 0 
  };
}

/**
 * Validation du check
 */
function validateCheck(context: ValidationContext): ActionValidationResult {
  const { gameState, player } = context;
  
  // Check seulement possible si pas de mise en cours ou si le joueur a déjà misé le montant requis
  const amountToCall = Math.max(0, gameState.currentBet - player.currentBet);
  
  if (amountToCall > 0) {
    return { 
      isValid: false, 
      error: `Cannot check, must call ${amountToCall} or fold` 
    };
  }
  
  return { 
    isValid: true, 
    sanitizedAmount: 0 
  };
}

/**
 * Validation du call
 */
function validateCall(context: ValidationContext): ActionValidationResult {
  const { gameState, player } = context;
  
  const amountToCall = Math.max(0, gameState.currentBet - player.currentBet);
  
  if (amountToCall === 0) {
    return { 
      isValid: false, 
      error: 'Nothing to call, use check instead' 
    };
  }
  
  if (amountToCall > player.chips) {
    return { 
      isValid: false, 
      error: `Insufficient chips to call ${amountToCall}. Use all-in instead` 
    };
  }
  
  return { 
    isValid: true, 
    sanitizedAmount: amountToCall 
  };
}

/**
 * Validation du raise
 */
function validateRaise(context: ValidationContext): ActionValidationResult {
  const { gameState, player, table, action } = context;
  
  if (!action.amount || action.amount <= 0) {
    return { 
      isValid: false, 
      error: 'Raise amount must be positive' 
    };
  }
  
  // Calculer le montant minimum de raise
  const amountToCall = Math.max(0, gameState.currentBet - player.currentBet);
  const lastRaiseAmount = gameState.lastRaiseAmount || table.bigBlind;
  const minRaise = gameState.currentBet + lastRaiseAmount;
  const totalBetRequired = amountToCall + action.amount;
  
  // Vérifications du montant
  if (totalBetRequired > player.chips) {
    return { 
      isValid: false, 
      error: `Insufficient chips for raise of ${action.amount}. Available: ${player.chips}` 
    };
  }
  
  if (action.amount < lastRaiseAmount && totalBetRequired < player.chips) {
    return { 
      isValid: false, 
      error: `Minimum raise is ${lastRaiseAmount}` 
    };
  }
  
  // Vérification que c'est effectivement un raise
  const newTotalBet = player.currentBet + totalBetRequired;
  if (newTotalBet <= gameState.currentBet) {
    return { 
      isValid: false, 
      error: 'Raise amount must increase the current bet' 
    };
  }
  
  return { 
    isValid: true, 
    sanitizedAmount: totalBetRequired 
  };
}

/**
 * Validation de l'all-in
 */
function validateAllIn(context: ValidationContext): ActionValidationResult {
  const { player } = context;
  
  if (player.chips <= 0) {
    return { 
      isValid: false, 
      error: 'No chips available for all-in' 
    };
  }
  
  return { 
    isValid: true, 
    sanitizedAmount: player.chips 
  };
}

/**
 * Validation de l'état cohérent du joueur
 */
export function validatePlayerState(player: Player, gameState: GameState): ActionValidationResult {
  // Vérifier que les chips du joueur sont cohérents
  if (player.chips < 0) {
    return { 
      isValid: false, 
      error: 'Player chips cannot be negative' 
    };
  }
  
  // Vérifier que la mise actuelle n'excède pas les chips
  if (player.currentBet > (player.chips + player.currentBet)) {
    return { 
      isValid: false, 
      error: 'Current bet exceeds available chips' 
    };
  }
  
  // Vérifier que les joueurs foldés n'ont pas de mise en cours
  if (player.isFolded && player.currentBet > 0 && gameState.phase !== 'showdown') {
    return { 
      isValid: false, 
      error: 'Folded player cannot have current bet' 
    };
  }
  
  return { isValid: true };
}

/**
 * Validation de l'état de la partie
 */
export function validateGameState(gameState: GameState, players: Player[]): ActionValidationResult {
  const activePlayers = players.filter(p => !p.isFolded);
  
  // Au moins 2 joueurs actifs
  if (activePlayers.length < 1) {
    return { 
      isValid: false, 
      error: 'Not enough active players' 
    };
  }
  
  // Vérifier que la position du joueur courant existe
  const currentPlayer = players.find(p => p.seatPosition === gameState.currentPlayerPosition);
  if (!currentPlayer && gameState.phase !== 'showdown' && gameState.phase !== 'waiting') {
    return { 
      isValid: false, 
      error: 'Current player position invalid' 
    };
  }
  
  // Vérifier que le pot est cohérent
  const totalCurrentBets = players.reduce((sum, p) => sum + p.currentBet, 0);
  const expectedPot = gameState.pot + totalCurrentBets;
  
  // Tolérance pour les calculs de floating point
  if (Math.abs(expectedPot - (gameState.pot + totalCurrentBets)) > 1) {
    return { 
      isValid: false, 
      error: 'Pot calculation inconsistency detected' 
    };
  }
  
  return { isValid: true };
}

/**
 * Sanitize et valide les montants pour éviter les exploits
 */
export function sanitizeAmount(amount: number | undefined): number {
  if (amount === undefined || amount === null) return 0;
  
  // Convertir en entier pour éviter les problèmes de floating point
  const sanitized = Math.floor(Math.abs(amount));
  
  // Limite maximum raisonnable pour éviter les overflows
  const MAX_BET = 1000000000; // 1 milliard
  
  return Math.min(sanitized, MAX_BET);
}

/**
 * Rate limiting pour prévenir le spam d'actions
 */
export class ActionRateLimiter {
  private lastActions: Map<string, number> = new Map();
  private readonly minInterval: number = 300; // 300ms entre actions
  
  canPlayerAct(playerId: string): boolean {
    const now = Date.now();
    const lastAction = this.lastActions.get(playerId);
    
    if (!lastAction) {
      this.lastActions.set(playerId, now);
      return true;
    }
    
    const timeSinceLastAction = now - lastAction;
    if (timeSinceLastAction >= this.minInterval) {
      this.lastActions.set(playerId, now);
      return true;
    }
    
    return false;
  }
  
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [playerId, timestamp] of this.lastActions.entries()) {
      if (now - timestamp > maxAge) {
        this.lastActions.delete(playerId);
      }
    }
  }
}

// Instance globale du rate limiter
export const actionRateLimiter = new ActionRateLimiter();