export interface PrizeRow {
  position: number;
  percentage: number;
}

export function computePrizeStructure(nbPlayers: number): PrizeRow[] {
  // 2 joueurs (heads-up) : winner takes all
  if (nbPlayers <= 2) {
    return [{ position: 1, percentage: 100 }];
  }
  // 3-6 joueurs : top 2 payés (70 / 30)
  if (nbPlayers <= 6) {
    return [
      { position: 1, percentage: 70 },
      { position: 2, percentage: 30 },
    ];
  }
  // 7+ joueurs : top 3 payés (50 / 30 / 20)
  return [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ];
}
