// Poker utility functions
import { evaluateHandRobust, EnhancedHandRank, compareHands } from './handEvaluator';

export interface Card {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

// Utiliser EnhancedHandRank au lieu de HandRank
export type HandRank = EnhancedHandRank;

// Card ranks in order (2 is lowest, A is highest)
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

// Create a new deck
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }

  return deck;
}

// Shuffle a deck
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Deal cards to players
export function dealCards(deck: Card[], numCards: number): { dealtCards: Card[], remainingDeck: Card[] } {
  const dealtCards = deck.slice(0, numCards);
  const remainingDeck = deck.slice(numCards);

  return { dealtCards, remainingDeck };
}

// Convert card to string format
export function cardToString(card: Card): string {
  const suitSymbols = {
    hearts: 'h',
    diamonds: 'd',
    clubs: 'c',
    spades: 's'
  };

  return `${card.rank}${suitSymbols[card.suit]}`;
}

// Convert string to card
export function stringToCard(cardStr: string): Card {
  const suitSymbols = {
    h: 'hearts',
    d: 'diamonds',
    c: 'clubs',
    s: 'spades'
  } as const;

  const suit = suitSymbols[cardStr.slice(-1) as keyof typeof suitSymbols];
  const rank = cardStr.slice(0, -1);

  return { rank, suit };
}

// Get rank value for comparison (utilise la version corrigée de handEvaluator)
export function getRankValue(rank: string): number {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  return ranks.indexOf(rank) + 2; // '2' = 2, 'A' = 14
}

// Évaluation de main utilisant handEvaluator
export function evaluateHand(cards: Card[]): HandRank {
  return evaluateHandRobust(cards);
}

// Compare hands using handEvaluator
export function compareHandsWithKickers(handA: HandRank, handB: HandRank): number {
  return compareHands(handA, handB);
}

// Side pot calculation moved to turnManager.ts to avoid duplication

// Get next player position
export function getNextPlayerPosition(currentPosition: number, players: { seatPosition: number, isFolded: boolean, isAllIn: boolean }[], maxPlayers: number): number {
  const activePlayers = players.filter(p => !p.isFolded);

  if (activePlayers.length <= 1) {
    return -1; // Game over
  }

  let nextPosition = (currentPosition + 1) % maxPlayers;
  let attempts = 0;

  while (attempts < maxPlayers) {
    const player = players.find(p => p.seatPosition === nextPosition);

    if (player && !player.isFolded && !player.isAllIn) {
      return nextPosition;
    }

    nextPosition = (nextPosition + 1) % maxPlayers;
    attempts++;
  }

  return -1; // No active players found
}

// Check if betting round is complete
export function isBettingRoundComplete(players: { currentBet: number, hasActed: boolean, isFolded: boolean, isAllIn: boolean }[], currentBet: number): boolean {
  const activePlayers = players.filter(p => !p.isFolded);

  if (activePlayers.length <= 1) {
    return true;
  }

  // All active players must have acted and have matching bets (or be all-in)
  return activePlayers.every(p =>
    p.hasActed && (p.currentBet === currentBet || p.isAllIn)
  );
}

// Calculate minimum raise amount
export function calculateMinRaise(currentBet: number, bigBlind: number, lastRaiseAmount?: number): number {
  if (currentBet === 0) {
    return bigBlind;
  }

  return currentBet + (lastRaiseAmount || bigBlind);
}

// Get blind positions - ROBUSTE pour tous les cas
export function getBlindPositions(
  dealerPosition: number,
  playerPositions: number[],
  maxPlayers: number
): { smallBlind: number, bigBlind: number } {

  if (playerPositions.length < 2) {
    throw new Error("Need at least 2 players for blinds");
  }

  // Vérifier que le dealer est dans la liste des joueurs actifs
  if (!playerPositions.includes(dealerPosition)) {
    throw new Error(`Invalid dealer position ${dealerPosition} for active players ${playerPositions}`);
  }

  if (playerPositions.length === 2) {
    // HEADS-UP: Dealer est Small Blind, l'autre joueur est Big Blind
    const nonDealerPos = playerPositions.find(pos => pos !== dealerPosition);
    if (nonDealerPos === undefined) {
      throw new Error("Cannot find non-dealer position in heads-up");
    }

    return {
      smallBlind: dealerPosition,    // Dealer is SB in heads-up
      bigBlind: nonDealerPos         // Non-dealer is BB
    };
  }

  // MULTI-WAY: Small blind est le joueur actif suivant le dealer
  const dealerIndex = playerPositions.indexOf(dealerPosition);
  const sbIndex = (dealerIndex + 1) % playerPositions.length;
  const bbIndex = (dealerIndex + 2) % playerPositions.length;

  return {
    smallBlind: playerPositions[sbIndex],
    bigBlind: playerPositions[bbIndex]
  };
}