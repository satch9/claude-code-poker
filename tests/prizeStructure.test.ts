import { describe, it, expect } from "vitest";
import { computePrizeStructure } from "../convex/utils/prizeStructure.js";

describe("computePrizeStructure", () => {
  it("2 joueurs : winner takes all", () => {
    expect(computePrizeStructure(2)).toEqual([{ position: 1, percentage: 100 }]);
  });
  it("4 joueurs : winner takes all", () => {
    expect(computePrizeStructure(4)).toEqual([{ position: 1, percentage: 100 }]);
  });
  it("5 joueurs : 70/30", () => {
    expect(computePrizeStructure(5)).toEqual([
      { position: 1, percentage: 70 },
      { position: 2, percentage: 30 },
    ]);
  });
  it("7 joueurs : 70/30", () => {
    expect(computePrizeStructure(7)).toEqual([
      { position: 1, percentage: 70 },
      { position: 2, percentage: 30 },
    ]);
  });
  it("8 joueurs : 50/30/20", () => {
    expect(computePrizeStructure(8)).toEqual([
      { position: 1, percentage: 50 },
      { position: 2, percentage: 30 },
      { position: 3, percentage: 20 },
    ]);
  });
  it("9 joueurs : 50/30/20", () => {
    expect(computePrizeStructure(9)).toEqual([
      { position: 1, percentage: 50 },
      { position: 2, percentage: 30 },
      { position: 3, percentage: 20 },
    ]);
  });
  it("Total = 100% pour chaque taille", () => {
    for (const n of [2, 4, 5, 7, 8, 9]) {
      const total = computePrizeStructure(n).reduce((s, p) => s + p.percentage, 0);
      expect(total).toBe(100);
    }
  });
});
