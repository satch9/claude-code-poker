// Test du problème de sort dans l'ordre d'action
console.log("🔍 Test du problème de SORT dans les positions\n");

// Scénario problématique possible
const players = [
  { seatPosition: 1, chips: 1000, isFolded: false, isAllIn: false }, // BB
  { seatPosition: 3, chips: 1000, isFolded: false, isAllIn: false }, // Dealer  
  { seatPosition: 0, chips: 1000, isFolded: false, isAllIn: false }, // SB (rejoint après)
  { seatPosition: 2, chips: 1000, isFolded: false, isAllIn: false }  // UTG
];

const dealerPosition = 3;

console.log("=== ORDRE ORIGINAL DES JOUEURS ===");
console.log("Joueurs dans l'ordre DB:", players.map(p => p.seatPosition)); // [1, 3, 0, 2]

// Simulation du code AVEC sort (actuel)
console.log("\n=== AVEC SORT (CODE ACTUEL) ===");
const activePlayers = players.filter(p => !p.isFolded);
const playerPositions_withSort = activePlayers
  .filter(p => !p.isAllIn)
  .map(p => p.seatPosition)
  .sort((a, b) => a - b);

console.log("Positions après sort:", playerPositions_withSort); // [0, 1, 2, 3]

function getFirstPlayerToAct(dealerPosition, playerPositions, phase) {
  const numPlayers = playerPositions.length;
  
  if (phase === 'preflop') {
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    const firstActorIndex = (dealerIndex + 3) % numPlayers;
    return playerPositions[firstActorIndex];
  } else {
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    const firstActorIndex = (dealerIndex + 1) % numPlayers;
    return playerPositions[firstActorIndex];
  }
}

const result_withSort = getFirstPlayerToAct(dealerPosition, playerPositions_withSort, 'flop');
console.log(`Premier avec sort: ${result_withSort}`);

// Simulation du code SANS sort
console.log("\n=== SANS SORT (CORRECTION) ===");
const playerPositions_noSort = activePlayers
  .filter(p => !p.isAllIn)
  .map(p => p.seatPosition);
  // PAS de sort ici

console.log("Positions sans sort:", playerPositions_noSort); // [1, 3, 0, 2] - ordre original

const result_noSort = getFirstPlayerToAct(dealerPosition, playerPositions_noSort, 'flop');
console.log(`Premier sans sort: ${result_noSort}`);

console.log("\n=== ANALYSE ===");
console.log("Dealer position:", dealerPosition);

// Avec sort [0, 1, 2, 3]
const dealerIndex_sort = playerPositions_withSort.indexOf(dealerPosition); // indexOf(3) = 3
const firstIndex_sort = (dealerIndex_sort + 1) % 4; // (3+1)%4 = 0
console.log(`Avec sort: dealerIndex=${dealerIndex_sort}, firstIndex=${firstIndex_sort}, result=${playerPositions_withSort[firstIndex_sort]}`);

// Sans sort [1, 3, 0, 2] 
const dealerIndex_nosort = playerPositions_noSort.indexOf(dealerPosition); // indexOf(3) = 1
const firstIndex_nosort = (dealerIndex_nosort + 1) % 4; // (1+1)%4 = 2  
console.log(`Sans sort: dealerIndex=${dealerIndex_nosort}, firstIndex=${firstIndex_nosort}, result=${playerPositions_noSort[firstIndex_nosort]}`);

console.log("\n=== VERDICT ===");
if (result_withSort === 0) {
  console.log("✅ Avec sort: SB (0) parle en premier - CORRECT selon les règles");
}
if (result_noSort === 0) {
  console.log("✅ Sans sort: SB (0) parle en premier - CORRECT selon les règles");
} else {
  console.log(`❌ Sans sort: Position ${result_noSort} parle en premier - INCORRECT!`);
}

console.log("\nCONCLUSION: Le sort pourrait être nécessaire pour maintenir l'ordre logique!");
console.log("Le problème pourrait être ailleurs dans le code...");