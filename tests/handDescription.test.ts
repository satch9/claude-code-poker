import { describe, it, expect } from "vitest";
import { getHandDescription } from "../convex/utils/handEvaluator";
import type { EnhancedHandRank } from "../convex/utils/handEvaluator";

const card = (rank: string, suit = "hearts") =>
  ({ rank, suit }) as { rank: string; suit: string };

const buildHand = (overrides: Partial<EnhancedHandRank>): EnhancedHandRank => ({
  rank: 0,
  name: "High Card",
  cards: [],
  description: "",
  rawRank: 0,
  kickers: [],
  score: 0,
  ...overrides,
});

describe("getHandDescription", () => {
  it("formate une paire avec son rang et le kicker dominant", () => {
    const hand = buildHand({
      name: "Pair",
      cards: [card("7"), card("7", "diamonds")],
      kickers: [card("A"), card("K"), card("Q")],
    });

    const desc = getHandDescription(hand);
    expect(desc).toContain("Paire de 7");
    expect(desc).toMatch(/kicker.*A/i);
  });

  it("formate deux paires avec le kicker dominant", () => {
    const hand = buildHand({
      name: "Two Pair",
      cards: [card("K"), card("K", "diamonds"), card("7"), card("7", "diamonds")],
      kickers: [card("A"), card("9"), card("3")],
    });

    const desc = getHandDescription(hand);
    expect(desc).toContain("Deux paires K et 7");
    expect(desc).toMatch(/kicker.*A/i);
  });

  it("formate la carte haute avec ses kickers", () => {
    const hand = buildHand({
      name: "High Card",
      cards: [card("A")],
      kickers: [card("K"), card("Q"), card("J"), card("9")],
    });

    const desc = getHandDescription(hand);
    expect(desc).toContain("Carte haute A");
    expect(desc).toMatch(/kicker.*K/i);
  });

  it("ne sur-pollue pas les mains où les kickers ne départagent pas (Full)", () => {
    const hand = buildHand({
      name: "Full House",
      cards: [card("7"), card("7", "diamonds"), card("7", "clubs"), card("K"), card("K", "diamonds")],
      kickers: [],
    });

    const desc = getHandDescription(hand);
    expect(desc).toBe("Full 7 par K");
    expect(desc).not.toMatch(/kicker/i);
  });

  it("formate un brelan en intégrant le kicker", () => {
    const hand = buildHand({
      name: "Three of a Kind",
      cards: [card("7"), card("7", "diamonds"), card("7", "clubs")],
      kickers: [card("A"), card("9")],
    });

    const desc = getHandDescription(hand);
    expect(desc).toContain("Brelan de 7");
    expect(desc).toMatch(/kicker.*A/i);
  });
});
