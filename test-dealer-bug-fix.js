// Test du bug potentiel dans getNextDealerPosition
console.log("🐛 TEST BUG DEALER ÉLIMINÉ");
console.log("=========================");

// Reproduction exacte de la fonction actuelle
function getNextDealerPosition_CURRENT(currentDealerPosition, playerPositions) {
  const currentIndex = playerPositions.indexOf(currentDealerPosition);
  if (currentIndex === -1) return playerPositions[0]; // ⚠️ PROBLÈME ICI
  
  const nextIndex = (currentIndex + 1) % playerPositions.length;
  return playerPositions[nextIndex];
}

// Fonction corrigée
function getNextDealerPosition_FIXED(currentDealerPosition, playerPositions) {
  const currentIndex = playerPositions.indexOf(currentDealerPosition);
  
  if (currentIndex === -1) {
    // Dealer éliminé: trouver le prochain dans l'ordre logique
    // Trouver le plus petit index qui est > currentDealerPosition
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

console.log("🎯 SCÉNARIO PROBLÉMATIQUE:");
console.log("Table 6 joueurs: [0, 1, 2, 3, 4, 5]");
console.log("Dealer actuel: Pos2 (Charlie)");
console.log("Charlie est éliminé → Joueurs restants: [0, 1, 3, 4, 5]");
console.log("");

const activePlayers = [0, 1, 3, 4, 5]; // Charlie (Pos2) éliminé
const currentDealer = 2; // Charlie était dealer

console.log("❌ FONCTION ACTUELLE:");
const result_current = getNextDealerPosition_CURRENT(currentDealer, activePlayers);
console.log(`   Résultat: Pos${result_current}`);
console.log(`   Logique: indexOf(2) dans [0,1,3,4,5] = -1 → return activePlayers[0] = ${activePlayers[0]}`);
console.log("   ❌ PROBLÈME: Alice (Pos0) devient dealer, mais l'ordre logique devrait être:");
console.log("      Charlie(Pos2) → Diana(Pos3) dans l'ordre visuel horaire");

console.log("\n✅ FONCTION CORRIGÉE:");
const result_fixed = getNextDealerPosition_FIXED(currentDealer, activePlayers);
console.log(`   Résultat: Pos${result_fixed}`);
console.log("   Logique: Chercher la plus petite position > 2 dans [0,1,3,4,5] = 3");
console.log("   ✅ CORRECT: Diana (Pos3) devient dealer, respectant l'ordre horaire");

console.log("\n🔄 TEST ROTATION COMPLÈTE:");

function testRotationBothVersions() {
  let dealer_current = 1; // Bob est dealer
  let dealer_fixed = 1;
  const players = [0, 1, 3, 4, 5]; // Charlie éliminé
  
  console.log("\nConfiguration: Joueurs [0,1,3,4,5], Charlie(2) éliminé");
  console.log("Dealer initial: Pos1 (Bob)");
  
  for (let main = 1; main <= 6; main++) {
    console.log(`\nMain ${main}:`);
    console.log(`  Dealer actuel - Current: Pos${dealer_current}, Fixed: Pos${dealer_fixed}`);
    
    if (main < 6) {
      const next_current = getNextDealerPosition_CURRENT(dealer_current, players);
      const next_fixed = getNextDealerPosition_FIXED(dealer_fixed, players);
      
      console.log(`  Prochain dealer - Current: Pos${next_current}, Fixed: Pos${next_fixed}`);
      
      if (next_current !== next_fixed) {
        console.log(`  🚨 DIFFÉRENCE détectée!`);
      } else {
        console.log(`  ✅ Même résultat`);
      }
      
      dealer_current = next_current;
      dealer_fixed = next_fixed;
    }
  }
}

testRotationBothVersions();

console.log("\n🔍 === ANALYSE VISUELLE ===");
console.log("Position → Angle visuel:");
console.log("  Pos0: 12h (Haut)");
console.log("  Pos1: 2h (Haut-droite)"); 
console.log("  Pos2: 4h (Droite) ← ÉLIMINÉ");
console.log("  Pos3: 6h (Bas)");
console.log("  Pos4: 8h (Bas-gauche)");
console.log("  Pos5: 10h (Haut-gauche)");
console.log("");
console.log("Ordre horaire attendu: 0→1→[2 éliminé]→3→4→5→0");
console.log("Si dealer = Pos1 (2h), prochain = Pos3 (6h) ✅");
console.log("Si dealer = Pos2 éliminé, prochain = Pos3 (6h) ✅");

console.log("\n📊 === RECOMMANDATION ===");
console.log("❌ PROBLÈME IDENTIFIÉ:");
console.log("   Quand le dealer est éliminé, la fonction retourne playerPositions[0]");
console.log("   au lieu de calculer le véritable suivant dans l'ordre logique.");
console.log("");
console.log("✅ SOLUTION:");
console.log("   Modifier getNextDealerPosition pour chercher la plus petite");
console.log("   position > currentDealerPosition dans la liste des actifs.");