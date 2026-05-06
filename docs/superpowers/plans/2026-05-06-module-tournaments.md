# Module Tournaments (SNG) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le module Sit-and-Go (SNG single-table 2-9 joueurs) avec blindes auto progressives, prize pool top-N, élimination soft, ranking final.

**Architecture:** Greffe sur le moteur cash game existant via la branche `gameType === "tournament"`. Le schéma `modules.tournament` (déjà présent mais non alimenté) est complété par `status`/`startedAt`/`finalRanking`. Élimination soft : joueurs à 0 chips restent assis avec `eliminatedAt`/`tournamentRank` mais ne reçoivent plus de cartes. Timer auto sans pause, montée de niveau au démarrage de main suivante.

**Tech Stack:** Convex 1.37, React 18, TypeScript 6, Vitest 4.

**Spec source:** `docs/superpowers/specs/2026-05-06-module-tournaments-design.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `convex/schema.ts` | Ajout `players.eliminatedAt`/`tournamentRank` + `modules.tournament.{status,startedAt,finishedAt,finalRanking}` | Modify |
| `convex/utils/blindStructure.ts` | `generateBlindStructure(startingStack, levelDurationMin)` + 3 presets | Create |
| `convex/utils/prizeStructure.ts` | `computePrizeStructure(nbPlayers)` | Create |
| `tests/blindStructure.test.ts` | Tests unit du generator | Create |
| `tests/prizeStructure.test.ts` | Tests unit prize | Create |
| `convex/tables.ts` | `createTable` : init `modules.tournament` si gameType="tournament" + validation Zod | Modify |
| `convex/shared/validation.ts` | Ajouter `preset`, `levelDurationMin`, `startingStack` au schéma `createTableSchema` | Modify |
| `convex/core/gameEngine.ts` | `startGame`, `startNextHand`, `prepareNextHand`, `endHand`, helper `endTournament` | Modify |
| `src/core/components/Lobby/CreateTableForm.tsx` | Radio + dropdowns tournoi | Modify |
| `src/core/components/Game/TournamentInfo.tsx` | Bandeau timer + niveau + prize + joueurs restants | Create |
| `src/core/components/Game/PokerTable.tsx` | Render `<TournamentInfo>` si tournoi | Modify |
| `src/core/components/Game/ShowdownResults.tsx` | Affichage `finalRanking` si tournoi terminé | Modify |

---

## Pré-requis

- [ ] **Repo clean** : `git status` "nothing to commit"
- [ ] **Convex dev OK** : `npx convex dev --once` retourne ready
- [ ] **Baseline tests** : `npx vitest run tests/security-c1.test.ts` retourne 13/15 (baseline post-1.C/C4/C5)

---

### Task 1 : Schéma — ajouter champs tournoi

**Files:**
- Modify: `convex/schema.ts` (table `tables.modules.tournament` + table `players`)

- [ ] **Step 1 : Lire le schema actuel**

```bash
grep -n "tournament\|players: defineTable" convex/schema.ts
```

Repérer le bloc `modules.tournament` (lignes ~47-60) et `players` (lignes ~71-91).

- [ ] **Step 2 : Étendre `modules.tournament` dans `convex/schema.ts`**

Ajouter dans l'objet `tournament` (qui est déjà `v.optional(v.object({...}))`) :

```typescript
tournament: v.optional(v.object({
  blindStructure: v.array(v.object({
    level: v.number(),
    smallBlind: v.number(),
    bigBlind: v.number(),
    duration: v.number(),
  })),
  currentBlindLevel: v.number(),
  nextBlindIncrease: v.number(),
  prizeStructure: v.array(v.object({
    position: v.number(),
    percentage: v.number(),
  })),
  // Nouveaux champs :
  status: v.optional(v.union(
    v.literal("registering"),
    v.literal("running"),
    v.literal("finished"),
  )),
  startedAt: v.optional(v.number()),
  finishedAt: v.optional(v.number()),
  finalRanking: v.optional(v.array(v.object({
    userId: v.id("users"),
    position: v.number(),
    prize: v.number(),
  }))),
})),
```

- [ ] **Step 3 : Étendre `players` dans `convex/schema.ts`**

Ajouter dans la définition `players: defineTable({ ... })`, à côté des champs existants :

```typescript
players: defineTable({
  // ... champs existants
  eliminatedAt: v.optional(v.number()),
  tournamentRank: v.optional(v.number()),
}).index("by_table", ["tableId"]).index("by_user", ["userId"]).index("by_table_seat", ["tableId", "seatPosition"]),
```

(Adapter aux indexes existants — ne pas dupliquer.)

- [ ] **Step 4 : Push convex et typecheck**

```bash
cd /var/www/vincent/claude-code-poker
npx convex dev --once
npm run typecheck
```

Expected : `Convex functions ready!` + typecheck exit 0. Tous les nouveaux champs étant `v.optional`, pas de migration cassante.

- [ ] **Step 5 : Tests baseline**

```bash
npx vitest run tests/security-c1.test.ts
```

Doit retourner 13/15 (baseline).

- [ ] **Step 6 : Commit**

```bash
git add convex/schema.ts convex/_generated/
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(schema): champs tournoi sur players + modules.tournament

- players : eliminatedAt, tournamentRank (optional)
- modules.tournament : status, startedAt, finishedAt, finalRanking (optional)
- Pas de migration cassante (v.optional partout)

Préparation module Tournaments SNG.
EOF
)"
```

---

### Task 2 : `convex/utils/blindStructure.ts` + tests

**Files:**
- Create: `convex/utils/blindStructure.ts`
- Create: `tests/blindStructure.test.ts`

- [ ] **Step 1 : Créer le test rouge**

```typescript
// tests/blindStructure.test.ts
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
```

- [ ] **Step 2 : Run, expect FAIL**

```bash
npx vitest run tests/blindStructure.test.ts
```

Expected : "Cannot find module" — fichier source pas encore créé.

- [ ] **Step 3 : Créer `convex/utils/blindStructure.ts`**

```typescript
// convex/utils/blindStructure.ts
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
  duration: number; // ms
}

export function generateBlindStructure(
  startingStack: number,
  levelDurationMin: number,
): BlindLevel[] {
  // SB de base : startingStack/200, arrondi au multiple de 5 supérieur, min 5
  const sb1Raw = Math.max(5, startingStack / 200);
  const sb1 = Math.max(5, Math.ceil(sb1Raw / 5) * 5);

  return RATIOS.map((r, i) => {
    const sbRaw = sb1 * r;
    const sb = Math.max(5, Math.round(sbRaw / 5) * 5);
    return {
      level: i + 1,
      smallBlind: sb,
      bigBlind: 2 * sb,
      duration: levelDurationMin * 60_000,
    };
  });
}
```

- [ ] **Step 4 : Run, expect PASS**

```bash
npx vitest run tests/blindStructure.test.ts
```

Expected : 6 tests passed.

⚠️ Si le test "blindes strictement croissantes" échoue à cause de l'arrondi (deux ratios proches qui mappent au même multiple de 5), ajuster en gardant un step minimum de +5 entre niveaux successifs :

```typescript
return RATIOS.map((r, i) => { ... }).reduce((acc, lvl, i) => {
  if (i > 0 && lvl.smallBlind <= acc[i - 1].smallBlind) {
    lvl.smallBlind = acc[i - 1].smallBlind + 5;
    lvl.bigBlind = 2 * lvl.smallBlind;
  }
  acc.push(lvl);
  return acc;
}, [] as BlindLevel[]);
```

- [ ] **Step 5 : typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6 : Commit**

```bash
git add convex/utils/blindStructure.ts tests/blindStructure.test.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(tournaments): generator blindStructure (3 presets + custom)

- Turbo (5min/level), Standard (10min/level), Long (15min/level), Custom
- 12 niveaux progressifs, ratio approximatif 1.5x
- SB = startingStack/200 arrondi à 5, BB = 2*SB
- Tests unit : 6 cas couverts
EOF
)"
```

---

### Task 3 : `convex/utils/prizeStructure.ts` + tests

**Files:**
- Create: `convex/utils/prizeStructure.ts`
- Create: `tests/prizeStructure.test.ts`

- [ ] **Step 1 : Créer le test**

```typescript
// tests/prizeStructure.test.ts
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
```

- [ ] **Step 2 : Run, expect FAIL**

```bash
npx vitest run tests/prizeStructure.test.ts
```

- [ ] **Step 3 : Créer `convex/utils/prizeStructure.ts`**

```typescript
// convex/utils/prizeStructure.ts
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
```

- [ ] **Step 4 : Run, expect PASS**

```bash
npx vitest run tests/prizeStructure.test.ts
```

7 tests passed.

- [ ] **Step 5 : Commit**

```bash
git add convex/utils/prizeStructure.ts tests/prizeStructure.test.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(tournaments): computePrizeStructure top-N auto

- 2-4 joueurs : winner takes all (100%)
- 5-7 joueurs : 70/30
- 8-9 joueurs : 50/30/20
- Tests unit : 7 cas couverts
EOF
)"
```

---

### Task 4 : `createTable` init module tournament + validation

**Files:**
- Modify: `convex/shared/validation.ts` (ajouter `preset`, `levelDurationMin`, `startingStack` au schéma createTable)
- Modify: `convex/tables.ts` (mutation `createTable`)

- [ ] **Step 1 : Lire `convex/shared/validation.ts:createTableSchema`**

```bash
grep -n "createTableSchema\|gameType\|startingStack" convex/shared/validation.ts
```

- [ ] **Step 2 : Étendre `createTableSchema`**

Ajouter dans le schéma Zod :

```typescript
export const createTableSchema = z.object({
  // ... champs existants (name, smallBlind, bigBlind, maxPlayers, etc.)
  gameType: z.enum(["cash", "tournament"]),
  // Nouveaux champs (optionnels — utilisés uniquement si gameType=tournament) :
  preset: z.enum(["turbo", "standard", "long", "custom"]).optional(),
  levelDurationMin: z.number().int().min(5).max(60).optional(),
  startingStack: z.number().int().min(100).max(100_000),
});
```

⚠️ `startingStack` doit déjà exister — l'augmenter de validation si pas déjà.

- [ ] **Step 3 : Modifier `createTable` dans `convex/tables.ts`**

Lire la mutation actuelle. Repérer où le doc `tables` est inséré. Ajouter avant l'insert :

```typescript
import { generateBlindStructure, getPresetLevelDuration } from "./utils/blindStructure";
import { computePrizeStructure } from "./utils/prizeStructure";

// Dans le handler, avant ctx.db.insert("tables", { ... }) :

let modules: any = undefined;
let initialSmallBlind = args.smallBlind;
let initialBigBlind = args.bigBlind;

if (args.gameType === "tournament") {
  // levelDurationMin : preset si fourni, sinon args.levelDurationMin direct
  const fromPreset = args.preset ? getPresetLevelDuration(args.preset) : null;
  const levelDurationMin = fromPreset ?? args.levelDurationMin ?? 10;

  const blindStructure = generateBlindStructure(args.startingStack, levelDurationMin);
  const prizeStructure = computePrizeStructure(args.maxPlayers);

  initialSmallBlind = blindStructure[0].smallBlind;
  initialBigBlind = blindStructure[0].bigBlind;

  modules = {
    tournament: {
      blindStructure,
      currentBlindLevel: 0,
      nextBlindIncrease: 0,
      prizeStructure,
      status: "registering",
      startedAt: 0,
    },
  };
}

const tableId = await ctx.db.insert("tables", {
  // ... champs existants, en utilisant initialSmallBlind/initialBigBlind à la place
  // de args.smallBlind/args.bigBlind si tournament a override.
  smallBlind: initialSmallBlind,
  bigBlind: initialBigBlind,
  modules,
  // ...
});
```

⚠️ Adapter à la structure exacte du `ctx.db.insert("tables", { ... })` existant. Conserver tous les champs existants (creatorId, isPrivate, status, playerCount: 0, etc.).

- [ ] **Step 4 : typecheck + push convex**

```bash
npm run typecheck
npx convex dev --once
```

- [ ] **Step 5 : Test smoke ad-hoc**

Créer un tournoi via la console Convex (ou via le harness `tests/lib/auth-test.ts` à étendre) et inspecter qu'on a bien `modules.tournament.blindStructure` avec 12 niveaux.

```bash
# Optionnel : test manuel si l'env le permet
npx convex run tables:createTable '{"name":"test-trnmt","maxPlayers":4,"smallBlind":5,"bigBlind":10,"startingStack":1500,"isPrivate":false,"gameType":"tournament","preset":"standard"}'
```

(Cette commande peut échouer car la mutation requiert auth — c'est OK, on vérifiera côté smoke en Task 8.)

- [ ] **Step 6 : Tests sécu**

```bash
npx vitest run tests/security-c1.test.ts
```

Baseline 13/15 maintenu.

- [ ] **Step 7 : Commit**

```bash
git add convex/tables.ts convex/shared/validation.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(tournaments): init module tournament dans createTable

- Validation Zod : preset, levelDurationMin, startingStack
- Si gameType=tournament : génération blindStructure + prizeStructure
- Init modules.tournament avec status="registering"
- Niveau 1 des blindes appliqué directement sur table.smallBlind/bigBlind
EOF
)"
```

---

### Task 5 : `startGame` lance le tournoi

**Files:**
- Modify: `convex/core/gameEngine.ts:startGameInternal`

- [ ] **Step 1 : Lire `startGameInternal`** (autour de la ligne 74)

Identifier où le `ctx.db.patch` met à jour le `gameState` initial.

- [ ] **Step 2 : Ajouter la branche tournoi**

Après les opérations existantes de `startGameInternal`, AVANT le `return { success: true, ... }` :

```typescript
// Si tournoi : passer en status "running" et initialiser le timer du niveau 1
if (table.gameType === "tournament" && table.modules?.tournament) {
  const now = Date.now();
  const tournament = table.modules.tournament;
  const blindLvl = tournament.blindStructure[tournament.currentBlindLevel ?? 0];
  await ctx.db.patch(tableId, {
    modules: {
      ...table.modules,
      tournament: {
        ...tournament,
        status: "running",
        startedAt: tournament.startedAt && tournament.startedAt > 0 ? tournament.startedAt : now,
        nextBlindIncrease: now + blindLvl.duration,
      },
    },
  });
  await addActionToFeed(ctx, tableId, {
    playerName: "Système",
    action: "system",
    message: `Tournoi démarré · Niveau 1 : SB ${blindLvl.smallBlind} / BB ${blindLvl.bigBlind}`,
    isSystem: true,
  });
}
```

- [ ] **Step 3 : typecheck + push**

```bash
npm run typecheck
npx convex dev --once
```

- [ ] **Step 4 : Tests sécu**

```bash
npx vitest run tests/security-c1.test.ts
```

- [ ] **Step 5 : Commit**

```bash
git add convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(tournaments): démarrage tournoi (status running + timer)

- startGame branche tournoi : status registering → running
- nextBlindIncrease = now + duration[level=0]
- Action feed : annonce niveau 1
EOF
)"
```

---

### Task 6 : Montée auto des blindes

**Files:**
- Modify: `convex/core/gameEngine.ts:startNextHandInternal` (autour de la ligne 1465)

- [ ] **Step 1 : Lire `startNextHandInternal`**

Identifier le début du flow. Ajouter la logique de montée AVANT que la nouvelle main ne distribue les cartes (idéalement en début).

- [ ] **Step 2 : Ajouter le check timer**

Au début de `startNextHandInternal(ctx, tableId)` :

```typescript
const table = await ctx.db.get(tableId);
if (!table) return;

// Tournoi : montée de niveau si timer expiré
if (table.gameType === "tournament" && table.modules?.tournament) {
  const tournament = table.modules.tournament;
  const now = Date.now();
  if (
    tournament.status === "running" &&
    tournament.nextBlindIncrease > 0 &&
    now >= tournament.nextBlindIncrease &&
    (tournament.currentBlindLevel ?? 0) < tournament.blindStructure.length - 1
  ) {
    const newLevelIdx = (tournament.currentBlindLevel ?? 0) + 1;
    const newLevel = tournament.blindStructure[newLevelIdx];
    await ctx.db.patch(tableId, {
      smallBlind: newLevel.smallBlind,
      bigBlind: newLevel.bigBlind,
      modules: {
        ...table.modules,
        tournament: {
          ...tournament,
          currentBlindLevel: newLevelIdx,
          nextBlindIncrease: now + newLevel.duration,
        },
      },
    });
    await addActionToFeed(ctx, tableId, {
      playerName: "Système",
      action: "system",
      message: `Niveau ${newLevel.level} : SB ${newLevel.smallBlind} / BB ${newLevel.bigBlind}`,
      isSystem: true,
    });
  }
}
```

⚠️ Si `currentBlindLevel` est déjà au dernier index, ne pas monter (clamp).

- [ ] **Step 3 : typecheck + push**

```bash
npm run typecheck
npx convex dev --once
```

- [ ] **Step 4 : Tests sécu**

```bash
npx vitest run tests/security-c1.test.ts
```

- [ ] **Step 5 : Commit**

```bash
git add convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(tournaments): montée auto des blindes au démarrage de main

- startNextHand check Date.now() >= nextBlindIncrease
- Si oui et pas dernier niveau : currentBlindLevel++, patch SB/BB,
  recalcul nextBlindIncrease
- Action feed : annonce niveau N
- Lock A2 : montée au démarrage de la main suivante (pas en cours)
EOF
)"
```

---

### Task 7 : Élimination soft + endTournament

**Files:**
- Modify: `convex/core/gameEngine.ts` (`prepareNextHand`, `endHand`, nouveau helper `endTournament`)

- [ ] **Step 1 : Lire `prepareNextHand` et `endHand`**

`prepareNextHand` autour ligne 1075, `endHand` autour ligne 1038.

- [ ] **Step 2 : Marquage des éliminés dans `prepareNextHand`**

Au début de `prepareNextHand(ctx, tableId)`, après avoir récupéré `table` et `players`, ajouter :

```typescript
// Tournoi : marquer les nouveaux éliminés (chips=0 et pas encore eliminatedAt)
if (table.gameType === "tournament") {
  const now = Date.now();
  const stillIn = players.filter(
    (p: any) => !p.eliminatedAt && p.chips > 0
  ).length;
  let rankCounter = stillIn; // les éliminés à cette main prennent les positions stillIn..
  for (const player of players) {
    if (!player.eliminatedAt && player.chips === 0) {
      await ctx.db.patch(player._id, {
        eliminatedAt: now,
        tournamentRank: rankCounter,
      });
      rankCounter--;
    }
  }
}
```

⚠️ La logique du rank : si 5 joueurs étaient encore vivants et 2 tombent simultanément (multi all-in), ils prennent rank 5 et 4 (le moins éliminé reçoit rank 5 = 5è place, l'autre rank 4 = 4è place). Distinguer les deux : trier par `currentBet` desc (moins de chips engagés en début de main = tombe en premier rank N, plus engagés = rank N-1). Pour MVP simple : on les classe dans l'ordre du `players` array (déterministe sur la même requête).

- [ ] **Step 3 : Filtrer les éliminés des actifs (distribution cartes)**

Dans `startGameInternal` (Task 1 zone), modifier la collection des `players` pour exclure les éliminés AVANT distribution des cartes :

```typescript
const players = await ctx.db
  .query("players")
  .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
  .collect();

// Tournoi : exclure les éliminés (chips=0 + eliminatedAt) du flow de la main
const activePlayers = players.filter((p: any) => !p.eliminatedAt && p.chips > 0);

if (activePlayers.length < 2) {
  // 1 seul joueur restant ou aucun → fin tournoi à gérer en aval
  return { success: false, reason: "not enough active players" };
}

// Utiliser activePlayers pour la distribution cartes, blindes, ordre
// Au lieu de players.map(...) → activePlayers.map(...)
```

⚠️ Adapter en gardant `players` pour les patchs globaux (resetPlayersForNewRound) si ils touchent tous les joueurs (y compris les éliminés pour reset visuels). Mais la distribution cartes / post blinds / actions se fait sur `activePlayers`.

- [ ] **Step 4 : Helper `endTournament`**

Ajouter dans `convex/core/gameEngine.ts` (avant le `export { endHand, ... }` final) :

```typescript
async function endTournament(ctx: any, tableId: string) {
  const table = await ctx.db.get(tableId);
  if (!table || table.gameType !== "tournament" || !table.modules?.tournament) return;

  const players = await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .collect();

  // Le winner est le seul avec chips > 0
  const winner = players.find((p: any) => p.chips > 0);
  if (!winner) return;
  if (!winner.tournamentRank) {
    await ctx.db.patch(winner._id, { tournamentRank: 1 });
  }

  const tournament = table.modules.tournament;
  const totalPot = (table.maxPlayers ?? players.length) * (table.buyIn ?? 0);

  // Construire finalRanking : tous les joueurs triés par rank ascending
  const allPlayers = [
    ...(winner.tournamentRank ? [winner] : [{ ...winner, tournamentRank: 1 }]),
    ...players.filter((p: any) => p.eliminatedAt && p.tournamentRank),
  ];
  // Dédupliquer (winner peut apparaître deux fois si déjà patched)
  const seen = new Set<string>();
  const unique = allPlayers.filter((p) => {
    if (seen.has(p._id)) return false;
    seen.add(p._id);
    return true;
  });
  unique.sort((a, b) => (a.tournamentRank ?? 0) - (b.tournamentRank ?? 0));

  const finalRanking = unique.map((p) => {
    const prizeRow = tournament.prizeStructure.find(
      (pz: any) => pz.position === p.tournamentRank
    );
    const prize = prizeRow ? Math.floor(totalPot * prizeRow.percentage / 100) : 0;
    return {
      userId: p.userId,
      position: p.tournamentRank ?? 0,
      prize,
    };
  });

  const now = Date.now();
  await ctx.db.patch(tableId, {
    status: "finished",
    modules: {
      ...table.modules,
      tournament: {
        ...tournament,
        status: "finished",
        finishedAt: now,
        finalRanking,
      },
    },
  });

  const winnerUser = await ctx.db.get(winner.userId);
  await addActionToFeed(ctx, tableId, {
    playerName: "Système",
    action: "system",
    message: `Tournoi terminé · Vainqueur : ${winnerUser?.name ?? "Joueur"}`,
    isSystem: true,
  });
}
```

- [ ] **Step 5 : Hook dans `endHand`**

À la fin de `endHand(ctx, tableId)`, AVANT le scheduler de la main suivante (au moment où on sait si la table doit continuer ou non) :

```typescript
// Tournoi : si plus qu'un joueur a des chips, c'est terminé
const players = await ctx.db
  .query("players")
  .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
  .collect();
const playersWithChips = players.filter((p: any) => p.chips > 0);
if (table.gameType === "tournament" && playersWithChips.length <= 1) {
  await endTournament(ctx, tableId);
  return; // ne pas schedule la main suivante
}
```

⚠️ Adapter au flow exact de `endHand` (peut-être déjà un `prepareNextHand` + scheduler ; insérer le check au bon endroit).

- [ ] **Step 6 : typecheck + push**

```bash
npm run typecheck
npx convex dev --once
```

- [ ] **Step 7 : Tests sécu**

```bash
npx vitest run tests/security-c1.test.ts
```

- [ ] **Step 8 : Commit**

```bash
git add convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(tournaments): élimination soft + endTournament + finalRanking

- prepareNextHand marque eliminatedAt + tournamentRank pour chips=0
- startGameInternal exclut les éliminés de la distribution cartes
- endHand : si playersWithChips <= 1 → endTournament
- endTournament : construit finalRanking (rank + prize), status=finished
EOF
)"
```

---

### Task 8 : Frontend — formulaire, TournamentInfo, ranking final

**Files:**
- Modify: `src/core/components/Lobby/CreateTableForm.tsx`
- Create: `src/core/components/Game/TournamentInfo.tsx`
- Modify: `src/core/components/Game/PokerTable.tsx`
- Modify: `src/core/components/Game/ShowdownResults.tsx`

- [ ] **Step 1 : Étendre `CreateTableForm`**

Lire le composant. Ajouter :
- Un radio group `gameType: "cash" | "tournament"`
- Si `tournament` :
  - Dropdown `preset: "turbo" | "standard" | "long" | "custom"`
  - Dropdown `startingStack: 1500 | 3000 | 5000`
  - Dropdown `levelDurationMin: 5 | 10 | 15 | 20` (auto-rempli depuis preset, modifiable si preset=custom)

```typescript
// Extrait — ajouter aux states existants :
const [gameType, setGameType] = useState<"cash" | "tournament">("cash");
const [preset, setPreset] = useState<"turbo" | "standard" | "long" | "custom">("standard");
const [startingStack, setStartingStack] = useState<number>(1500);
const [levelDurationMin, setLevelDurationMin] = useState<number>(10);

// Sync preset → levelDurationMin :
useEffect(() => {
  if (preset === "turbo") setLevelDurationMin(5);
  else if (preset === "standard") setLevelDurationMin(10);
  else if (preset === "long") setLevelDurationMin(15);
  // custom : laisse l'user choisir
}, [preset]);

// Au submit, passer ces champs à api.tables.createTable :
await createTable({
  // ... champs existants
  gameType,
  preset: gameType === "tournament" ? preset : undefined,
  startingStack,
  levelDurationMin: gameType === "tournament" ? levelDurationMin : undefined,
});
```

⚠️ Adapter à la structure JSX exacte du composant. Garder l'UI compacte (l'app a un design responsive existant).

- [ ] **Step 2 : Créer `TournamentInfo.tsx`**

```typescript
// src/core/components/Game/TournamentInfo.tsx
import React, { useEffect, useState } from "react";

interface TournamentInfoProps {
  blindStructure: Array<{ level: number; smallBlind: number; bigBlind: number; duration: number }>;
  currentBlindLevel: number;
  nextBlindIncrease: number;
  prizeStructure: Array<{ position: number; percentage: number }>;
  status: "registering" | "running" | "finished";
  totalPlayers: number;
  remainingPlayers: number;
  buyIn?: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const TournamentInfo: React.FC<TournamentInfoProps> = ({
  blindStructure,
  currentBlindLevel,
  nextBlindIncrease,
  status,
  totalPlayers,
  remainingPlayers,
  buyIn,
}) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "registering") {
    return (
      <div className="bg-poker-green-900 text-white px-3 py-2 text-sm rounded mb-2">
        Tournoi en attente de joueurs ({remainingPlayers}/{totalPlayers})
      </div>
    );
  }

  const level = blindStructure[currentBlindLevel];
  const remainingMs = nextBlindIncrease - Date.now();
  const prizePool = buyIn ? totalPlayers * buyIn : 0;

  return (
    <div className="bg-poker-green-900 text-white px-3 py-2 rounded mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span>
        Niveau {level?.level ?? "?"} · SB {level?.smallBlind ?? "?"} / BB {level?.bigBlind ?? "?"}
      </span>
      {status === "running" && (
        <span>Prochain niveau dans {formatTime(remainingMs)}</span>
      )}
      <span>
        Joueurs : {remainingPlayers}/{totalPlayers}
      </span>
      {prizePool > 0 && <span>Prize pool : {prizePool} jetons</span>}
      {status === "finished" && <span className="font-bold">Tournoi terminé</span>}
    </div>
  );
};
```

- [ ] **Step 3 : Render `TournamentInfo` dans `PokerTable.tsx`**

Repérer où le composant `PokerTable` rend le bandeau supérieur (ou créer le slot). Ajouter :

```typescript
import { TournamentInfo } from "./TournamentInfo";

// Dans le render, en haut de la zone de jeu :
{table.gameType === "tournament" && table.modules?.tournament && (
  <TournamentInfo
    blindStructure={table.modules.tournament.blindStructure}
    currentBlindLevel={table.modules.tournament.currentBlindLevel ?? 0}
    nextBlindIncrease={table.modules.tournament.nextBlindIncrease}
    prizeStructure={table.modules.tournament.prizeStructure}
    status={table.modules.tournament.status ?? "registering"}
    totalPlayers={table.maxPlayers}
    remainingPlayers={players.filter((p: any) => p.chips > 0 && !p.eliminatedAt).length}
    buyIn={table.buyIn}
  />
)}
```

- [ ] **Step 4 : Adapter `ShowdownResults.tsx`**

Si `table.gameType === "tournament" && table.modules.tournament.status === "finished"` :

```typescript
const finalRanking = table.modules?.tournament?.finalRanking;
if (gameType === "tournament" && tournamentStatus === "finished" && finalRanking) {
  return (
    <div className="...">
      <h2 className="text-xl font-bold">Tournoi terminé</h2>
      <ol className="...">
        {finalRanking.map((row) => (
          <li key={row.userId}>
            #{row.position} · <span>{userNameOf(row.userId)}</span>
            {row.prize > 0 && <span> · {row.prize} jetons</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
// sinon : comportement existant (résultat de la main)
```

⚠️ Pour `userNameOf(userId)`, utiliser une query existante (ex `api.users.getUser`) ou les données déjà chargées via `getTablePlayers`. Adapter à ce qui est dispo dans le composant.

- [ ] **Step 5 : Build et typecheck**

```bash
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 6 : Smoke navigateur (parent agent dispatchera)**

Voir critères de sortie globaux ci-dessous.

- [ ] **Step 7 : Commit**

```bash
git add src/
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(ui): CreateTableForm radio + TournamentInfo + ranking final

- CreateTableForm : radio cash/tournament + dropdowns preset/stack/levelDuration
- TournamentInfo : bandeau niveau + timer countdown + prize pool + joueurs restants
- ShowdownResults : ranking final avec prizes si tournoi fini
EOF
)"
```

---

## Critères de sortie globaux

- [ ] 8 commits distincts (un par étape) sur `master`
- [ ] `npm run typecheck && npm run lint && npx vitest run` exit 0
- [ ] Tests unitaires `blindStructure` (6) et `prizeStructure` (7) verts
- [ ] Tests sécu C1 baseline 13/15 maintenu
- [ ] Smoke tournoi (parent agent supervise) :
  - Créer un tournoi 4 joueurs preset Turbo (5min/level), startingStack 1500
  - 4 comptes test rejoignent
  - Démarrer tournoi → niveau 1 affiché, timer démarre
  - Jouer plusieurs mains, observer montée niveau 1 → 2 au bout de 5 min
  - Continuer jusqu'à élimination de 3 joueurs → tournoi fini, ranking affiché
  - Cash game créé en parallèle reste fonctionnel (régression)

## Risques (rappel du spec)

- R1 — Migration schéma incompatible → tous nouveaux champs `v.optional`
- R2 — Cash game se croit en tournoi → audit branches `gameType === "tournament"`
- R3 — Élimination soft interfère → filtre `chips > 0 && !eliminatedAt` partout dans turn order
- R4 — Timer dérive → query reactive Convex, pas timer client pur
- R5 — buyIn=0 → `prize=0`, ranking honoraire
- R6 — Régression sécu C1 → vitest run après chaque étape

## Suite

Après Module Tournaments validé :
- **C6** : Vite 5→8 + React 19 + Tailwind 4
- **Pré-prod** : passage Convex dev → prod, `.env.production`
- Modules optionnels CLAUDE.md : ChatModule, StatisticsModule
