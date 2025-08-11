// Test de comparaison des full houses
console.log("🧪 TEST DE COMPARAISON DES FULL HOUSES");
console.log("=".repeat(50));

// Reproduction de la logique d'évaluation
function getRankValue(rank) {
  const values = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return values[rank] || 0;
}

function evaluateHand(cards) {
  // Count ranks
  const rankCounts = {};
  cards.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    const threeRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
    const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
    const threeCards = cards.filter(card => card.rank === threeRank);
    const pairCards = cards.filter(card => card.rank === pairRank);
    const bestCards = [...threeCards, ...pairCards.slice(0, 2)];
    return { 
      rank: 6, 
      name: 'Full House', 
      cards: bestCards,
      threeRank: threeRank,
      pairRank: pairRank
    };
  }
  
  return { rank: 0, name: 'Unknown', cards: cards };
}

function compareHandsWithKickers(handA, handB) {
  // Special handling for full house
  if (handA.name === 'Full House' && handB.name === 'Full House') {
    // Compare three of a kind first
    const threeComparison = getRankValue(handB.threeRank) - getRankValue(handA.threeRank);
    console.log(`   DEBUG: threeComparison = ${threeComparison}`);
    if (threeComparison !== 0) {
      console.log(`   DEBUG: Returning threeComparison = ${threeComparison}`);
      return threeComparison;
    }
    
    // If three of a kind is equal, compare pair
    const pairComparison = getRankValue(handB.pairRank) - getRankValue(handA.pairRank);
    console.log(`   DEBUG: pairComparison = ${pairComparison}`);
    console.log(`   DEBUG: Returning pairComparison = ${pairComparison}`);
    return pairComparison;
  }
  
  // For other hands, compare the cards in order
  for (let i = 0; i < Math.min(handA.cards.length, handB.cards.length); i++) {
    const valueA = getRankValue(handA.cards[i].rank);
    const valueB = getRankValue(handB.cards[i].rank);
    
    if (valueA !== valueB) {
      return valueB - valueA; // Higher value wins
    }
  }
  
  // If all cards are equal, it's a tie
  return 0;
}

// Test case: Full House 8 par les valets vs Full House valet par les 8
console.log("\n🎯 TEST: Full House 8 par les valets vs Full House valet par les 8");

// Main 1: Full House 8 par les valets (888JJ)
const hand1 = [
  { rank: '8', suit: 'hearts' },
  { rank: '8', suit: 'diamonds' },
  { rank: '8', suit: 'clubs' },
  { rank: 'J', suit: 'spades' },
  { rank: 'J', suit: 'hearts' }
];

// Main 2: Full House valet par les 8 (JJJ88)
const hand2 = [
  { rank: 'J', rank: 'J', suit: 'diamonds' },
  { rank: 'J', suit: 'clubs' },
  { rank: '8', suit: 'spades' },
  { rank: '8', suit: 'hearts' }
];

// Correction: hand2 doit avoir 5 cartes
const hand2Corrected = [
  { rank: 'J', suit: 'spades' },
  { rank: 'J', suit: 'diamonds' },
  { rank: 'J', suit: 'clubs' },
  { rank: '8', suit: 'hearts' },
  { rank: '8', suit: 'diamonds' }
];

const evaluation1 = evaluateHand(hand1);
const evaluation2 = evaluateHand(hand2Corrected);

console.log(`\nMain 1 (bea1978): ${evaluation1.name}`);
console.log(`   Cartes: ${hand1.map(c => c.rank).join('')}`);
console.log(`   Brelan: ${evaluation1.threeRank} (valeur: ${getRankValue(evaluation1.threeRank)})`);
console.log(`   Paire: ${evaluation1.pairRank} (valeur: ${getRankValue(evaluation1.pairRank)})`);

console.log(`\nMain 2 (viny1976): ${evaluation2.name}`);
console.log(`   Cartes: ${hand2Corrected.map(c => c.rank).join('')}`);
console.log(`   Brelan: ${evaluation2.threeRank} (valeur: ${getRankValue(evaluation2.threeRank)})`);
console.log(`   Paire: ${evaluation2.pairRank} (valeur: ${getRankValue(evaluation2.pairRank)})`);

// Comparaison
const comparison = compareHandsWithKickers(evaluation1, evaluation2);

console.log(`\n🔍 COMPARAISON:`);
console.log(`   Main 1 cartes: ${evaluation1.cards.map(c => c.rank).join('')}`);
console.log(`   Main 2 cartes: ${evaluation2.cards.map(c => c.rank).join('')}`);
console.log(`   Main 1 - Brelan: ${evaluation1.threeRank} (${getRankValue(evaluation1.threeRank)}), Paire: ${evaluation1.pairRank} (${getRankValue(evaluation1.pairRank)})`);
console.log(`   Main 2 - Brelan: ${evaluation2.threeRank} (${getRankValue(evaluation2.threeRank)}), Paire: ${evaluation2.pairRank} (${getRankValue(evaluation2.pairRank)})`);

// Calcul manuel de la comparaison
const threeComparison = getRankValue(evaluation2.threeRank) - getRankValue(evaluation1.threeRank);
const pairComparison = getRankValue(evaluation2.pairRank) - getRankValue(evaluation1.pairRank);
console.log(`   Comparaison brelan: ${getRankValue(evaluation2.threeRank)} - ${getRankValue(evaluation1.threeRank)} = ${threeComparison}`);
console.log(`   Comparaison paire: ${getRankValue(evaluation2.pairRank)} - ${getRankValue(evaluation1.pairRank)} = ${pairComparison}`);

console.log(`   Résultat: ${comparison > 0 ? 'Main 2 gagne' : comparison < 0 ? 'Main 1 gagne' : 'Égalité'}`);
console.log(`   Valeur: ${comparison}`);

if (comparison > 0) {
  console.log(`   ✅ CORRECT: viny1976 gagne avec Full House valet par les 8`);
} else {
  console.log(`   ❌ ERREUR: bea1978 ne devrait pas gagner`);
}

// Test avec d'autres full houses
console.log("\n🎯 TESTS ADDITIONNELS:");

const testCases = [
  {
    name: "Full House A par les K vs Full House K par les A",
    hand1: [
      { rank: 'A', suit: 'hearts' }, { rank: 'A', suit: 'diamonds' }, { rank: 'A', suit: 'clubs' },
      { rank: 'K', suit: 'spades' }, { rank: 'K', suit: 'hearts' }
    ],
    hand2: [
      { rank: 'K', suit: 'spades' }, { rank: 'K', suit: 'diamonds' }, { rank: 'K', suit: 'clubs' },
      { rank: 'A', suit: 'hearts' }, { rank: 'A', suit: 'diamonds' }
    ],
    expected: "hand1" // A par les K > K par les A
  },
  {
    name: "Full House Q par les 7 vs Full House Q par les 6",
    hand1: [
      { rank: 'Q', suit: 'hearts' }, { rank: 'Q', suit: 'diamonds' }, { rank: 'Q', suit: 'clubs' },
      { rank: '7', suit: 'spades' }, { rank: '7', suit: 'hearts' }
    ],
    hand2: [
      { rank: 'Q', suit: 'spades' }, { rank: 'Q', suit: 'diamonds' }, { rank: 'Q', suit: 'clubs' },
      { rank: '6', suit: 'hearts' }, { rank: '6', suit: 'diamonds' }
    ],
    expected: "hand1" // Q par les 7 > Q par les 6
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  
  const eval1 = evaluateHand(testCase.hand1);
  const eval2 = evaluateHand(testCase.hand2);
  const comp = compareHandsWithKickers(eval1, eval2);
  
  const result = comp > 0 ? "hand2" : comp < 0 ? "hand1" : "tie";
  const correct = result === testCase.expected;
  
  console.log(`   Résultat: ${result} (attendu: ${testCase.expected})`);
  console.log(`   ${correct ? '✅' : '❌'} ${correct ? 'CORRECT' : 'ERREUR'}`);
});

console.log("\n🎯 RÈGLE DU FULL HOUSE:");
console.log("Pour départager deux full houses:");
console.log("1. Comparer d'abord le brelan (3 cartes)");
console.log("2. Si égal, comparer la paire (2 cartes)");
console.log("3. Le plus fort gagne");
