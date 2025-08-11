// Test d'intégration Short Deck avec notre handEvaluator
import pkg from 'pokersolver';
const { Hand } = pkg;

console.log('🃏 Test d\'intégration Short Deck avec handEvaluator\n');

// Simulation de nos fonctions handEvaluator pour Short Deck
function cardToPokerSolverFormat(card) {
  const suitMap = {
    'hearts': 'h',
    'diamonds': 'd',
    'clubs': 'c',
    'spades': 's'
  };

  let rank = card.rank;
  if (rank === '10') rank = 'T';

  return `${rank}${suitMap[card.suit]}`;
}

function pokerSolverToCard(cardStr) {
  const suitMap = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades'
  };

  const suitChar = cardStr.slice(-1);
  let rank = cardStr.slice(0, -1);

  if (rank === 'T') rank = '10';

  return {
    rank,
    suit: suitMap[suitChar]
  };
}

function evaluateShortDeckHand(cards) {
  try {
    const cardStrings = cards.map(cardToPokerSolverFormat);
    const solvedHand = Hand.solve(cardStrings, 'shortdeck');
    
    const handCards = solvedHand.cards.map(card => pokerSolverToCard(card.toString()));
    
    return {
      rank: solvedHand.rank,
      name: solvedHand.name,
      cards: handCards,
      description: solvedHand.descr,
      rawRank: solvedHand.rank,
      kickers: [],
      score: 0
    };
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
}

function createShortDeck() {
  const deck = [];
  const shortDeckRanks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

  for (const suit of suits) {
    for (const rank of shortDeckRanks) {
      deck.push({ rank, suit });
    }
  }

  return deck;
}

// Test 1: Évaluation de mains Short Deck
console.log('=== Test 1: Évaluation de mains Short Deck ===');

const shortDeckHands = [
  [
    { rank: '6', suit: 'hearts' },
    { rank: '7', suit: 'hearts' },
    { rank: '8', suit: 'hearts' },
    { rank: '9', suit: 'hearts' },
    { rank: '10', suit: 'hearts' }
  ],
  [
    { rank: 'A', suit: 'diamonds' },
    { rank: 'K', suit: 'diamonds' },
    { rank: 'Q', suit: 'diamonds' },
    { rank: 'J', suit: 'diamonds' },
    { rank: '10', suit: 'diamonds' }
  ],
  [
    { rank: 'A', suit: 'clubs' },
    { rank: 'A', suit: 'spades' },
    { rank: 'K', suit: 'hearts' },
    { rank: 'K', suit: 'diamonds' },
    { rank: 'Q', suit: 'clubs' }
  ]
];

shortDeckHands.forEach((hand, index) => {
  const evaluation = evaluateShortDeckHand(hand);
  if (evaluation) {
    console.log(`Main ${index + 1}: ${hand.map(c => `${c.rank}${c.suit[0]}`).join(' ')}`);
    console.log(`  Type: ${evaluation.name}`);
    console.log(`  Description: ${evaluation.description}`);
    console.log(`  Rang: ${evaluation.rank}`);
    console.log('');
  }
});

// Test 2: Création et validation du deck Short Deck
console.log('=== Test 2: Création du deck Short Deck ===');
const shortDeck = createShortDeck();
console.log(`Nombre de cartes: ${shortDeck.length}`);
console.log(`Premières cartes: ${shortDeck.slice(0, 5).map(c => `${c.rank}${c.suit[0]}`).join(', ')}`);
console.log(`Dernières cartes: ${shortDeck.slice(-5).map(c => `${c.rank}${c.suit[0]}`).join(', ')}`);
console.log('');

// Test 3: Comparaison de mains Short Deck
console.log('=== Test 3: Comparaison de mains Short Deck ===');
const hand1 = evaluateShortDeckHand(shortDeckHands[0]);
const hand2 = evaluateShortDeckHand(shortDeckHands[1]);

if (hand1 && hand2) {
  console.log(`Main 1: ${hand1.name} (rang ${hand1.rank})`);
  console.log(`Main 2: ${hand2.name} (rang ${hand2.rank})`);
  
  if (hand1.rank > hand2.rank) {
    console.log('Gagnant: Main 1');
  } else if (hand2.rank > hand1.rank) {
    console.log('Gagnant: Main 2');
  } else {
    console.log('Égalité');
  }
}
console.log('');

// Test 4: Validation des cartes invalides
console.log('=== Test 4: Validation des cartes invalides ===');
const invalidHand = [
  { rank: '2', suit: 'hearts' },
  { rank: '3', suit: 'diamonds' },
  { rank: '4', suit: 'clubs' },
  { rank: '5', suit: 'spades' },
  { rank: '6', suit: 'hearts' }
];

const invalidEvaluation = evaluateShortDeckHand(invalidHand);
if (invalidEvaluation) {
  console.log(`Main invalide évaluée: ${invalidEvaluation.name}`);
} else {
  console.log('Main invalide rejetée correctement');
}
console.log('');

// Test 5: Probabilités et statistiques
console.log('=== Test 5: Statistiques Short Deck ===');
console.log('Caractéristiques du Short Deck (6+ Hold\'em):');
console.log('- 36 cartes au lieu de 52');
console.log('- Rangs: 6, 7, 8, 9, 10, J, Q, K, A');
console.log('- Pas de straight flush possible (pas de 2-5)');
console.log('- Flushes plus fréquentes');
console.log('- Paires et brelans plus fréquents');
console.log('- Action plus rapide due aux mains plus fortes');
console.log('');

console.log('✅ Tests d\'intégration Short Deck terminés !');
