export type Preset = "turbo" | "standard" | "long" | "custom";

const PRESET_DURATIONS: Record<Exclude<Preset, "custom">, number> = {
  turbo: 5,
  standard: 10,
  long: 15,
};

export function getPresetLevelDuration(preset: Preset): number | null {
  if (preset === "custom") return null;
  return PRESET_DURATIONS[preset];
}

const RATIOS = [1, 1.5, 2.5, 4, 6, 10, 15, 25, 40, 60, 100, 150];

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  duration: number;
}

export function generateBlindStructure(
  startingStack: number,
  levelDurationMin: number,
): BlindLevel[] {
  const sb1Raw = Math.max(5, startingStack / 200);
  const sb1 = Math.max(5, Math.floor(sb1Raw / 5) * 5);

  const result: BlindLevel[] = [];
  for (let i = 0; i < RATIOS.length; i++) {
    const r = RATIOS[i];
    const sbRaw = sb1 * r;
    let sb = Math.max(5, Math.round(sbRaw / 5) * 5);
    // Ensure strict increase vs previous level
    if (i > 0 && sb <= result[i - 1].smallBlind) {
      sb = result[i - 1].smallBlind + 5;
    }
    result.push({
      level: i + 1,
      smallBlind: sb,
      bigBlind: 2 * sb,
      duration: levelDurationMin * 60_000,
    });
  }
  return result;
}
