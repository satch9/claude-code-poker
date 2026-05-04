// Test du support Short Deck (6+ Hold'em)
import pkg from 'pokersolver';
const { Hand } = pkg;

console.log('🃏 Test du support Short Deck (6+ Hold\'em)\n');

// Test 1: Main Short Deck basique
console.log('=== Test 1: Main Short Deck basique ===');
const shortDeckCards1 = ['6h', '7h', '8h', '9h', 'Th']; // Quinte flush 6-10
const hand1 = Hand.solve(shortDeckCards1, 'shortdeck');
console.log(`Main: ${shortDeckCards1.join(' ')}`);
console.log(`Type: ${hand1.name}`);
console.log(`Description: ${hand1.descr}`);
console.log(`Rang: ${hand1.rank}`);
console.log(`Cartes: ${hand1.cards.map(c => c.toString()).join(' ')}`);
console.log('');

// Test 2: Comparaison de mains Short Deck
console.log('=== Test 2: Comparaison de mains Short Deck ===');
const shortDeckCards2 = ['Ah', 'Kh', 'Qh', 'Jh', 'Th']; // Quinte flush A-10
const hand2 = Hand.solve(shortDeckCards2, 'shortdeck');

console.log(`Main 1: ${shortDeckCards1.join(' ')} - ${hand1.name}`);
console.log(`Main 2: ${shortDeckCards2.join(' ')} - ${hand2.name}`);

const winners = Hand.winners([hand1, hand2]);
console.log(`Gagnant(s): ${winners.map(h => h.descr).join(', ')}`);
console.log('');

// Test 3: Main avec cartes 6-A uniquement
console.log('=== Test 3: Validation des cartes Short Deck ===');
const validShortDeck = ['6c', '7d', '8h', '9s', 'Tc']; // Cartes valides
const invalidShortDeck = ['2c', '3d', '4h', '5s', '6c']; // Cartes invalides (2-5)

try {
  const validHand = Hand.solve(validShortDeck, 'shortdeck');
  console.log(`Main valide: ${validShortDeck.join(' ')} - ${validHand.name}`);
} catch (error) {
  console.log(`Erreur main valide: ${error.message}`);
}

try {
  const invalidHand = Hand.solve(invalidShortDeck, 'shortdeck');
  console.log(`Main invalide: ${invalidShortDeck.join(' ')} - ${invalidHand.name}`);
} catch (error) {
  console.log(`Erreur main invalide: ${error.message}`);
}
console.log('');

// Test 4: Différences entre Standard et Short Deck
console.log('=== Test 4: Comparaison Standard vs Short Deck ===');
const testCards = ['6h', '7h', '8h', '9h', 'Th'];

const standardHand = Hand.solve(testCards, 'standard');
const shortDeckHand = Hand.solve(testCards, 'shortdeck');

console.log(`Cartes: ${testCards.join(' ')}`);
console.log(`Standard: ${standardHand.name} (rang ${standardHand.rank})`);
console.log(`Short Deck: ${shortDeckHand.name} (rang ${shortDeckHand.rank})`);
console.log('');

// Test 5: Création d'un deck Short Deck
console.log('=== Test 5: Création d\'un deck Short Deck ===');
const shortDeckRanks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suits = ['h', 'd', 'c', 's'];

console.log('Rangs Short Deck:', shortDeckRanks.join(', '));
console.log('Nombre total de cartes:', shortDeckRanks.length * suits.length);
console.log('Exemples de cartes:');
for (let i = 0; i < 5; i++) {
  const rank = shortDeckRanks[Math.floor(Math.random() * shortDeckRanks.length)];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  console.log(`  ${rank}${suit}`);
}
console.log('');

// Test 6: Probabilités différentes en Short Deck
console.log('=== Test 6: Probabilités Short Deck ===');
console.log('En Short Deck (6+ Hold\'em):');
console.log('- Pas de cartes 2-5 (36 cartes au lieu de 52)');
console.log('- Les quintes sont plus rares (pas de 2-3-4-5-6)');
console.log('- Les flushes sont plus fréquentes');
console.log('- Les paires et brelans sont plus fréquents');
console.log('- Les straight flushes sont impossibles (pas de 2-5)');
console.log('');

console.log('✅ Tests Short Deck terminés !');
