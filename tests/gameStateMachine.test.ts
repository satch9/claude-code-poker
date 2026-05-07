import { describe, it, expect } from "vitest";
import {
  evaluateGameConditions,
  getNextPhase,
  type PlayerState,
} from "../convex/utils/gameStateMachine";

// Reproductible bug: heads-up post-flop, joueur A fait tapis,
// joueur B n'a pas encore eu l'occasion d'agir → le moteur déclare
// "all_players_all_in" et auto-advance les phases sans attendre B.
//
// Cf. log de partie analysé le 2026-05-07 :
//   21:37:10 Satch9 fait tapis pour 940 jetons
//   21:37:10 Système Phase: Turn   ← même seconde, Bea jamais sollicitée
//   21:37:13 Système Phase: River
//   21:37:19 Showdown : Bea Pair, Satch9 Brelan J → Satch9 gagne 980

describe("evaluateGameConditions — heads-up tapis sur le flop", () => {
  // Reproduction du scénario observé. Reset hasActed/currentBet au flop.
  const headsUpFlopAfterAllIn = (): PlayerState[] => [
    {
      // SB qui n'a pas encore agi sur le flop
      chips: 1020,
      currentBet: 0,
      hasActed: false,
      isFolded: false,
      isAllIn: false,
      seatPosition: 0,
    },
    {
      // BB qui vient de faire tapis
      chips: 0,
      currentBet: 940,
      hasActed: true,
      isFolded: false,
      isAllIn: true,
      lastAction: "all-in",
      seatPosition: 1,
    },
  ];

  it("ne doit PAS déclarer tous all-in tant que l'adversaire n'a pas eu l'occasion d'agir", () => {
    const players = headsUpFlopAfterAllIn();
    const conds = evaluateGameConditions(players, 940, 1);

    expect(conds.allPlayersAllIn).toBe(false);
  });

  it("ne doit PAS déclarer betting_complete tant que l'adversaire n'a pas eu l'occasion d'agir", () => {
    const players = headsUpFlopAfterAllIn();
    const conds = evaluateGameConditions(players, 940, 1);

    expect(conds.bettingComplete).toBe(false);
  });

  it("ne doit PAS retourner de transition de phase tant que l'adversaire n'a pas répondu", () => {
    const players = headsUpFlopAfterAllIn();
    const conds = evaluateGameConditions(players, 940, 1);
    const next = getNextPhase("flop", conds);

    expect(next).toBeNull();
  });

  it("après que l'adversaire a payé l'all-in, betting_complete devient true et auto-advance déclenche", () => {
    const players: PlayerState[] = [
      {
        chips: 80, // 1020 - 940
        currentBet: 940,
        hasActed: true,
        isFolded: false,
        isAllIn: false,
        lastAction: "call",
        seatPosition: 0,
      },
      {
        chips: 0,
        currentBet: 940,
        hasActed: true,
        isFolded: false,
        isAllIn: true,
        lastAction: "all-in",
        seatPosition: 1,
      },
    ];
    const conds = evaluateGameConditions(players, 940, 1);

    // Bea a payé : il ne reste qu'un non-all-in mais il a hasActed et matché.
    // Maintenant le moteur peut auto-dérouler.
    expect(conds.bettingComplete).toBe(true);
    const next = getNextPhase("flop", conds);
    expect(next).not.toBeNull();
    expect(next?.nextPhase).toBe("turn");
  });

  it("après que l'adversaire s'est couché, onlyOnePlayerLeft prend le relais", () => {
    const players: PlayerState[] = [
      {
        chips: 1020,
        currentBet: 0,
        hasActed: true,
        isFolded: true,
        isAllIn: false,
        lastAction: "fold",
        seatPosition: 0,
      },
      {
        chips: 0,
        currentBet: 940,
        hasActed: true,
        isFolded: false,
        isAllIn: true,
        lastAction: "all-in",
        seatPosition: 1,
      },
    ];
    const conds = evaluateGameConditions(players, 940, 1);

    expect(conds.onlyOnePlayerLeft).toBe(true);
    expect(conds.bettingComplete).toBe(true);
  });
});
