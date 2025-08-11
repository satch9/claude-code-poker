// Simulation du bug d'ordre d'action
console.log("🐛 Debug Action Order - Table 4 joueurs\n");

// Simulation des joueurs dans une table 4 joueurs
const players = [
  { seatPosition: 0, chips: 1000, isFolded: false, isAllIn: false }, // SB
  { seatPosition: 1, chips: 1000, isFolded: false, isAllIn: false }, // BB  
  { seatPosition: 2, chips: 1000, isFolded: false, isAllIn: false }, // UTG
  { seatPosition: 3, chips: 1000, isFolded: false, isAllIn: false }  // Dealer
];

const dealerPosition = 3;

// 🔹 REPRODUCTION DU CODE ACTUEL

// 1. Au démarrage (pré-flop) - CORRECT
console.log("=== PREFLOP (startGameInternal) ===");
const playerPositions_preflop = players.map(p => p.seatPosition);
console.log("playerPositions:", playerPositions_preflop); // [0, 1, 2, 3]

function getBlindPositions(dealerPosition, playerPositions) {
  const numPlayers = playerPositions.length;
  const dealerIndex = playerPositions.indexOf(dealerPosition);
  const sbIndex = (dealerIndex + 1) % numPlayers;
  const bbIndex = (dealerIndex + 2) % numPlayers;
  
  return {
    smallBlind: playerPositions[sbIndex],
    bigBlind: playerPositions[bbIndex]
  };
}

const { smallBlind, bigBlind } = getBlindPositions(dealerPosition, playerPositions_preflop);
console.log(`Dealer: ${dealerPosition}, SB: ${smallBlind}, BB: ${bigBlind}`);

function getFirstPlayerToAct(dealerPosition, playerPositions, phase) {
  const numPlayers = playerPositions.length;
  
  if (phase === 'preflop') {
    if (numPlayers === 2) {
      return dealerPosition;
    } else {
      const dealerIndex = playerPositions.indexOf(dealerPosition);
      const firstActorIndex = (dealerIndex + 3) % numPlayers;
      return playerPositions[firstActorIndex];
    }
  } else {
    // Post-flop: first active player after dealer acts first  
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    const firstActorIndex = (dealerIndex + 1) % numPlayers;
    return playerPositions[firstActorIndex];
  }
}

const firstPreflop = getFirstPlayerToAct(dealerPosition, playerPositions_preflop, 'preflop');
console.log(`Premier pré-flop: ${firstPreflop} (UTG) ✅`);

// 2. Passage au flop (advanceToNextPhase) - PROBLÈME POTENTIEL
console.log("\n=== FLOP (advanceToNextPhase) ===");
const activePlayers = players.filter(p => !p.isFolded);
const playerPositions_postflop = activePlayers
  .filter(p => !p.isAllIn)
  .map(p => p.seatPosition)
  .sort((a, b) => a - b);  // ❌ LE SORT ICI !

console.log("activePlayers positions:", activePlayers.map(p => p.seatPosition)); // [0, 1, 2, 3]
console.log("playerPositions_postflop (après sort):", playerPositions_postflop); // [0, 1, 2, 3]

const firstPostflop = getFirstPlayerToAct(dealerPosition, playerPositions_postflop, 'postflop');
console.log(`Premier post-flop: ${firstPostflop}`);

// Vérification manuelle
const dealerIndex = playerPositions_postflop.indexOf(dealerPosition); // indexOf(3) dans [0,1,2,3] = 3
const firstActorIndex = (dealerIndex + 1) % playerPositions_postflop.length; // (3+1) % 4 = 0
const expectedFirst = playerPositions_postflop[firstActorIndex]; // [0,1,2,3][0] = 0

console.log(`Calcul manuel: dealerIndex=${dealerIndex}, firstActorIndex=${firstActorIndex}, result=${expectedFirst}`);

if (firstPostflop === smallBlind) {
  console.log("✅ CORRECT: SB parle en premier au flop");
} else {
  console.log("❌ INCORRECT: SB devrait parler en premier au flop");
}

// 🔹 TEST AVEC JOUEUR ÉLIMINÉ

console.log("\n=== TEST AVEC JOUEUR ÉLIMINÉ ===");
// SB (position 0) fold
const playersWithFold = players.map((p, i) => 
  i === 0 ? {...p, isFolded: true} : p
);

const activePlayersWithFold = playersWithFold.filter(p => !p.isFolded);
const playerPositionsWithFold = activePlayersWithFold
  .filter(p => !p.isAllIn)
  .map(p => p.seatPosition)
  .sort((a, b) => a - b);

console.log("Joueurs actifs après SB fold:", activePlayersWithFold.map(p => p.seatPosition)); // [1, 2, 3]
console.log("playerPositions après sort:", playerPositionsWithFold); // [1, 2, 3]

const firstWithFold = getFirstPlayerToAct(dealerPosition, playerPositionsWithFold, 'postflop');
console.log(`Premier avec SB fold: ${firstWithFold}`);

// Dans ce cas, BB (position 1) devrait parler en premier
if (firstWithFold === bigBlind) {
  console.log("✅ CORRECT: BB parle en premier quand SB fold");
} else {
  console.log("❌ INCORRECT: BB devrait parler en premier quand SB fold");
}

console.log("\n=== CONCLUSION ===");
console.log("Le code semble fonctionner correctement dans ces scénarios simples.");
console.log("Le problème pourrait être ailleurs : affichage UI, synchronisation, ou cas edge.");