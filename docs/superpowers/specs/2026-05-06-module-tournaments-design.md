# Spec — Module Tournaments (SNG)

**Date** : 2026-05-06
**Phase** : Module fonctionnel
**Source** : CLAUDE.md (TournamentModule + Tournament Support + Blind Structure Calculation), audit 0.A finding A5.2 (`modules.tournament` jamais alimenté)
**Phase précédente** : C5 (deps majeures, terminée — convex/eslint/typescript/vitest à jour)
**Phase suivante** : C6 (Vite/React 19/Tailwind 4) ou pré-prod

## Contexte

Le schéma Convex prévoit déjà `tables.modules.tournament` (blindStructure, currentBlindLevel, nextBlindIncrease, prizeStructure) et `gameType: "cash" | "tournament"`. Mais aucune logique tournoi n'a jamais été implémentée — finding A5.2 du rapport d'audit 0.A. Ce module comble ce gap fonctionnel annoncé dans CLAUDE.md.

L'app a aujourd'hui un moteur cash game heads-up + 9-max stable (post 1.B + 1.C + C4 + C5). Le module tournoi se greffe dessus en réutilisant le moteur existant + en ajoutant la logique blindes progressives, prize pool, élimination soft, ranking final.

## Objectif

À la fin de ce module, un user peut créer un Sit-and-Go (SNG single-table) avec :
- Choix d'un preset blind structure (Turbo / Standard / Long / Custom)
- Customisation du starting stack et level interval
- Démarrage manuel par le créateur quand toutes les places sont prises (ou min 2 joueurs)
- Montée des blindes automatique au démarrage de chaque main (si timer expiré)
- Élimination soft des joueurs à 0 chips (reste assis, ne reçoit plus de cartes)
- Distribution prize pool selon top-N auto-calculé (top 1/2/3 selon nb joueurs)
- Affichage UI : niveau actuel, prochain niveau dans X:XX, prize pool, joueurs restants/initial, ranking final au showdown

## Périmètre — IN

- Format **Sit-and-Go single-table** (1 table, 2-9 joueurs)
- Génération automatique de blindStructure depuis preset + paramètres user
- Génération automatique de prizeStructure selon nb joueurs
- 3 presets : Turbo (5min/level), Standard (10min/level), Long (15min/level), + Custom
- Customisation light : `startingStack` (1500/3000/5000) et `levelDuration` (5/10/15/20 min)
- Timer auto sans pause (lock A du brainstorm) ; montée de niveau au démarrage de la main suivante (lock A2)
- Top-N prize structure :
  - 2-4 joueurs : winner takes all
  - 5-7 joueurs : 70% / 30%
  - 8-9 joueurs : 50% / 30% / 20%
- Élimination soft (le joueur reste affiché, classé, mais ne reçoit plus de cartes)
- Helper `endTournament(ctx, tableId)` déclenché quand 1 seul joueur a des chips
- Frontend : formulaire création tournoi, composant TournamentInfo (timer + niveau + prize), ranking final dans ShowdownResults

## Périmètre — OUT (reporté ou hors-scope)

- **Multi-Table Tournament (MTT)** — backlog mémoire `tournaments_format.md` (option B Q1)
- **Late registration** — backlog mémoire `tournaments_lateref_rebuy.md` (option B Q4)
- **Rebuy / Add-on** — décision out-of-scope (option C Q4 jamais)
- **Pause manuelle** — décision out-of-scope (option B Q5)
- **Custom blind structure manuelle niveau par niveau** — décision out-of-scope (option C Q2)
- **Bounty / Spin & Go / Knockout** — décision out-of-scope MVP (option C Q1)
- **Late entry pendant les premiers niveaux** — backlog (option B Q4)

## Décisions clés (locks brainstorm)

| Lock | Choix |
|---|---|
| Format | A — SNG single-table 2-9 joueurs |
| Blind structure | B — Auto + presets (Turbo / Standard / Long / Custom) |
| Prize structure | B — Top N auto selon nb joueurs |
| Late reg / rebuy | A — Aucun (B late reg en backlog) |
| Timer | A + A2 — Auto sans pause, montée au démarrage de main |
| Paramètres formulaire | B — Preset + customisation light (startingStack + levelDuration) |

## Architecture

### Schéma Convex

`tables.modules.tournament` existe déjà :
- `blindStructure: [{ level, smallBlind, bigBlind, duration }]`
- `currentBlindLevel: number`
- `nextBlindIncrease: number` (timestamp ms)
- `prizeStructure: [{ position, percentage }]`

Ajouts :
```typescript
modules.tournament = {
  // ... existant ci-dessus
  status: v.union(v.literal("registering"), v.literal("running"), v.literal("finished")),
  startedAt: v.number(),  // timestamp ms du démarrage
  finishedAt: v.optional(v.number()),
  finalRanking: v.optional(v.array(v.object({
    userId: v.id("users"),
    position: v.number(),
    prize: v.number(),  // en jetons (= 0 si buyIn=0)
  }))),
}
```

`players` :
```typescript
eliminatedAt: v.optional(v.number()),  // timestamp d'élimination
tournamentRank: v.optional(v.number()),  // rang final (1 = winner)
```

Tous les nouveaux champs en `v.optional(...)` pour rétro-compat.

### Calcul auto blind structure

`convex/utils/blindStructure.ts` (nouveau) :
```typescript
export type Preset = "turbo" | "standard" | "long" | "custom";

const PRESETS: Record<Exclude<Preset, "custom">, { levelDurationMin: number }> = {
  turbo: { levelDurationMin: 5 },
  standard: { levelDurationMin: 10 },
  long: { levelDurationMin: 15 },
};

export function generateBlindStructure(
  startingStack: number,
  levelDurationMin: number
): Array<{ level: number; smallBlind: number; bigBlind: number; duration: number }> {
  const sb1 = Math.max(5, Math.round(startingStack / 200 / 5) * 5);
  const ratios = [1, 1.5, 2.5, 4, 6, 10, 15, 25, 40, 60, 100, 150];
  return ratios.map((r, i) => ({
    level: i + 1,
    smallBlind: Math.round(sb1 * r / 5) * 5,
    bigBlind: Math.round(sb1 * r * 2 / 5) * 5,
    duration: levelDurationMin * 60_000,
  }));
}
```

Exemple : startingStack=1500, levelDurationMin=10 → niveau 1 = SB 5 / BB 10 (10 min), niveau 12 = SB 1125 / BB 2250.

### Calcul auto prize structure

`convex/utils/prizeStructure.ts` (nouveau) :
```typescript
export function computePrizeStructure(nbPlayers: number) {
  if (nbPlayers <= 4) return [{ position: 1, percentage: 100 }];
  if (nbPlayers <= 7) return [{ position: 1, percentage: 70 }, { position: 2, percentage: 30 }];
  return [{ position: 1, percentage: 50 }, { position: 2, percentage: 30 }, { position: 3, percentage: 20 }];
}
```

Pot total tournoi = `nbPlayers * buyIn`. Si `buyIn=0` → ranking honoraire (prize=0).

### Moteur tournoi

Modifs dans `convex/core/gameEngine.ts` :

**`createTable`** (ou `startGame` selon où c'est plus propre) :
- Si `gameType === "tournament"`, à `createTable` :
  - Génère `blindStructure` via `generateBlindStructure(startingStack, levelDurationMin)`
  - Génère `prizeStructure` via `computePrizeStructure(maxPlayers)`
  - Init `modules.tournament = { blindStructure, currentBlindLevel: 0, nextBlindIncrease: 0, prizeStructure, status: "registering", startedAt: 0 }`
- `table.smallBlind`/`bigBlind` reçoivent les valeurs du niveau 1.

**`startGame`** :
- Si tournoi : set `modules.tournament.status = "running"`, `modules.tournament.startedAt = Date.now()`, `currentBlindLevel = 0` (niveau 1 = index 0), `nextBlindIncrease = Date.now() + blindStructure[0].duration`. Le niveau 1 démarre.

**`startNextHand`** (au début de chaque main, après `prepareNextHand`) :
- Si tournoi et `Date.now() >= modules.tournament.nextBlindIncrease` :
  - `currentBlindLevel++`
  - `table.smallBlind = blindStructure[currentBlindLevel].smallBlind`
  - `table.bigBlind = blindStructure[currentBlindLevel].bigBlind`
  - `modules.tournament.nextBlindIncrease = Date.now() + blindStructure[currentBlindLevel].duration`
  - addActionToFeed `Niveau N : SB X / BB Y`
- Si `currentBlindLevel >= blindStructure.length - 1` (dernier niveau atteint) : pas de montée supplémentaire, on reste sur le dernier niveau jusqu'à fin.

**`prepareNextHand`** (et/ou `endHand`) :
- Pour chaque player, si `chips === 0` et pas encore `eliminatedAt` :
  - Compter `nbActivePlayersAvant` (joueurs avec `eliminatedAt === undefined`)
  - Set `player.eliminatedAt = Date.now()`, `player.tournamentRank = nbActivePlayersAvant`
- Au démarrage de la main suivante (`startGameInternal` distribution cartes) : ne pas distribuer de hole cards aux joueurs avec `eliminatedAt`.
- Filter `activePlayers` (pour blind posting, ordre tour, etc.) sur `chips > 0 && !eliminatedAt`.

**`endTournament(ctx, tableId)`** (nouveau helper) :
- Déclenché quand `nbActivePlayersWithChips === 1` après une main.
- Set le winner avec `tournamentRank: 1` (déjà winner par chips).
- Construit `finalRanking[]` :
  - Trie tous les players par `tournamentRank` ascending (1 = winner, N = premier éliminé).
  - Pour chaque, prend le `prizeStructure` correspondant à `position = rank` ; si pas dans le top, `prize = 0`.
  - `prize = (nbPlayers * buyIn) * percentage / 100` (0 si buyIn=0).
- Patch `modules.tournament.status = "finished"`, `finishedAt = Date.now()`, `finalRanking = ...`.
- Patch `table.status = "finished"`.
- addActionToFeed `Tournoi terminé. Vainqueur : <name>`

### Frontend

**`CreateTableForm.tsx`** :
- Radio `gameType: cash | tournament`
- Si `tournament` :
  - Dropdown preset : Turbo / Standard / Long / Custom
  - Dropdown starting stack : 1500 / 3000 / 5000
  - Dropdown level duration : 5 / 10 / 15 / 20 min (auto-rempli selon preset, modifiable si Custom)
- Validation côté serveur (Zod) sur ces nouveaux champs.

**Nouveau composant `TournamentInfo`** dans `PokerTable.tsx` :
- Bandeau en haut, visible uniquement si `gameType === "tournament" && status === "running"`.
- Affiche :
  - "Niveau N · SB X / BB Y"
  - "Prochain niveau dans M:SS" (compte à rebours via `setInterval(1000)` côté composant)
  - "Joueurs restants : K / N"
  - "Prize pool : `nbPlayers * buyIn` jetons" (caché si buyIn=0)
- Si `status === "finished"` : afficher "Tournoi terminé"

**`ShowdownResults.tsx`** :
- Si `gameType === "tournament" && tournament.status === "finished"` : afficher le `finalRanking` à la place du résultat de la main. Liste : Position N · NomJoueur · X jetons gagnés (si buyIn>0).
- Sinon : comportement actuel (résultat de la main).

## Décomposition en 8 étapes

| # | Étape | Effort |
|---|---|---|
| 1 | Schéma : ajouts `players.eliminatedAt`/`tournamentRank`, `modules.tournament.{status,startedAt,finishedAt,finalRanking}` + push convex | ~20min |
| 2 | `convex/utils/blindStructure.ts` + tests unit | ~45min |
| 3 | `convex/utils/prizeStructure.ts` + tests unit | ~20min |
| 4 | `createTable` : init tournament module si gameType="tournament" + validation Zod | ~30min |
| 5 | `startGame` : init `running` state, `startedAt`, `nextBlindIncrease` | ~30min |
| 6 | `startNextHand` : check timer + montée niveau + addActionToFeed | ~30min |
| 7 | Élimination + `endTournament` : marquage `eliminatedAt`/`tournamentRank`, distribution prize, ranking final | ~1h |
| 8 | Frontend : `CreateTableForm` (radio + dropdowns), `TournamentInfo`, ranking dans `ShowdownResults` | ~1h30 |

**Total : ~5h30.**

## Critères de sortie

### Automatiques (par étape)

```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npx vitest run      # exit 0, 13/15 tests sécu C1 baseline maintenu
```

### Smoke navigateur (post-étape 8)

Sur `home-poker.vjdev.tech` après rebuild + hard-refresh :
1. Créer une table tournoi (preset Turbo, 4 joueurs, startingStack 1500)
2. 4 comptes test rejoignent (multi-onglet privé)
3. Créateur clique "Démarrer" → niveau 1 affiché, timer démarre
4. Jouer plusieurs mains, observer la montée de niveau au bout de ~5min
5. Continuer jusqu'à élimination de 3 joueurs → tournoi fini, ranking affiché
6. Vérifier : winner a tous les jetons (4 * 1500 = 6000), top 1 = 100% du pot tournoi (si buyIn>0)

### Critères globaux

- 8 commits distincts sur `master`
- Smoke tournoi 4 joueurs passé
- Cash game existant inchangé (régression test)
- Working tree clean

## Stratégie de commits

- `feat(schema): champs tournoi sur players + modules.tournament`
- `feat(tournaments): generator blindStructure (3 presets + custom)`
- `feat(tournaments): computePrizeStructure top-N auto`
- `feat(tournaments): init module tournament dans createTable`
- `feat(tournaments): démarrage tournoi (status running + timer)`
- `feat(tournaments): montée auto des blindes au démarrage de main`
- `feat(tournaments): élimination soft + endTournament + finalRanking`
- `feat(ui): CreateTableForm radio + TournamentInfo + ranking final`

Sign avec `viny1976@gmail.com` / `satch9`. Pas de `--no-verify`.

## Risques

- **R1 — Migration schéma incompatible.** Mitigation : `v.optional(...)` partout, pas de backfill nécessaire.
- **R2 — Moteur cash game se croit en tournoi.** Mitigation : audit branches `gameType === "tournament"`, test cash game complet avant commit final.
- **R3 — Élimination soft interfère avec le moteur.** Mitigation : filtre explicite `chips > 0 && !eliminatedAt` partout où on liste les joueurs actifs (turn order, blind posting, hole card distribution). TDD ciblé.
- **R4 — Timer dérive sur sessions longues.** Mitigation : compter sur les queries reactive Convex (refetch ~1s), pas un timer purement client.
- **R5 — Calcul prize avec buyIn=0.** Mitigation : `prize=0` pour tous, ranking honoraire suffit.
- **R6 — Régression sécu C1.** Mitigation : tournoi en branche d'opt-in (`gameType`), cash games inchangés. Vitest run à chaque étape.

## Hypothèses

- **H1** — `startingStack` en jetons abstraits (déjà le cas dans schema).
- **H2** — `pot` côté `gameStates` reste le pot de la main courante (pas du tournoi).
- **H3** — Pas de migration de données existantes nécessaire.
- **H4** — Smoke tournoi nécessite 2-9 joueurs simultanés (multi-onglet ou multi-comptes).

## Suite

Après Module Tournaments validé :
- **C6** : Vite 5→8 + React 19 + Tailwind 4 (sprint dédié)
- **Pré-prod** : passage Convex dev → prod (`accurate-nightingale-834`), `.env.production` propre
- Modules optionnels CLAUDE.md : ChatModule, StatisticsModule
