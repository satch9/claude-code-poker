// Tests critiques d'intégrité du moteur de poker
import { describe, it, expect } from 'vitest';

// Import des utilitaires de test
import {
  evaluateHandRobust,
  determineWinners,
  validateHand
} from '../convex/utils/handEvaluator';

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
