// Poker utility functions

export interface Card {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

export interface HandRank {
  rank: number;
  name: string;
  cards: Card[];
}

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

// Get rank value for comparison
export function getRankValue(rank: string): number {
  return RANKS.indexOf(rank);
}

// Check if hand is a flush
export function isFlush(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const suit = cards[0].suit;
  return cards.every(card => card.suit === suit);
}

// Check if hand is a straight
export function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  
  const values = cards.map(card => getRankValue(card.rank)).sort((a, b) => a - b);
  
  // Check for regular straight
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      return false;
    }
  }
  
  // Check for wheel (A-2-3-4-5)
  if (values.join(',') === '0,1,2,3,12') {
    return true;
  }
  
  return true;
}

// Basic hand evaluation (simplified)
export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length < 5) {
    return { rank: 0, name: 'High Card', cards: cards.slice(0, 5) };
  }
  
  // Sort cards by rank value (highest first)
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  
  // Count ranks
  const rankCounts: { [key: string]: number } = {};
  cards.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const pairs = counts.filter(count => count >= 2);
  
  const flush = isFlush(sortedCards.slice(0, 5));
  const straight = isStraight(sortedCards.slice(0, 5));
  
  // Royal flush
  if (flush && straight && sortedCards[0].rank === 'A' && sortedCards[1].rank === 'K') {
    return { rank: 9, name: 'Royal Flush', cards: sortedCards.slice(0, 5) };
  }
  
  // Straight flush
  if (flush && straight) {
    return { rank: 8, name: 'Straight Flush', cards: sortedCards.slice(0, 5) };
  }
  
  // Four of a kind
  if (counts[0] === 4) {
    return { rank: 7, name: 'Four of a Kind', cards: sortedCards.slice(0, 5) };
  }
  
  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 6, name: 'Full House', cards: sortedCards.slice(0, 5) };
  }
  
  // Flush
  if (flush) {
    return { rank: 5, name: 'Flush', cards: sortedCards.slice(0, 5) };
  }
  
  // Straight
  if (straight) {
    return { rank: 4, name: 'Straight', cards: sortedCards.slice(0, 5) };
  }
  
  // Three of a kind
  if (counts[0] === 3) {
    return { rank: 3, name: 'Three of a Kind', cards: sortedCards.slice(0, 5) };
  }
  
  // Two pair
  if (pairs.length >= 2) {
    return { rank: 2, name: 'Two Pair', cards: sortedCards.slice(0, 5) };
  }
  
  // One pair
  if (pairs.length === 1) {
    return { rank: 1, name: 'One Pair', cards: sortedCards.slice(0, 5) };
  }
  
  // High card
  return { rank: 0, name: 'High Card', cards: sortedCards.slice(0, 5) };
}

// Calculate side pots
export function calculateSidePots(players: { chips: number, currentBet: number, isAllIn: boolean, userId: string }[]): Array<{ amount: number, eligiblePlayers: string[] }> {
  const sidePots: Array<{ amount: number, eligiblePlayers: string[] }> = [];
  
  // Get all unique bet amounts (including all-in amounts)
  const allBetAmounts = players.map(p => p.currentBet).filter(bet => bet > 0);
  const uniqueBetAmounts = [...new Set(allBetAmounts)].sort((a, b) => a - b);
  
  let previousAmount = 0;
  
  for (const betAmount of uniqueBetAmounts) {
    const potAmount = betAmount - previousAmount;
    const eligiblePlayers = players
      .filter(p => p.currentBet >= betAmount)
      .map(p => p.userId);
    
    if (potAmount > 0 && eligiblePlayers.length > 0) {
      sidePots.push({
        amount: potAmount * eligiblePlayers.length,
        eligiblePlayers
      });
    }
    
    previousAmount = betAmount;
  }
  
  return sidePots;
}

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

// Get blind positions
export function getBlindPositions(dealerPosition: number, playerCount: number, maxPlayers: number): { smallBlind: number, bigBlind: number } {
  if (playerCount === 2) {
    // Heads-up: dealer is small blind
    return {
      smallBlind: dealerPosition,
      bigBlind: (dealerPosition + 1) % maxPlayers
    };
  } else {
    // Multi-way: small blind is next to dealer
    return {
      smallBlind: (dealerPosition + 1) % maxPlayers,
      bigBlind: (dealerPosition + 2) % maxPlayers
    };
  }
}