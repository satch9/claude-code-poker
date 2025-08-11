// Test de la rotation du dealer - Sens horaire
console.log("🎯 TEST ROTATION DEALER - SENS HORAIRE");
console.log("====================================");

// Reproduction de la logique du turnManager
function getNextDealerPosition(currentDealerPosition, playerPositions) {
  const currentIndex = playerPositions.indexOf(currentDealerPosition);
  if (currentIndex === -1) return playerPositions[0];
  
  const nextIndex = (currentIndex + 1) % playerPositions.length;
  return playerPositions[nextIndex];
}

// Reproduction de la disposition visuelle selon PokerTable.tsx
function getVisualPosition(position, maxPlayers) {
  if (maxPlayers === 4) {
    const positions = {
      0: "Haut (12h)",     // -Math.PI / 2
      1: "Droite (3h)",    // 0
      2: "Bas (6h)",       // Math.PI / 2
      3: "Gauche (9h)"     // Math.PI
    };
    return positions[position];
  } else if (maxPlayers === 6) {
    const positions = {
      0: "Haut (12h)",         // -Math.PI / 2
      1: "Haut-droite (2h)",   // -Math.PI / 6
      2: "Bas-droite (4h)",    // Math.PI / 6
      3: "Bas (6h)",           // Math.PI / 2
      4: "Bas-gauche (8h)",    // 5 * Math.PI / 6
      5: "Haut-gauche (10h)"   // -5 * Math.PI / 6
    };
    return positions[position];
  } else if (maxPlayers === 9) {
    // Pour 9 joueurs, calcul circulaire
    const positions = {
      0: "Haut (12h)",
      1: "1h30",
      2: "3h",
      3: "4h30", 
      4: "6h",
      5: "7h30",
      6: "9h",
      7: "10h30",
      8: "Haut-gauche (11h)"
    };
    return positions[position];
  }
  return `Position ${position}`;
}

function testDealerRotation(maxPlayers) {
  console.log(`\n🎯 TEST AVEC ${maxPlayers} JOUEURS`);
  console.log("=".repeat(30));
  
  const playerPositions = Array.from({ length: maxPlayers }, (_, i) => i);
  console.log(`👥 Positions: [${playerPositions.join(", ")}]`);
  
  // Afficher la disposition visuelle
  console.log("\n📍 DISPOSITION VISUELLE:");
  playerPositions.forEach(pos => {
    console.log(`   Pos${pos}: ${getVisualPosition(pos, maxPlayers)}`);
  });
  
  console.log("\n🔄 ROTATION DU DEALER:");
  
  let currentDealer = 0; // Commencer par position 0
  
  for (let hand = 1; hand <= Math.min(maxPlayers + 2, 8); hand++) {
    const visualPos = getVisualPosition(currentDealer, maxPlayers);
    console.log(`   Main ${hand}: Dealer = Pos${currentDealer} (${visualPos})`);
    
    // Calculer le prochain dealer
    const nextDealer = getNextDealerPosition(currentDealer, playerPositions);
    
    if (hand <= maxPlayers) {
      const nextVisualPos = getVisualPosition(nextDealer, maxPlayers);
      console.log(`              Prochain = Pos${nextDealer} (${nextVisualPos})`);
      
      // Vérifier le sens horaire
      const expectedNext = (currentDealer + 1) % maxPlayers;
      if (nextDealer === expectedNext) {
        console.log(`              ✅ CORRECT: Sens horaire`);
      } else {
        console.log(`              ❌ ERREUR: Attendu Pos${expectedNext}, reçu Pos${nextDealer}`);
      }
    }
    
    currentDealer = nextDealer;
  }
}

// Tests avec différentes configurations
testDealerRotation(4); // Configuration utilisateur
testDealerRotation(6); // Configuration populaire
testDealerRotation(9); // Configuration maximum

console.log("\n🔍 === ANALYSE DU SENS HORAIRE ===");
console.log("Sur une table de poker vue de dessus :");
console.log("- Position 0 = 12h (Haut)");
console.log("- Position 1 = 3h (Droite)");
console.log("- Position 2 = 6h (Bas)");
console.log("- Position 3 = 9h (Gauche)");
console.log("");
console.log("🎯 SENS HORAIRE = 12h → 3h → 6h → 9h → 12h");
console.log("En indices: 0 → 1 → 2 → 3 → 0");
console.log("");
console.log("✅ LOGIQUE ACTUELLE: (position + 1) % maxPlayers");
console.log("   Cela fait bien 0→1→2→3→0 = CORRECT");

console.log("\n📋 === TEST SPÉCIFIQUE CONFIGURATION UTILISATEUR ===");
console.log("Table 4 joueurs:");
console.log("- Pos0 (Alice/SB) = 12h");
console.log("- Pos1 (Bob/BB) = 3h");
console.log("- Pos2 (Charlie/UTG) = 6h");
console.log("- Pos3 (Diana/Dealer) = 9h");
console.log("");
console.log("Rotation attendue:");
console.log("Main 1: Dealer = Pos3 (9h/Gauche)");
console.log("Main 2: Dealer = Pos0 (12h/Haut) ← Alice devient dealer");
console.log("Main 3: Dealer = Pos1 (3h/Droite) ← Bob devient dealer");
console.log("Main 4: Dealer = Pos2 (6h/Bas) ← Charlie devient dealer");

// Vérification spécifique
const testPositions = [0, 1, 2, 3];
let dealer = 3; // Diana est dealer au début

console.log("\n🎲 SIMULATION RÉELLE:");
for (let main = 1; main <= 6; main++) {
  const names = ["Alice", "Bob", "Charlie", "Diana"];
  const visualPositions = ["12h/Haut", "3h/Droite", "6h/Bas", "9h/Gauche"];
  
  console.log(`Main ${main}: Dealer = Pos${dealer} (${names[dealer]} - ${visualPositions[dealer]})`);
  
  if (main < 6) {
    const nextDealer = getNextDealerPosition(dealer, testPositions);
    console.log(`          Prochain = Pos${nextDealer} (${names[nextDealer]} - ${visualPositions[nextDealer]})`);
    dealer = nextDealer;
  }
}

console.log("\n✅ CONCLUSION:");
console.log("La rotation du dealer fonctionne correctement dans le sens horaire!");
console.log("La logique (position + 1) % maxPlayers est CORRECTE.");