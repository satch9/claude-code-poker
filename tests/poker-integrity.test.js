// Tests critiques d'intégrité du moteur de poker
import { describe, it, expect, beforeEach } from 'vitest';

// Import des utilitaires de test
import { 
  evaluateHandRobust, 
  determineWinners,
  validateHand 
} from '../convex/utils/handEvaluator';

import { 
  validatePlayerAction, 
  validateGameState,
  sanitizeAmount,
  actionRateLimiter 
} from '../convex/utils/validation';

import { 
  calculateSidePotsEnhanced,
  validateSidePots 
} from '../convex/utils/enhancedSidePots';

import { 
  getBlindPositions 
} from '../convex/utils/poker';

describe('🃏 Évaluation des Mains - Tests Critiques', () => {
  it('devrait évaluer correctement un royal flush', () => {
    const cards = [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'spades' },
      { rank: 'J', suit: 'spades' },
      { rank: '10', suit: 'spades' }
    ];
    
    const result = evaluateHandRobust(cards);
    expect(result.name).toBe('Royal Flush');
    expect(result.rank).toBe(9);
  });

  it('devrait gérer les égalités correctement', () => {
    const hand1 = [
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'clubs' },
      { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'J', suit: 'diamonds' }
    ];
    
    const hand2 = [
      { rank: 'A', suit: 'diamonds' },
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'Q', suit: 'clubs' },
      { rank: '10', suit: 'spades' }
    ];
    
    const hands = [
      { hand: evaluateHandRobust(hand1), playerId: 'player1' },
      { hand: evaluateHandRobust(hand2), playerId: 'player2' }
    ];
    
    const winners = determineWinners(hands);
    expect(winners).toContain('player1'); // J > 10 kicker
    expect(winners).not.toContain('player2');
  });

  it('devrait identifier une wheel straight (A-2-3-4-5)', () => {
    const cards = [
      { rank: 'A', suit: 'hearts' },
      { rank: '2', suit: 'clubs' },
      { rank: '3', suit: 'spades' },
      { rank: '4', suit: 'hearts' },
      { rank: '5', suit: 'diamonds' }
    ];
    
    const result = evaluateHandRobust(cards);
    expect(result.name).toBe('Straight');
    expect(result.rank).toBe(4);
  });

  it('devrait rejeter les mains invalides', () => {
    const invalidHand = [
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'hearts' } // Carte dupliquée
    ];
    
    expect(validateHand(invalidHand)).toBe(false);
  });
});

describe('🛡️ Validation des Actions - Tests de Sécurité', () => {
  let mockContext;
  
  beforeEach(() => {
    mockContext = {
      gameState: {
        phase: 'preflop',
        currentPlayerPosition: 0,
        currentBet: 100,
        pot: 150
      },
      player: {
        seatPosition: 0,
        chips: 1000,
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
        lastActionTime: null
      },
      table: {
        bigBlind: 50,
        smallBlind: 25
      }
    };
  });

  it('devrait rejeter une action quand ce n\'est pas le tour du joueur', () => {
    mockContext.gameState.currentPlayerPosition = 1; // Pas le tour du joueur
    mockContext.action = { action: 'call' };
    
    const result = validatePlayerAction(mockContext);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Not your turn');
  });

  it('devrait rejeter un raise insuffisant', () => {
    mockContext.action = { action: 'raise', amount: 10 }; // Trop petit
    
    const result = validatePlayerAction(mockContext);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Minimum raise');
  });

  it('devrait rejeter une action avec chips insuffisants', () => {
    mockContext.player.chips = 50;
    mockContext.action = { action: 'call' }; // Call 100 avec seulement 50 chips
    
    const result = validatePlayerAction(mockContext);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Insufficient chips');
  });

  it('devrait prévenir les actions trop rapides (anti-spam)', () => {
    mockContext.player.lastActionTime = Date.now() - 100; // 100ms ago
    mockContext.action = { action: 'fold' };
    
    const result = validatePlayerAction(mockContext);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too fast');
  });

  it('devrait sanitiser les montants correctement', () => {
    expect(sanitizeAmount(-100)).toBe(0);
    expect(sanitizeAmount(123.456)).toBe(123);
    expect(sanitizeAmount(null)).toBe(0);
    expect(sanitizeAmount(undefined)).toBe(0);
    expect(sanitizeAmount(2000000000)).toBe(1000000000); // Max cap
  });
});

describe('💰 Side Pots - Tests Complexes', () => {
  it('devrait calculer correctement les side pots avec multiple all-in', () => {
    const players = [
      { userId: 'player1', currentBet: 100, totalChipsInvested: 100, isAllIn: true, isFolded: false },
      { userId: 'player2', currentBet: 200, totalChipsInvested: 200, isAllIn: true, isFolded: false },
      { userId: 'player3', currentBet: 300, totalChipsInvested: 300, isAllIn: false, isFolded: false }
    ];
    
    const sidePots = calculateSidePotsEnhanced(players);
    
    expect(sidePots).toHaveLength(3);
    expect(sidePots[0].amount).toBe(300); // 100 x 3 joueurs
    expect(sidePots[0].eligiblePlayers).toHaveLength(3);
    expect(sidePots[1].amount).toBe(200); // 100 x 2 joueurs restants
    expect(sidePots[1].eligiblePlayers).toHaveLength(2);
    expect(sidePots[2].amount).toBe(100); // 100 x 1 joueur restant
    expect(sidePots[2].eligiblePlayers).toHaveLength(1);
  });

  it('devrait valider la cohérence des side pots', () => {
    const players = [
      { userId: 'player1', currentBet: 100, totalChipsInvested: 100, isAllIn: true, isFolded: false },
      { userId: 'player2', currentBet: 200, totalChipsInvested: 200, isAllIn: false, isFolded: false }
    ];
    
    const sidePots = calculateSidePotsEnhanced(players);
    const validation = validateSidePots(sidePots, players);
    
    expect(validation.isValid).toBe(true);
    expect(validation.totalAmount).toBe(300); // 100 + 200
    expect(validation.expectedAmount).toBe(300);
  });

  it('devrait détecter les erreurs de calcul des side pots', () => {
    const players = [
      { userId: 'player1', currentBet: 100, totalChipsInvested: 100, isAllIn: true, isFolded: false }
    ];
    
    const corruptedSidePots = [
      { amount: 50, eligiblePlayers: ['player1'], potId: 'test' } // Montant incorrect
    ];
    
    const validation = validateSidePots(corruptedSidePots, players);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('mismatch');
  });
});

describe('🎲 Blinds - Tests Heads-Up et Multi-Way', () => {
  it('devrait positionner correctement les blinds en heads-up', () => {
    const dealerPos = 2;
    const playerPositions = [2, 5];
    
    const { smallBlind, bigBlind } = getBlindPositions(dealerPos, playerPositions, 9);
    
    expect(smallBlind).toBe(2); // Dealer is SB in heads-up
    expect(bigBlind).toBe(5);   // Other player is BB
  });

  it('devrait positionner correctement les blinds en multi-way', () => {
    const dealerPos = 1;
    const playerPositions = [0, 1, 2, 4]; // 4 joueurs actifs
    
    const { smallBlind, bigBlind } = getBlindPositions(dealerPos, playerPositions, 9);
    
    // En multi-way: SB = dealer+1, BB = dealer+2 dans l'ordre des positions actives
    expect(smallBlind).toBe(2); // Position suivante après dealer
    expect(bigBlind).toBe(4);   // Position encore suivante
  });

  it('devrait rejeter les positions de dealer invalides', () => {
    const dealerPos = 3; // Pas dans playerPositions
    const playerPositions = [0, 1, 2];
    
    expect(() => {
      getBlindPositions(dealerPos, playerPositions, 9);
    }).toThrow('Invalid dealer position');
  });

  it('devrait rejeter les jeux avec moins de 2 joueurs', () => {
    const dealerPos = 0;
    const playerPositions = [0]; // 1 seul joueur
    
    expect(() => {
      getBlindPositions(dealerPos, playerPositions, 9);
    }).toThrow('Need at least 2 players');
  });
});

describe('⏱️ Rate Limiting - Tests Anti-Spam', () => {
  beforeEach(() => {
    // Reset rate limiter
    actionRateLimiter.cleanup();
  });

  it('devrait permettre la première action', () => {
    const canAct = actionRateLimiter.canPlayerAct('player1');
    expect(canAct).toBe(true);
  });

  it('devrait bloquer les actions trop rapides', () => {
    actionRateLimiter.canPlayerAct('player1');
    const canActAgain = actionRateLimiter.canPlayerAct('player1');
    expect(canActAgain).toBe(false);
  });

  it('devrait permettre les actions après l\'intervalle minimum', (done) => {
    actionRateLimiter.canPlayerAct('player1');
    
    setTimeout(() => {
      const canActAgain = actionRateLimiter.canPlayerAct('player1');
      expect(canActAgain).toBe(true);
      done();
    }, 350); // > 300ms minimum interval
  });
});

describe('🎯 État du Jeu - Tests d\'Intégrité', () => {
  it('devrait valider un état de jeu cohérent', () => {
    const gameState = {
      currentPlayerPosition: 0,
      phase: 'preflop',
      pot: 75,
      currentBet: 50
    };
    
    const players = [
      { seatPosition: 0, chips: 950, currentBet: 50, isFolded: false },
      { seatPosition: 1, chips: 975, currentBet: 25, isFolded: false }
    ];
    
    const validation = validateGameState(gameState, players);
    expect(validation.isValid).toBe(true);
  });

  it('devrait détecter les incohérences de pot', () => {
    const gameState = {
      currentPlayerPosition: 0,
      phase: 'preflop',
      pot: 1000, // Incohérent avec les mises actuelles
      currentBet: 50
    };
    
    const players = [
      { seatPosition: 0, chips: 950, currentBet: 50, isFolded: false }
    ];
    
    const validation = validateGameState(gameState, players);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('Pot calculation inconsistency');
  });
});

// Tests de performance
describe('🚀 Performance - Tests de Charge', () => {
  it('devrait évaluer 1000 mains en moins de 1 seconde', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      const randomCards = generateRandomHand(7);
      evaluateHandRobust(randomCards);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // Moins de 1 seconde
  });

  it('devrait calculer les side pots complexes rapidement', () => {
    const startTime = Date.now();
    
    // Simulation avec 9 joueurs, plusieurs all-in
    const players = Array.from({ length: 9 }, (_, i) => ({
      userId: `player${i}`,
      currentBet: (i + 1) * 100,
      totalChipsInvested: (i + 1) * 100,
      isAllIn: i < 6, // 6 joueurs all-in
      isFolded: false
    }));
    
    for (let i = 0; i < 100; i++) {
      calculateSidePotsEnhanced(players);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // Moins de 100ms pour 100 calculs
  });
});

// Utilitaires de test
function generateRandomHand(numCards) {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const cards = [];
  const used = new Set();
  
  while (cards.length < numCards) {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const cardKey = `${rank}_${suit}`;
    
    if (!used.has(cardKey)) {
      used.add(cardKey);
      cards.push({ rank, suit });
    }
  }
  
  return cards;
}