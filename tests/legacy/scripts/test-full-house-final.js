// Test final de la correction du full house
console.log("🧪 TEST FINAL - CORRECTION DU FULL HOUSE");
console.log("=".repeat(50));

// Simulation du problème original
console.log("\n🎯 PROBLÈME ORIGINAL:");
console.log("bea1978: Full House 8 par les valets (888JJ)");
console.log("viny1976: Full House valet par les 8 (JJJ88)");
console.log("Résultat attendu: viny1976 gagne (brelan J > brelan 8)");

// Test avec la logique corrigée
const { evaluateHand, compareHandsWithKickers, getRankValue } = require('./convex/utils/poker.ts');

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
  { rank: 'J', suit: 'spades' },
  { rank: 'J', suit: 'diamonds' },
  { rank: 'J', suit: 'clubs' },
  { rank: '8', suit: 'hearts' },
  { rank: '8', suit: 'diamonds' }
];

const evaluation1 = evaluateHand(hand1);
const evaluation2 = evaluateHand(hand2);

console.log(`\n📊 ÉVALUATION:`);
console.log(`bea1978: ${evaluation1.name} - ${hand1.map(c => c.rank).join('')}`);
console.log(`viny1976: ${evaluation2.name} - ${hand2.map(c => c.rank).join('')}`);

const comparison = compareHandsWithKickers(evaluation1, evaluation2);

console.log(`\n🏆 RÉSULTAT:`);
if (comparison > 0) {
  console.log(`✅ viny1976 gagne (valeur: ${comparison})`);
  console.log(`✅ CORRECTION APPLIQUÉE AVEC SUCCÈS`);
} else if (comparison < 0) {
  console.log(`❌ bea1978 gagne (valeur: ${comparison})`);
  console.log(`❌ PROBLÈME NON RÉSOLU`);
} else {
  console.log(`🤝 Égalité (valeur: ${comparison})`);
  console.log(`❌ PROBLÈME NON RÉSOLU`);
}

console.log(`\n🎯 RÈGLE APPLIQUÉE:`);
console.log("Pour départager deux full houses:");
console.log("1. Comparer d'abord le brelan (3 cartes)");
console.log("2. Si égal, comparer la paire (2 cartes)");
console.log("3. Le plus fort gagne");

console.log(`\n📝 DÉTAILS:`);
console.log(`- bea1978: brelan 8 (valeur: ${getRankValue('8')}), paire J (valeur: ${getRankValue('J')})`);
console.log(`- viny1976: brelan J (valeur: ${getRankValue('J')}), paire 8 (valeur: ${getRankValue('8')})`);
console.log(`- Comparaison: brelan J (${getRankValue('J')}) > brelan 8 (${getRankValue('8')})`);
