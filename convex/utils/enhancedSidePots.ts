// Gestion améliorée des side pots avec validation robuste
export interface SidePot {
  amount: number;
  eligiblePlayers: string[];
  potId: string; // Identifiant unique pour tracking
}

export interface PlayerBetInfo {
  userId: string;
  currentBet: number;
  totalChipsInvested: number; // Total depuis le début de la main
  isAllIn: boolean;
  isFolded: boolean;
}

export interface SidePotValidation {
  isValid: boolean;
  error?: string;
  totalAmount: number;
  expectedAmount: number;
}

/**
 * Calcule les side pots de manière robuste avec validation
 */
export function calculateSidePotsEnhanced(players: PlayerBetInfo[]): SidePot[] {
  // Filtrer les joueurs actifs avec mise
  const activePlayers = players.filter(p => !p.isFolded && p.currentBet > 0);
  
  if (activePlayers.length === 0) {
    return [];
  }
  
  // Trier par montant de mise croissant
  const sortedByBet = [...activePlayers].sort((a, b) => a.currentBet - b.currentBet);
  
  const sidePots: SidePot[] = [];
  let processedAmount = 0;
  
  // Créer les side pots niveau par niveau
  for (let i = 0; i < sortedByBet.length; i++) {
    const currentLevel = sortedByBet[i];
    const levelAmount = currentLevel.currentBet - processedAmount;
    
    if (levelAmount > 0) {
      // Tous les joueurs à ce niveau et au-dessus sont éligibles
      const eligiblePlayers = sortedByBet
        .slice(i)
        .map(p => p.userId);
      
      // Ajouter les joueurs foldés qui ont misé au moins ce montant
      const foldedEligible = players
        .filter(p => p.isFolded && p.currentBet >= currentLevel.currentBet)
        .map(p => p.userId);
      
      const allEligible = [...eligiblePlayers, ...foldedEligible];
      const potAmount = levelAmount * allEligible.length;
      
      sidePots.push({
        amount: potAmount,
        eligiblePlayers: allEligible,
        potId: `pot_${i}_${Date.now()}` // ID unique
      });
    }
    
    processedAmount = currentLevel.currentBet;
  }
  
  return sidePots;
}

/**
 * Valide la cohérence des side pots
 */
export function validateSidePots(
  sidePots: SidePot[], 
  players: PlayerBetInfo[]
): SidePotValidation {
  
  const totalSidePotsAmount = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
  const expectedTotalBets = players.reduce((sum, p) => sum + p.currentBet, 0);
  
  // Vérification du total
  if (Math.abs(totalSidePotsAmount - expectedTotalBets) > 0.01) {
    return {
      isValid: false,
      error: `Side pot total mismatch: ${totalSidePotsAmount} vs expected ${expectedTotalBets}`,
      totalAmount: totalSidePotsAmount,
      expectedAmount: expectedTotalBets
    };
  }
  
  // Vérification de l'éligibilité
  for (const pot of sidePots) {
    if (pot.eligiblePlayers.length === 0) {
      return {
        isValid: false,
        error: `Empty eligible players list for pot ${pot.potId}`,
        totalAmount: totalSidePotsAmount,
        expectedAmount: expectedTotalBets
      };
    }
    
    // Vérifier que tous les joueurs éligibles existent
    for (const playerId of pot.eligiblePlayers) {
      if (!players.find(p => p.userId === playerId)) {
        return {
          isValid: false,
          error: `Player ${playerId} in pot ${pot.potId} not found in players list`,
          totalAmount: totalSidePotsAmount,
          expectedAmount: expectedTotalBets
        };
      }
    }
  }
  
  return {
    isValid: true,
    totalAmount: totalSidePotsAmount,
    expectedAmount: expectedTotalBets
  };
}

/**
 * Distribue les gains des side pots aux gagnants
 */
export function distributeSidePots(
  sidePots: SidePot[],
  winners: { [potId: string]: string[] } // potId -> array of winner userIds
): { [userId: string]: number } {
  
  const winnings: { [userId: string]: number } = {};
  
  for (const pot of sidePots) {
    const potWinners = winners[pot.potId] || [];
    
    if (potWinners.length === 0) {
      console.warn(`No winners specified for pot ${pot.potId}`);
      continue;
    }
    
    // Diviser équitablement entre les gagnants
    const winningPerPlayer = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount % potWinners.length;
    
    potWinners.forEach((winnerId, index) => {
      winnings[winnerId] = (winnings[winnerId] || 0) + winningPerPlayer;
      
      // Distribuer le reste aux premiers gagnants
      if (index < remainder) {
        winnings[winnerId] += 1;
      }
    });
  }
  
  return winnings;
}

/**
 * Combine side pots avec le pot principal
 */
export function combinePots(
  mainPot: number,
  sidePots: SidePot[],
  allPlayers: string[]
): SidePot[] {
  
  const combinedPots: SidePot[] = [];
  
  // Pot principal (tous les joueurs éligibles)
  if (mainPot > 0) {
    combinedPots.push({
      amount: mainPot,
      eligiblePlayers: allPlayers,
      potId: `main_${Date.now()}`
    });
  }
  
  // Ajouter les side pots
  combinedPots.push(...sidePots);
  
  return combinedPots;
}

/**
 * Optimise les side pots en fusionnant ceux avec mêmes joueurs éligibles
 */
export function optimizeSidePots(sidePots: SidePot[]): SidePot[] {
  const optimized: SidePot[] = [];
  const processed = new Set<string>();
  
  for (const pot of sidePots) {
    if (processed.has(pot.potId)) continue;
    
    // Chercher d'autres pots avec les mêmes joueurs éligibles
    const eligibleKey = pot.eligiblePlayers.sort().join(',');
    const samePots = sidePots.filter(p => 
      !processed.has(p.potId) && 
      p.eligiblePlayers.sort().join(',') === eligibleKey
    );
    
    // Fusionner les pots identiques
    const combinedAmount = samePots.reduce((sum, p) => sum + p.amount, 0);
    
    optimized.push({
      amount: combinedAmount,
      eligiblePlayers: pot.eligiblePlayers,
      potId: `combined_${optimized.length}_${Date.now()}`
    });
    
    // Marquer comme traités
    samePots.forEach(p => processed.add(p.potId));
  }
  
  return optimized;
}

/**
 * Génère un rapport détaillé des side pots pour debug
 */
export function generateSidePotsReport(
  sidePots: SidePot[], 
  players: PlayerBetInfo[]
): string {
  let report = "=== SIDE POTS REPORT ===\n\n";
  
  report += "Players:\n";
  players.forEach(p => {
    report += `  ${p.userId}: bet=${p.currentBet}, allIn=${p.isAllIn}, folded=${p.isFolded}\n`;
  });
  
  report += "\nSide Pots:\n";
  sidePots.forEach((pot, index) => {
    report += `  Pot ${index + 1} (${pot.potId}):\n`;
    report += `    Amount: ${pot.amount}\n`;
    report += `    Eligible: [${pot.eligiblePlayers.join(', ')}]\n`;
  });
  
  const validation = validateSidePots(sidePots, players);
  report += `\nValidation: ${validation.isValid ? 'VALID' : 'INVALID'}\n`;
  if (!validation.isValid) {
    report += `Error: ${validation.error}\n`;
  }
  report += `Total: ${validation.totalAmount} / Expected: ${validation.expectedAmount}\n`;
  
  return report;
}