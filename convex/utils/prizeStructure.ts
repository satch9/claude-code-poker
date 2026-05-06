export interface PrizeRow {
  position: number;
  percentage: number;
}

export function computePrizeStructure(nbPlayers: number): PrizeRow[] {
  if (nbPlayers <= 4) {
    return [{ position: 1, percentage: 100 }];
  }
  if (nbPlayers <= 7) {
    return [
      { position: 1, percentage: 70 },
      { position: 2, percentage: 30 },
    ];
  }
  return [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ];
}
