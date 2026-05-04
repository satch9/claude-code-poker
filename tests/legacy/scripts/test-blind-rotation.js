// Test de rotation des blinds suivant le dealer
console.log("🧪 TEST DE ROTATION DES BLINDS");
console.log("=".repeat(40));

// Reproduction de la logique du turnManager
function getBlindPositions(dealerPosition, playerPositions) {
  const numPlayers = playerPositions.length;
  
  if (numPlayers < 2) {
    throw new Error("Need at least 2 players");
  }
  
  if (numPlayers === 2) {
    // Heads-up: dealer is small blind
    const bigBlindPosition = playerPositions.find(pos => pos !== dealerPosition);
    if (bigBlindPosition === undefined) {
      throw new Error("Cannot find big blind position in heads-up");
    }
    return {
      smallBlind: dealerPosition,
      bigBlind: bigBlindPosition
    };
  } else {
    // Multi-way: small blind is next to dealer
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    const sbIndex = (dealerIndex + 1) % numPlayers;
    const bbIndex = (dealerIndex + 2) % numPlayers;
    
    return {
      smallBlind: playerPositions[sbIndex],
      bigBlind: playerPositions[bbIndex]
    };
  }
}

function getNextDealerPosition(currentDealerPosition, playerPositions) {
  const currentIndex = playerPositions.indexOf(currentDealerPosition);
  
  if (currentIndex === -1) {
    // Dealer éliminé: trouver le prochain dans l'ordre horaire logique
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

function getVisualPosition(position, maxPlayers) {
  const positions = {
    2: ["Bas", "Haut"],
    3: ["Haut", "Bas-gauche", "Bas-droite"],
    4: ["Haut", "Droite", "Bas", "Gauche"],
    5: ["Haut", "Haut-droite", "Bas-droite", "Bas-gauche", "Haut-gauche"],
    6: ["Haut", "Haut-droite", "Bas-droite", "Bas", "Bas-gauche", "Haut-gauche"]
  };
  return positions[maxPlayers]?.[position] || `Pos${position}`;
}

function testBlindRotation(maxPlayers) {
  console.log(`\n🎯 TEST AVEC ${maxPlayers} JOUEURS`);
  console.log("=".repeat(30));
  
  const playerPositions = Array.from({ length: maxPlayers }, (_, i) => i);
  console.log(`👥 Positions: [${playerPositions.join(", ")}]`);
  
  // Afficher la disposition visuelle
  console.log("\n📍 DISPOSITION VISUELLE:");
  playerPositions.forEach(pos => {
    console.log(`   Pos${pos}: ${getVisualPosition(pos, maxPlayers)}`);
  });
  
  console.log("\n🔄 ROTATION DU DEALER ET DES BLINDS:");
  
  let currentDealer = 0; // Commencer par position 0
  
  for (let hand = 1; hand <= Math.min(maxPlayers + 2, 8); hand++) {
    const visualPos = getVisualPosition(currentDealer, maxPlayers);
    console.log(`\n   Main ${hand}:`);
    console.log(`      Dealer = Pos${currentDealer} (${visualPos})`);
    
    // Calculer les blinds
    const blinds = getBlindPositions(currentDealer, playerPositions);
    const sbVisual = getVisualPosition(blinds.smallBlind, maxPlayers);
    const bbVisual = getVisualPosition(blinds.bigBlind, maxPlayers);
    
    console.log(`      SB = Pos${blinds.smallBlind} (${sbVisual})`);
    console.log(`      BB = Pos${blinds.bigBlind} (${bbVisual})`);
    
    // Vérifier le sens horaire
    const dealerIndex = playerPositions.indexOf(currentDealer);
    
    if (maxPlayers === 2) {
      // Heads-up: dealer = SB, l'autre = BB
      const expectedSB = currentDealer;
      const expectedBB = playerPositions.find(pos => pos !== currentDealer);
      
      if (blinds.smallBlind === expectedSB && blinds.bigBlind === expectedBB) {
        console.log(`      ✅ CORRECT: Heads-up - Dealer = SB`);
      } else {
        console.log(`      ❌ ERREUR: SB attendu Pos${expectedSB}, BB attendu Pos${expectedBB}`);
      }
    } else {
      // Multi-way: SB à gauche du dealer, BB à gauche de la SB
      const expectedSB = playerPositions[(dealerIndex + 1) % maxPlayers];
      const expectedBB = playerPositions[(dealerIndex + 2) % maxPlayers];
      
      if (blinds.smallBlind === expectedSB && blinds.bigBlind === expectedBB) {
        console.log(`      ✅ CORRECT: Sens horaire respecté`);
      } else {
        console.log(`      ❌ ERREUR: SB attendu Pos${expectedSB}, BB attendu Pos${expectedBB}`);
      }
    }
    
    // Calculer le prochain dealer
    if (hand <= maxPlayers) {
      const nextDealer = getNextDealerPosition(currentDealer, playerPositions);
      const nextVisualPos = getVisualPosition(nextDealer, maxPlayers);
      console.log(`      Prochain dealer = Pos${nextDealer} (${nextVisualPos})`);
      
      // Vérifier le sens horaire du dealer
      const expectedNext = (currentDealer + 1) % maxPlayers;
      if (nextDealer === expectedNext) {
        console.log(`      ✅ CORRECT: Rotation horaire du dealer`);
      } else {
        console.log(`      ❌ ERREUR: Dealer attendu Pos${expectedNext}, reçu Pos${nextDealer}`);
      }
      
      currentDealer = nextDealer;
    }
  }
}

// Tester avec différents nombres de joueurs
[2, 3, 4, 5, 6].forEach(testBlindRotation);

console.log("\n🎯 RÉSUMÉ:");
console.log("Les blinds doivent suivre le dealer dans le sens horaire:");
console.log("- Dealer → SB → BB → Premier à agir");
console.log("- En heads-up (2 joueurs): Dealer = SB, l'autre = BB");
console.log("- En multi-way: SB à gauche du dealer, BB à gauche de la SB");
