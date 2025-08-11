// Évaluateur de mains robuste avec pokersolver
import { Hand } from 'pokersolver';
import { Card } from './poker';

export interface EnhancedHandRank {
  rank: number;
  name: string;
  cards: Card[];
  description: string;
  rawRank: number; // Pour comparaisons précises
  kickers: Card[]; // Cartes de départage
  score: number; // Score numérique pour comparaisons
}

/**
 * Convertit une carte du format interne vers pokersolver
 */
export function cardToPokerSolverFormat(card: Card): string {
  const suitMap = {
    'hearts': 'h',
    'diamonds': 'd',
    'clubs': 'c',
    'spades': 's'
  };

  let rank = card.rank;
  // Conversion des rangs spéciaux
  if (rank === '10') rank = 'T';

  return `${rank}${suitMap[card.suit]}`;
}

/**
 * Convertit de pokersolver vers notre format
 */
export function pokerSolverToCard(cardStr: string): Card {
  const suitMap = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades'
  } as const;

  const suitChar = cardStr.slice(-1) as keyof typeof suitMap;
  let rank = cardStr.slice(0, -1);

  // Conversion des rangs spéciaux
  if (rank === 'T') rank = '10';

  return {
    rank,
    suit: suitMap[suitChar]
  };
}

/**
 * Obtient la valeur numérique d'un rang pour comparaison (corrigée)
 */
function getRankValue(rank: string): number {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  return ranks.indexOf(rank) + 2; // '2' = 2, 'A' = 14
}

/**
 * Calcule un score numérique pour une main (pour comparaisons précises)
 */
function calculateHandScore(cards: Card[]): number {
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  let score = 0;

  for (let i = 0; i < sortedCards.length; i++) {
    score += getRankValue(sortedCards[i].rank) * Math.pow(100, sortedCards.length - 1 - i);
  }

  return score;
}

/**
 * Évalue une main avec pokersolver pour une précision maximale
 */
export function evaluateHandRobust(cards: Card[]): EnhancedHandRank {
  return evaluateHandWithGame(cards, 'standard');
}

/**
 * Évalue une main Short Deck (6+ Hold'em) avec pokersolver
 */
export function evaluateShortDeckHand(cards: Card[]): EnhancedHandRank {
  return evaluateHandWithGame(cards, 'shortdeck');
}

/**
 * Évalue une main avec un type de jeu spécifique
 */
function evaluateHandWithGame(cards: Card[], game: 'standard' | 'shortdeck' = 'standard'): EnhancedHandRank {
  if (!cards || cards.length === 0) {
    throw new Error('Aucune carte fournie pour l\'évaluation');
  }

  if (cards.length < 5) {
    // Fallback pour mains incomplètes
    const sortedCards = cards.slice().sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    return {
      rank: 0,
      name: 'High Card',
      cards: sortedCards,
      description: 'Main incomplète',
      rawRank: 0,
      kickers: [],
      score: calculateHandScore(sortedCards)
    };
  }

  try {
    // Valider les cartes
    if (!validateHand(cards)) {
      throw new Error('Main invalide : cartes en double détectées');
    }

    // Convertir les cartes au format pokersolver
    const cardStrings = cards.map(cardToPokerSolverFormat);
    const handString = cardStrings.join(' ');

    // Évaluer avec pokersolver
    const solvedHand = Hand.solve(cardStrings, game);

    // Conversion des cartes de la main gagnante
    const handCards = solvedHand.cards.map((card: any) => pokerSolverToCard(card.toString()));

    // Déterminer les kickers (cartes non utilisées dans la main)
    const usedCards = new Set(handCards.map(c => `${c.rank}${c.suit}`));
    const kickers = cards
      .filter(c => !usedCards.has(`${c.rank}${c.suit}`))
      .sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));

    const score = calculateHandScore(handCards);

    return {
      rank: solvedHand.rank,
      name: solvedHand.name,
      cards: handCards,
      description: solvedHand.descr,
      rawRank: solvedHand.rank,
      kickers: kickers,
      score: score
    };

  } catch (error) {
    console.error('Erreur lors de l\'évaluation avec pokersolver:', error);
    console.error('Cartes:', cards);

    // Fallback vers l'ancienne méthode en cas d'erreur
    return evaluateHandFallback(cards);
  }
}

/**
 * Détermine les gagnants entre plusieurs mains
 */
export function determineWinners(hands: { hand: EnhancedHandRank, playerId: string }[]): string[] {
  return determineWinnersWithGame(hands, 'standard');
}

/**
 * Détermine les gagnants entre plusieurs mains Short Deck
 */
export function determineShortDeckWinners(hands: { hand: EnhancedHandRank, playerId: string }[]): string[] {
  return determineWinnersWithGame(hands, 'shortdeck');
}

/**
 * Détermine les gagnants entre plusieurs mains avec un type de jeu spécifique
 */
function determineWinnersWithGame(hands: { hand: EnhancedHandRank, playerId: string }[], game: 'standard' | 'shortdeck' = 'standard'): string[] {
  if (hands.length === 0) return [];
  if (hands.length === 1) return [hands[0].playerId];

  try {
    // Recréer les mains pokersolver pour comparaison
    const solvedHands = hands.map(({ hand, playerId }) => {
      const cardStrings = hand.cards.map(cardToPokerSolverFormat);
      const solvedHand = Hand.solve(cardStrings, game);
      return { solved: solvedHand, playerId, originalHand: hand };
    });

    // Utiliser pokersolver pour déterminer les gagnants
    const winners = Hand.winners(solvedHands.map(h => h.solved));

    // Retourner les IDs des joueurs gagnants
    return solvedHands
      .filter(h => winners.includes(h.solved))
      .map(h => h.playerId);

  } catch (error) {
    console.error('Erreur lors de la détermination des gagnants:', error);

    // Fallback : comparer par rang et kickers
    return determineWinnersFallback(hands);
  }
}

/**
 * Méthode de fallback améliorée pour l'évaluation des mains
 */
function evaluateHandFallback(cards: Card[]): EnhancedHandRank {
  return evaluateHandFallbackWithGame(cards, 'standard');
}

/**
 * Méthode de fallback pour Short Deck
 */
function evaluateShortDeckFallback(cards: Card[]): EnhancedHandRank {
  return evaluateHandFallbackWithGame(cards, 'shortdeck');
}

/**
 * Méthode de fallback avec type de jeu spécifique
 */
function evaluateHandFallbackWithGame(cards: Card[], game: 'standard' | 'shortdeck'): EnhancedHandRank {
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));

  // Logique simplifiée pour déterminer le type de main
  const rankCounts = new Map<string, number>();
  const suitCounts = new Map<string, number>();

  cards.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  });

  let rank = 0;
  let name = 'High Card';
  let description = 'Carte haute';

  // Détecter les combinaisons
  const maxRankCount = Math.max(...rankCounts.values());
  const maxSuitCount = Math.max(...suitCounts.values());
  const uniqueRanks = rankCounts.size;

  // Short Deck: les rangs sont différents (pas de 2-5)
  const isShortDeck = game === 'shortdeck';

  if (maxRankCount === 4) {
    rank = 7;
    name = 'Four of a Kind';
    description = 'Carré';
  } else if (maxRankCount === 3 && uniqueRanks === 2) {
    rank = 6;
    name = 'Full House';
    description = 'Full';
  } else if (maxSuitCount >= 5) {
    rank = 5;
    name = 'Flush';
    description = 'Couleur';
  } else if (maxRankCount === 3) {
    rank = 3;
    name = 'Three of a Kind';
    description = 'Brelan';
  } else if (maxRankCount === 2 && uniqueRanks === 3) {
    rank = 2;
    name = 'Two Pair';
    description = 'Deux paires';
  } else if (maxRankCount === 2) {
    rank = 1;
    name = 'One Pair';
    description = 'Paire';
  }

  return {
    rank,
    name,
    cards: sortedCards.slice(0, 5),
    description,
    rawRank: rank,
    kickers: sortedCards.slice(5),
    score: calculateHandScore(sortedCards.slice(0, 5))
  };
}

/**
 * Méthode de fallback améliorée pour déterminer les gagnants
 */
function determineWinnersFallback(hands: { hand: EnhancedHandRank, playerId: string }[]): string[] {
  // Trier par rang décroissant puis par score
  hands.sort((a, b) => {
    if (b.hand.rank !== a.hand.rank) {
      return b.hand.rank - a.hand.rank;
    }
    return b.hand.score - a.hand.score;
  });

  const bestRank = hands[0].hand.rank;
  const bestScore = hands[0].hand.score;

  // Trouver tous les joueurs avec le même rang et score
  const winners = hands.filter(h =>
    h.hand.rank === bestRank && h.hand.score === bestScore
  );

  return winners.map(w => w.playerId);
}

/**
 * Valide qu'une main de cartes est légale
 */
export function validateHand(cards: Card[]): boolean {
  if (!cards || cards.length === 0) return false;
  if (cards.length > 7) return false;

  // Vérifier les doublons
  const cardStrings = cards.map(cardToPokerSolverFormat);
  const uniqueCards = new Set(cardStrings);

  return uniqueCards.size === cardStrings.length;
}

/**
 * Obtient le classement détaillé d'une main
 */
export function getHandRanking(cards: Card[]): {
  rank: number;
  name: string;
  strength: number; // Force relative (0-1)
  score: number;
} {
  return getHandRankingWithGame(cards, 'standard');
}

/**
 * Obtient le classement détaillé d'une main Short Deck
 */
export function getShortDeckHandRanking(cards: Card[]): {
  rank: number;
  name: string;
  strength: number; // Force relative (0-1)
  score: number;
} {
  return getHandRankingWithGame(cards, 'shortdeck');
}

/**
 * Obtient le classement détaillé d'une main avec type de jeu spécifique
 */
function getHandRankingWithGame(cards: Card[], game: 'standard' | 'shortdeck'): {
  rank: number;
  name: string;
  strength: number; // Force relative (0-1)
  score: number;
} {
  const evaluation = game === 'shortdeck'
    ? evaluateShortDeckHand(cards)
    : evaluateHandRobust(cards);

  // Calculer la force relative (approximation)
  const maxRank = game === 'shortdeck' ? 8 : 9; // Short Deck: pas de straight flush
  const strength = evaluation.rank / maxRank;

  return {
    rank: evaluation.rank,
    name: evaluation.name,
    strength,
    score: evaluation.score
  };
}

/**
 * Traduit le nom d'une main de poker en français
 */
export function translateHandName(englishName: string): string {
  const translations: { [key: string]: string } = {
    'Royal Flush': 'Quinte Flush Royale',
    'Straight Flush': 'Quinte Flush',
    'Four of a Kind': 'Carré',
    'Full House': 'Full',
    'Flush': 'Couleur',
    'Straight': 'Quinte',
    'Three of a Kind': 'Brelan',
    'Two Pair': 'Deux Paires',
    'One Pair': 'Paire',
    'High Card': 'Carte Haute'
  };

  return translations[englishName] || englishName;
}

/**
 * Obtient une description détaillée de la main en français
 */
export function getHandDescription(hand: EnhancedHandRank): string {
  const frenchName = translateHandName(hand.name);

  switch (hand.name) {
    case 'Full House':
      // Pour un full, on veut "Full [brelan] par [paire]"
      const threeRank = hand.cards[0].rank;
      const pairRank = hand.cards[3].rank;
      return `Full ${threeRank} par ${pairRank}`;

    case 'Four of a Kind':
      // Pour un carré, on veut "Carré de [rang]"
      const fourRank = hand.cards[0].rank;
      return `Carré de ${fourRank}`;

    case 'Three of a Kind':
      // Pour un brelan, on veut "Brelan de [rang]"
      const threeRank2 = hand.cards[0].rank;
      return `Brelan de ${threeRank2}`;

    case 'Two Pair':
      // Pour deux paires, on veut "Deux paires [haute] et [basse]"
      const highPair = hand.cards[0].rank;
      const lowPair = hand.cards[2].rank;
      return `Deux paires ${highPair} et ${lowPair}`;

    case 'One Pair':
      // Pour une paire, on veut "Paire de [rang]"
      const pairRank2 = hand.cards[0].rank;
      return `Paire de ${pairRank2}`;

    case 'High Card':
      // Pour carte haute, on veut "Carte haute [rang]"
      const highCard = hand.cards[0].rank;
      return `Carte haute ${highCard}`;

    case 'Flush':
      // Pour une couleur, on veut "Couleur [suit]"
      const flushSuit = hand.cards[0].suit;
      const suitNames = {
        'hearts': 'Cœur',
        'diamonds': 'Carreau',
        'clubs': 'Trèfle',
        'spades': 'Pique'
      };
      return `Couleur ${suitNames[flushSuit]}`;

    case 'Straight':
      // Pour une quinte, on veut "Quinte [haute] à [basse]"
      const highRank = hand.cards[0].rank;
      const lowRank = hand.cards[4].rank;
      return `Quinte ${highRank} à ${lowRank}`;

    default:
      return frenchName;
  }
}

/**
 * Compare deux mains et retourne le résultat
 */
export function compareHands(hand1: EnhancedHandRank, hand2: EnhancedHandRank): number {
  return compareHandsWithGame(hand1, hand2, 'standard');
}

/**
 * Compare deux mains Short Deck et retourne le résultat
 */
export function compareShortDeckHands(hand1: EnhancedHandRank, hand2: EnhancedHandRank): number {
  return compareHandsWithGame(hand1, hand2, 'shortdeck');
}

/**
 * Compare deux mains avec type de jeu spécifique
 */
function compareHandsWithGame(hand1: EnhancedHandRank, hand2: EnhancedHandRank, game: 'standard' | 'shortdeck'): number {
  if (hand1.rank !== hand2.rank) {
    return hand2.rank - hand1.rank; // Rang plus élevé gagne
  }

  // Même rang, comparer par score
  return hand2.score - hand1.score;
}

/**
 * Obtient les cartes communes (flop, turn, river) pour une main
 */
export function getCommunityCards(playerCards: Card[], allCards: Card[]): Card[] {
  const playerCardStrings = playerCards.map(c => `${c.rank}${c.suit}`);
  return allCards.filter(card =>
    !playerCardStrings.includes(`${card.rank}${card.suit}`)
  );
}

/**
 * Crée un deck Short Deck (6+ Hold'em) - cartes 6 à As
 */
export function createShortDeck(): Card[] {
  const deck: Card[] = [];
  const shortDeckRanks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

  for (const suit of suits) {
    for (const rank of shortDeckRanks) {
      deck.push({ rank, suit });
    }
  }

  return deck;
}

/**
 * Valide qu'une main Short Deck est légale
 */
export function validateShortDeckHand(cards: Card[]): boolean {
  if (!cards || cards.length === 0) return false;
  if (cards.length > 7) return false;

  // Vérifier que toutes les cartes sont des cartes Short Deck (6-A)
  const shortDeckRanks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const validCards = cards.every(card => shortDeckRanks.includes(card.rank));

  if (!validCards) return false;

  // Vérifier les doublons
  const cardStrings = cards.map(cardToPokerSolverFormat);
  const uniqueCards = new Set(cardStrings);

  return uniqueCards.size === cardStrings.length;
}

/**
 * Obtient la valeur numérique d'un rang pour Short Deck
 */
export function getShortDeckRankValue(rank: string): number {
  const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  return ranks.indexOf(rank) + 6; // '6' = 6, 'A' = 14
}