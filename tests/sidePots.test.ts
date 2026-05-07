import { describe, it, expect } from "vitest";
import { calculateSidePots } from "../convex/utils/turnManager";

// Régression : calculateSidePots lit player.currentBet (la mise du round
// courant) comme si c'était la contribution totale du joueur à la main.
// Si on l'appelle au showdown sans avoir reset les bets, on n'obtient que
// le pot du dernier round et on perd les rounds antérieurs.
//
// Cas observé en partie réelle (hand 22:03:13 → 22:04:33) :
//   - Pré : 40
//   - Flop : 34 each → 68
//   - Turn : 70 each → 140
//   - River : 124 each → 248
//   - gameState.pot cumulatif = 496
//   - calculateSidePots avec cb=124 each → [{ amount: 248 }]
//   - Pot affiché : 248 (différence de 248 jetons disparaît)
//
// Le fix au niveau du moteur : reset des player.currentBet à l'entrée du
// showdown (comme dans toutes les autres transitions de phase). Le fallback
// ligne 1029 utilise alors gameState.pot.

describe("calculateSidePots — invariants", () => {
  it("avec deux joueurs alignés et currentBet > 0, retourne uniquement le round courant", () => {
    const result = calculateSidePots([
      { userId: "a", currentBet: 124, isAllIn: false, isFolded: false },
      { userId: "b", currentBet: 124, isAllIn: false, isFolded: false },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(248);
    // Documente l'hypothèse implicite : ce sidePot ne représente PAS le total
    // de la main. Le moteur doit reset les bets et utiliser gameState.pot
    // (fallback) pour obtenir le pot cumulé.
  });

  it("avec deux joueurs et currentBet = 0, retourne [] (déclenche le fallback gameState.pot)", () => {
    const result = calculateSidePots([
      { userId: "a", currentBet: 0, isAllIn: false, isFolded: false },
      { userId: "b", currentBet: 0, isAllIn: false, isFolded: false },
    ]);

    expect(result).toEqual([]);
  });

  it("retourne [] quand tous les joueurs encore actifs ont currentBet = 0", () => {
    const result = calculateSidePots([
      { userId: "a", currentBet: 0, isAllIn: false, isFolded: false },
      { userId: "b", currentBet: 0, isAllIn: false, isFolded: false },
      { userId: "c", currentBet: 0, isAllIn: false, isFolded: true },
    ]);

    expect(result).toEqual([]);
  });

  it("calcule des side pots stratifiés avec un all-in partiel sur le même round", () => {
    // A est all-in pour 100, B et C continuent à 200 chacun.
    const result = calculateSidePots([
      { userId: "a", currentBet: 100, isAllIn: true, isFolded: false },
      { userId: "b", currentBet: 200, isAllIn: false, isFolded: false },
      { userId: "c", currentBet: 200, isAllIn: false, isFolded: false },
    ]);

    expect(result).toHaveLength(2);
    // Main pot : 3 joueurs × 100 = 300, éligibles A/B/C
    expect(result[0]).toEqual({
      amount: 300,
      eligiblePlayers: ["a", "b", "c"],
    });
    // Side pot : 2 joueurs × 100 = 200, éligibles B/C
    expect(result[1]).toEqual({
      amount: 200,
      eligiblePlayers: ["b", "c"],
    });
  });
});
