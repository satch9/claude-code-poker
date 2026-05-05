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

describe('🃏 Régression 1.B — Tests TDD pour fix handEvaluator/determineWinners', () => {
  // Helper: une "main" en Texas Hold'em est 7 cartes (2 hole + 5 community).
  // evaluateHandRobust prend ces 7 cartes et retourne la meilleure main de 5.
  const heart = (r) => ({ rank: r, suit: 'hearts' });
  const diamond = (r) => ({ rank: r, suit: 'diamonds' });
  const club = (r) => ({ rank: r, suit: 'clubs' });
  const spade = (r) => ({ rank: r, suit: 'spades' });

  it('1. Royal Flush A♠K♠Q♠J♠T♠ → name=Royal Flush, rank=9', () => {
    const cards = [spade('A'), spade('K'), spade('Q'), spade('J'), spade('10')];
    const r = evaluateHandRobust(cards);
    expect(r.name).toBe('Royal Flush');
    expect(r.rank).toBe(9);
  });

  it('2. Wheel straight A-2-3-4-5 → name=Straight, rank=4', () => {
    const cards = [heart('A'), club('2'), spade('3'), heart('4'), diamond('5')];
    const r = evaluateHandRobust(cards);
    expect(r.name).toBe('Straight');
    expect(r.rank).toBe(4);
  });

  it('3. Reproduction B-runtime.5 — Eliott (A♠ 6) bat Satch9 (4 Q) sur board A 9 10 Q 10', () => {
    const board = [spade('A'), heart('9'), diamond('10'), club('Q'), spade('10')];
    const eliott = [...board, spade('A'), diamond('6')];
    const satch = [...board, heart('4'), heart('Q')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(eliott), playerId: 'eliott' },
      { hand: evaluateHandRobust(satch), playerId: 'satch9' },
    ]);
    expect(winners).toEqual(['eliott']);
  });

  it('4. Two pair AA-1010 (kicker Q) bat QQ-1010 (kicker A)', () => {
    const eliott = [spade('A'), heart('A'), club('10'), diamond('10'), spade('Q')];
    const satch = [club('Q'), heart('Q'), club('10'), diamond('10'), heart('A')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(eliott), playerId: 'eliott' },
      { hand: evaluateHandRobust(satch), playerId: 'satch9' },
    ]);
    expect(winners).toEqual(['eliott']);
  });

  it('5. One pair AA + KQJ bat AA + KQ9', () => {
    const a = [spade('A'), heart('A'), club('K'), diamond('Q'), spade('J')];
    const b = [diamond('A'), club('A'), heart('K'), spade('Q'), heart('9')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });

  it('6. Flush bat Straight', () => {
    const flush = [heart('K'), heart('9'), heart('7'), heart('5'), heart('3')];
    const straight = [club('9'), diamond('10'), spade('J'), heart('Q'), club('K')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(flush), playerId: 'flush' },
      { hand: evaluateHandRobust(straight), playerId: 'straight' },
    ]);
    expect(winners).toEqual(['flush']);
  });

  it('7. Full house Ks over 3s bat Js over 5s', () => {
    const a = [spade('K'), heart('K'), club('K'), diamond('3'), spade('3')];
    const b = [spade('J'), heart('J'), club('J'), diamond('5'), heart('5')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });

  it('8. Vrai split — 2 mains identiques sur board complet', () => {
    const board = [spade('A'), heart('A'), club('A'), diamond('A'), spade('K')];
    const a = [...board, club('2'), heart('3')];
    const b = [...board, diamond('4'), spade('5')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners.sort()).toEqual(['a', 'b']);
  });

  it('9. Trips A bat Trips K (mêmes kickers QJ)', () => {
    const a = [spade('A'), heart('A'), club('A'), diamond('Q'), spade('J')];
    const b = [spade('K'), heart('K'), club('K'), diamond('Q'), heart('J')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });

  it('10. High card AKQJ9 bat AKQJ8 (last kicker tranche)', () => {
    const a = [spade('A'), heart('K'), club('Q'), diamond('J'), spade('9')];
    const b = [diamond('A'), club('K'), heart('Q'), spade('J'), heart('8')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
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
