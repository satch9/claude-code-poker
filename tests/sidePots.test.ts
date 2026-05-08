import { describe, it, expect } from "vitest";
import { calculateSidePots } from "../convex/utils/turnManager";

// calculateSidePots opère désormais sur la contribution TOTALE de chaque
// joueur sur la main (cumul de tous les rounds de mise + blinds), pas
// uniquement sur la mise du round courant. Le moteur lit ce total dans
// player.handContribution.

describe("calculateSidePots — invariants", () => {
  it("retourne [] quand tous les joueurs ont une contribution = 0", () => {
    expect(
      calculateSidePots([
        { userId: "a", contribution: 0, isFolded: false },
        { userId: "b", contribution: 0, isFolded: false },
      ]),
    ).toEqual([]);
  });

  it("heads-up sans tapis avec mises sur 3 streets : un seul pot du cumul", () => {
    // Préflop 20 + flop 34 + turn 70 + river 124 = 248 par joueur, pot 496.
    const result = calculateSidePots([
      { userId: "a", contribution: 248, isFolded: false },
      { userId: "b", contribution: 248, isFolded: false },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      amount: 496,
      eligiblePlayers: ["a", "b"],
    });
  });

  it("multi-way : 3 short stacks (178) + 1 gros stack (3466) → main pot stratifié + side pot pour le sur-stack", () => {
    // Reproduit le cas observé en partie réelle (4 joueurs, Eliott gros stack).
    const result = calculateSidePots([
      { userId: "satch9", contribution: 178, isFolded: false },
      { userId: "lena", contribution: 178, isFolded: false },
      { userId: "bea", contribution: 178, isFolded: false },
      { userId: "eliott", contribution: 3466, isFolded: false },
    ]);

    expect(result).toHaveLength(2);
    // Main pot : 4 × 178 = 712, tous éligibles
    expect(result[0]).toEqual({
      amount: 712,
      eligiblePlayers: ["satch9", "lena", "bea", "eliott"],
    });
    // Side pot : 1 × 3288, eligible Eliott seul
    expect(result[1]).toEqual({
      amount: 3288,
      eligiblePlayers: ["eliott"],
    });
  });

  it("deux paliers de tapis distincts (A 100 / B 500 / C 500)", () => {
    const result = calculateSidePots([
      { userId: "a", contribution: 100, isFolded: false },
      { userId: "b", contribution: 500, isFolded: false },
      { userId: "c", contribution: 500, isFolded: false },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      amount: 300, // 3 × 100
      eligiblePlayers: ["a", "b", "c"],
    });
    expect(result[1]).toEqual({
      amount: 800, // 2 × 400
      eligiblePlayers: ["b", "c"],
    });
  });

  it("inclut la contribution d'un joueur foldé dans le pot mais pas dans les éligibles", () => {
    // A mise 50 puis fold ; B et C vont au showdown à 1000 chacun.
    const result = calculateSidePots([
      { userId: "a", contribution: 50, isFolded: true },
      { userId: "b", contribution: 1000, isFolded: false },
      { userId: "c", contribution: 1000, isFolded: false },
    ]);

    // Couche 50 (3 contributeurs, 2 éligibles) + couche 950 (2 contributeurs / éligibles)
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      amount: 150, // 3 × 50, A folded donc exclus des éligibles
      eligiblePlayers: ["b", "c"],
    });
    expect(result[1]).toEqual({
      amount: 1900, // 2 × 950
      eligiblePlayers: ["b", "c"],
    });

    // Total = 150 + 1900 = 2050 = somme des contributions (50 + 1000 + 1000)
  });

  it("la somme des side pots est toujours égale à la somme des contributions", () => {
    const players = [
      { userId: "a", contribution: 100, isFolded: false },
      { userId: "b", contribution: 250, isFolded: true },
      { userId: "c", contribution: 600, isFolded: false },
      { userId: "d", contribution: 600, isFolded: false },
    ];
    const result = calculateSidePots(players);
    const totalPot = result.reduce((acc, p) => acc + p.amount, 0);
    const totalContrib = players.reduce((acc, p) => acc + p.contribution, 0);
    expect(totalPot).toBe(totalContrib);
  });
});
