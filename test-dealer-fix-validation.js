// Test de validation de la correction du dealer
console.log("✅ TEST VALIDATION CORRECTION DEALER");
console.log("===================================");

// Nouvelle fonction corrigée (copiée du code)
function getNextDealerPosition(currentDealerPosition, playerPositions) {
  const currentIndex = playerPositions.indexOf(currentDealerPosition);
  
  if (currentIndex === -1) {
    // Dealer éliminé: trouver le prochain dans l'ordre horaire logique
    // Chercher la plus petite position > currentDealerPosition
    const nextPositions = playerPositions.filter(pos => pos > currentDealerPosition);
    if (nextPositions.length > 0) {
      return Math.min(...nextPositions);
    } else {
      // Pas de position supérieure, prendre la plus petite (wrap around)
      return Math.min(...playerPositions);
    }
  }
  
  const nextIndex = (currentIndex + 1) % playerPositions.length;
  return playerPositions[nextIndex];
}

function testScenarios() {
  const scenarios = [
    {
      name: "Dealer normal - pas éliminé",
      players: [0, 1, 2, 3, 4, 5],
      dealer: 2,
      expected: 3,
      explanation: "Pos2 → Pos3 (normal)"
    },
    {
      name: "Dealer éliminé - cas simple", 
      players: [0, 1, 3, 4, 5], // Pos2 éliminé
      dealer: 2,
      expected: 3,
      explanation: "Pos2 éliminé → chercher plus petite pos > 2 = Pos3"
    },
    {
      name: "Dealer éliminé - wrap around",
      players: [0, 1, 2], // Pos3,4,5 éliminés
      dealer: 5, 
      expected: 0,
      explanation: "Pos5 éliminé, aucune pos > 5 → plus petite = Pos0"
    },
    {
      name: "Dealer éliminé - début de table",
      players: [1, 2, 3, 4, 5], // Pos0 éliminé
      dealer: 0,
      expected: 1,
      explanation: "Pos0 éliminé → plus petite pos > 0 = Pos1"
    },
    {
      name: "Rotation normale après correction",
      players: [0, 1, 3, 4, 5], // Pos2 toujours éliminé
      dealer: 3, // Diana maintenant dealer
      expected: 4,
      explanation: "Pos3 → Pos4 (rotation normale)"
    }
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`\n🎯 TEST ${index + 1}: ${scenario.name}`);
    console.log(`   Joueurs actifs: [${scenario.players.join(", ")}]`);
    console.log(`   Dealer actuel: Pos${scenario.dealer}`);
    console.log(`   Attendu: Pos${scenario.expected}`);
    
    const result = getNextDealerPosition(scenario.dealer, scenario.players);
    console.log(`   Résultat: Pos${result}`);
    console.log(`   Explication: ${scenario.explanation}`);
    
    if (result === scenario.expected) {
      console.log("   ✅ CORRECT");
    } else {
      console.log(`   ❌ ERREUR - Attendu Pos${scenario.expected}, reçu Pos${result}`);
    }
  });
}

testScenarios();

console.log("\n🔄 === SIMULATION PARTIE COMPLÈTE ===");

function simulateCompleteGame() {
  // Démarrage avec 6 joueurs
  let activePlayers = [0, 1, 2, 3, 4, 5];
  let dealer = 0; // Alice commence
  
  const events = [
    { main: 1, action: "Partie normale" },
    { main: 2, action: "Partie normale" },
    { main: 3, action: "Charlie (Pos2) éliminé", eliminate: 2 },
    { main: 4, action: "Partie normale" },
    { main: 5, action: "Eve (Pos4) éliminée", eliminate: 4 },
    { main: 6, action: "Partie finale" }
  ];
  
  events.forEach(event => {
    console.log(`\n📋 MAIN ${event.main}: ${event.action}`);
    
    if (event.eliminate) {
      activePlayers = activePlayers.filter(pos => pos !== event.eliminate);
      console.log(`   💀 Pos${event.eliminate} éliminé`);
    }
    
    console.log(`   👥 Joueurs actifs: [${activePlayers.join(", ")}]`);
    console.log(`   🃏 Dealer: Pos${dealer}`);
    
    if (event.main < events.length) {
      const nextDealer = getNextDealerPosition(dealer, activePlayers);
      console.log(`   ➡️  Prochain: Pos${nextDealer}`);
      
      // Vérifier la logique
      if (activePlayers.includes(dealer)) {
        console.log("   ✅ Dealer actif → rotation normale");
      } else {
        console.log("   🔄 Dealer éliminé → recherche du suivant dans l'ordre");
      }
      
      dealer = nextDealer;
    }
  });
}

simulateCompleteGame();

console.log("\n✅ === RÉSUMÉ ===");
console.log("🎯 PROBLÈME RÉSOLU:");
console.log("   • Rotation respecte maintenant l'ordre horaire même avec éliminations");
console.log("   • Dealer éliminé → cherche le prochain dans l'ordre logique");
console.log("   • Wrap-around correct quand pas de position supérieure");
console.log("");
console.log("🔄 FONCTIONNEMENT:");
console.log("   • Si dealer actif: rotation normale (index + 1)");
console.log("   • Si dealer éliminé: min(positions > dealer) ou min(all positions)");
console.log("");
console.log("📍 Ordre visuel respecté:");
console.log("   • 0→1→2→3→4→5→0 (quand tous présents)");
console.log("   • 0→1→3→4→5→0 (si Pos2 éliminé)");
console.log("   • Correspond au sens horaire sur la table");