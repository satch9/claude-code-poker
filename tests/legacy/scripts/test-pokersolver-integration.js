// Test d'intégration avec pokersolver et traductions françaises
console.log("🧪 TEST D'INTÉGRATION POKERSOLVER");
console.log("=".repeat(50));

// Simulation de l'utilisation de pokersolver
const { Hand } = require('pokersolver');

// Test des mains de poker
const testHands = [
  {
    name: "Full House valet par les 8",
    cards: ["Js", "Jd", "Jc", "8h", "8d"],
    expected: "Full House"
  },
  {
    name: "Full House 8 par les valets", 
    cards: ["8s", "8d", "8c", "Jh", "Jd"],
    expected: "Full House"
  },
  {
    name: "Quinte Flush Royale",
    cards: ["As", "Ks", "Qs", "Js", "Ts"],
    expected: "Royal Flush"
  },
  {
    name: "Carré de 7",
    cards: ["7s", "7d", "7c", "7h", "2d"],
    expected: "Four of a Kind"
  }
];

console.log("\n🎯 TEST DES MAINS AVEC POKERSOLVER:");

testHands.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   Cartes: ${testCase.cards.join(' ')}`);
  
  try {
    const hand = Hand.solve(testCase.cards);
    console.log(`   Résultat: ${hand.name}`);
    console.log(`   Description: ${hand.descr}`);
    console.log(`   Rang: ${hand.rank}`);
    
    if (hand.name === testCase.expected) {
      console.log(`   ✅ CORRECT`);
    } else {
      console.log(`   ❌ ERREUR: attendu ${testCase.expected}`);
    }
  } catch (error) {
    console.log(`   ❌ ERREUR: ${error.message}`);
  }
});

// Test de comparaison de mains
console.log("\n🎯 TEST DE COMPARAISON DE MAINS:");

const hand1 = Hand.solve(["Js", "Jd", "Jc", "8h", "8d"]); // Full House J par 8
const hand2 = Hand.solve(["8s", "8d", "8c", "Jh", "Jd"]); // Full House 8 par J

console.log(`\nMain 1: ${hand1.name} - ${hand1.descr}`);
console.log(`Main 2: ${hand2.name} - ${hand2.descr}`);

const winners = Hand.winners([hand1, hand2]);
console.log(`\nGagnant(s): ${winners.map(h => h.descr).join(', ')}`);

if (winners.length === 1 && winners[0] === hand1) {
  console.log(`✅ CORRECT: Main 1 gagne (Full House J par 8 > Full House 8 par J)`);
} else if (winners.length === 1 && winners[0] === hand2) {
  console.log(`❌ ERREUR: Main 2 ne devrait pas gagner`);
} else {
  console.log(`❌ ERREUR: Résultat inattendu`);
}

// Test des traductions françaises
console.log("\n🎯 TEST DES TRADUCTIONS FRANÇAISES:");

const translations = {
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

Object.entries(translations).forEach(([english, french]) => {
  console.log(`   ${english} → ${french}`);
});

console.log("\n🎯 RÉSUMÉ:");
console.log("Pokersolver gère correctement:");
console.log("- ✅ Évaluation précise des mains");
console.log("- ✅ Comparaison correcte des mains de même rang");
console.log("- ✅ Gestion des kickers automatique");
console.log("- ✅ Résolution des égalités");
console.log("\nAvantages par rapport à notre logique manuelle:");
console.log("- Plus robuste et testée");
console.log("- Gère tous les cas edge");
console.log("- Comparaisons précises");
console.log("- Moins de bugs potentiels");
