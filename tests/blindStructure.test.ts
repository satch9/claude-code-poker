import { describe, it, expect } from "vitest";
import { generateBlindStructure, getPresetLevelDuration, type Preset } from "../convex/utils/blindStructure.js";

describe("generateBlindStructure", () => {
  it("génère 12 niveaux progressifs", () => {
    const s = generateBlindStructure(1500, 10);
    expect(s).toHaveLength(12);
    expect(s[0].level).toBe(1);
    expect(s[11].level).toBe(12);
  });

  it("niveau 1 a une SB raisonnable (~startingStack/200)", () => {
    const s = generateBlindStructure(1500, 10);
    expect(s[0].smallBlind).toBe(5);
    expect(s[0].bigBlind).toBe(10);
  });

  it("BB = 2 * SB à chaque niveau", () => {
    const s = generateBlindStructure(1500, 10);
    for (const lvl of s) {
      expect(lvl.bigBlind).toBe(2 * lvl.smallBlind);
    }
  });

  it("blindes strictement croissantes", () => {
    const s = generateBlindStructure(1500, 10);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].smallBlind).toBeGreaterThan(s[i - 1].smallBlind);
    }
  });

  it("duration en ms (levelDurationMin * 60_000)", () => {
    const s = generateBlindStructure(1500, 10);
    expect(s[0].duration).toBe(600_000);
    const s5 = generateBlindStructure(1500, 5);
    expect(s5[0].duration).toBe(300_000);
  });

  it("preset levelDuration mapping", () => {
    expect(getPresetLevelDuration("turbo" as Preset)).toBe(5);
    expect(getPresetLevelDuration("standard" as Preset)).toBe(10);
    expect(getPresetLevelDuration("long" as Preset)).toBe(15);
    expect(getPresetLevelDuration("custom" as Preset)).toBeNull();
  });
});
