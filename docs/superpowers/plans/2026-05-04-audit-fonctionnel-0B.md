# Audit Fonctionnel 0.B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire un rapport priorisé des bugs fonctionnels du MVP heads-up + scénarios multi-joueurs ciblés, qui alimentera le plan de fix 1.B.

**Architecture:** Audit hybride en 3 voies parallélisables : (1) audit statique du code par sub-agents Explore sur 6 parcours, (2) checklist de smoke tests manuels exécutés par le user dans le navigateur, (3) harness Node piloté côté agent qui rejoue 3 scénarios multi-joueurs via le client Convex officiel sur le déploiement dev. Tout est consolidé dans un rapport markdown au format identique à 0.A.

**Tech Stack:** Convex 1.15 (déploiement dev `incredible-hedgehog-551`), client `convex/browser` côté Node, ESM Node 20+.

**Spec source:** `docs/superpowers/specs/2026-05-04-audit-fonctionnel-design.md`
**Audit précédent:** `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure

| Fichier | Rôle | Création / Modif |
|---|---|---|
| `tests/legacy/audit-harness/index.mjs` | Entry point harness | Create |
| `tests/legacy/audit-harness/lib.mjs` | Helpers (auth, table setup, action helpers) | Create |
| `tests/legacy/audit-harness/scenarios/s1-action-ordering.mjs` | Scénario S1 | Create |
| `tests/legacy/audit-harness/scenarios/s2-side-pots.mjs` | Scénario S2 | Create |
| `tests/legacy/audit-harness/scenarios/s3-elimination.mjs` | Scénario S3 | Create |
| `tests/legacy/audit-harness/README.md` | Doc d'usage du harness | Create |
| `docs/superpowers/specs/2026-05-04-audit-fonctionnel-checklist.md` | Checklist smoke manuelle | Create |
| `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md` | Rapport consolidé final | Create |
| `.audit-tmp/` | Logs temporaires (gitignored) | Create transitoire |

---

### Task 1: Audit statique des 6 parcours — dispatch ou grep séquentiel

**Findings collectés** : B1.* à B6.*

**Files:** aucun fichier code modifié. Les findings sont collectés en mémoire pour Task 13.

**Stratégie** : si l'outil `Agent` est disponible avec `subagent_type=Explore`, dispatcher 6 sub-agents en parallèle (un par parcours). Sinon, faire l'audit séquentiellement avec `grep`/`Read` directs.

- [ ] **Step 1: Vérifier la dispo de `Agent`/`Explore`**

Tester un appel minimaliste. Si OK → Step 2. Sinon → Step 3.

- [ ] **Step 2: Dispatch parallèle des 6 sub-agents (si dispo)**

Un seul message avec 6 appels `Agent` (subagent_type=Explore) en parallèle. Prompts complets ci-dessous, à utiliser **tels quels** :

**Sub-agent Parcours 1 — Auth :**
> Audit statique du parcours Auth. Trace le code de signup/signin/persist/signout dans `/var/www/vincent/claude-code-poker`. Backend : `convex/auth.ts`. Frontend : grep tout `signUpWithPassword`, `signInWithPassword`, `useAuth`, `SignInButton`, `UserProfile`. Identifie : (a) mutations Convex appelées et leurs args, (b) états React gérés, (c) cas non gérés (mauvais password, email existant, déconnexion réseau, refresh F5), (d) validation serveur manquante (email format, password length), (e) désynchros UI ↔ backend, (f) fuite éventuelle de `password` côté front. Retourne max 400 mots, format markdown : 1 finding = titre + sévérité 🔴/🟡/🟢 + localisation `fichier:ligne` + description 1-2 phrases + recommandation. Sois exhaustif sur les bugs, ne propose AUCUN fix toi-même.

**Sub-agent Parcours 2 — Création table :**
> Audit statique du parcours "création de table". Backend : `convex/tables.ts:createTable` + insertion `gameStates`. Frontend : grep `createTable`, `useMutation(api.tables.createTable)`. Identifie : (a) validation des arguments (smallBlind > 0 ? bigBlind > smallBlind ? maxPlayers entre 2 et 9 ? startingStack > 0 ?), (b) génération `inviteCode` (sécurité, collisions, longueur, charset), (c) initialisation `gameStates` (champs manquants ?), (d) gestion d'erreur côté UI, (e) navigation après création. Format identique au prompt précédent. Max 400 mots.

**Sub-agent Parcours 3 — Rejoindre table par code :**
> Audit statique du parcours "rejoindre une table". Backend : `convex/players.ts:joinTable`, `convex/tables.ts:getTableByInviteCode` (peut avoir été supprimé en 1.A — vérifier). Frontend : grep `joinTable`, écran de saisie du code. Identifie : (a) recherche table par code (case sensitive ? feedback si introuvable ?), (b) attribution du `seatPosition` (collision possible ?), (c) buy-in (montant validé ?), (d) UI feedback en cas d'échec, (e) cas concurrent (2 joueurs tentent le dernier siège en même temps). Format identique. Max 400 mots.

**Sub-agent Parcours 4 — Partie heads-up complète :**
> Audit statique du parcours "partie heads-up". Backend : `convex/core/gameEngine.ts` (startGame, playerAction, advancePhase, advanceFromShowdown). Frontend : grep `useGameLogic`, `BettingControls`, `PokerTable`, `CommunityCards`, `ShowdownResults`. Identifie pour chaque phase (preflop → flop → turn → river → showdown) : (a) qui doit agir et dans quel ordre (heads-up : SB agit en premier preflop, BB en premier postflop), (b) calcul des blindes posées au préflop, (c) transitions de phase déclenchées par `advancePhase`, (d) distribution des cartes communautaires, (e) détermination du gagnant (`handEvaluator` retourne quoi, qui distribue le pot), (f) UI désynchros possibles (cartes pas réactives, pot pas mis à jour). Format identique. Max 500 mots.

**Sub-agent Parcours 5 — Multi-mains et élimination :**
> Audit statique de "plusieurs mains consécutives". Backend : `convex/core/gameEngine.ts:startNextHand`, rotation du `dealerPosition`. Frontend : trigger automatique vs bouton manuel ?. Identifie : (a) rotation du dealer button (heads-up : le dealer = SB, l'autre = BB), (b) reset des `players.cards`, `players.currentBet`, `players.hasActed`, `players.lastAction`, (c) si un joueur est à 0 chips, est-il éliminé ou redoit-il agir ?, (d) timing de `startNextHand` (auto-advance ? trigger UI ?), (e) gestion du cas "les 2 joueurs sont à 0 chips" (impossible mais robustesse). Format identique. Max 400 mots.

**Sub-agent Parcours 6 — Sortir de la table :**
> Audit statique du parcours "leaveTable". Backend : `convex/players.ts:leaveTable`. Frontend : grep `leaveTable`, bouton "Quitter". Identifie : (a) que se passe-t-il si le joueur quitte au milieu d'une main (fold automatique ? attente fin de main ?), (b) état du joueur restant (rendu solitaire, retour à `waiting` ?), (c) cleanup des données (cards, currentBet), (d) cas du créateur de la table qui quitte (table supprimée ? transfert ?), (e) UI feedback. Format identique. Max 400 mots.

- [ ] **Step 3: Fallback grep séquentiel (si Agent non dispo)**

Pour chaque parcours, au lieu de dispatcher un sub-agent, exécuter une série de `grep`/`Read` ciblés et noter les findings. Même format de sortie. Le travail est plus lent mais le résultat équivalent.

Listes minimales d'inspection par parcours :

| Parcours | Fichiers à lire | Greps à exécuter |
|---|---|---|
| 1 Auth | `convex/auth.ts`, `src/core/hooks/useAuth.ts`, `src/core/components/Auth/*.tsx` | `grep -rn "signUpWithPassword\|signInWithPassword\|useAuth"` |
| 2 Create | `convex/tables.ts`, `src/core/components/Table/Create*.tsx` | `grep -rn "createTable\|inviteCode"` |
| 3 Join | `convex/players.ts:joinTable`, frontend join | `grep -rn "joinTable\|getTableByInviteCode"` |
| 4 Hand | `convex/core/gameEngine.ts`, `src/core/hooks/useGameLogic.ts`, components Game | `grep -rn "playerAction\|advancePhase\|startGame"` |
| 5 Multi-hands | `convex/core/gameEngine.ts:startNextHand` | `grep -rn "startNextHand\|dealerPosition"` |
| 6 Leave | `convex/players.ts:leaveTable` | `grep -rn "leaveTable"` |

- [ ] **Step 4: Consolider les findings en mémoire**

Stocker les findings par parcours, format `B{n}.{m}`. Pas de commit ici — la consolidation finale se fait en Task 13.

---

### Task 2: Préparer répertoire `.audit-tmp` et `.gitignore`

**Files:**
- Modify: `.gitignore`
- Create: `.audit-tmp/` (transitoire)

- [ ] **Step 1: Vérifier que `.audit-tmp/` est déjà ignoré**

Run:

```bash
git check-ignore -v .audit-tmp/test 2>&1 || echo "NOT IGNORED"
```

Si déjà ignoré (depuis 0.A) → skip vers Task 3. Sinon → ajouter `.audit-tmp/` au `.gitignore`.

- [ ] **Step 2: Créer le répertoire si absent**

```bash
mkdir -p .audit-tmp
```

(Pas de commit nécessaire si déjà ignoré.)

---

### Task 3: Construire le harness — squelette + lib

**Files:**
- Create: `tests/legacy/audit-harness/lib.mjs`
- Create: `tests/legacy/audit-harness/index.mjs`

- [ ] **Step 1: Créer `lib.mjs`**

Créer `/var/www/vincent/claude-code-poker/tests/legacy/audit-harness/lib.mjs` avec ce contenu **exact** :

```javascript
// tests/legacy/audit-harness/lib.mjs
// Helpers pour piloter le déploiement Convex dev depuis Node.
// Utilise le client HTTP officiel de Convex (pas de _generated, on cible par chemin string).

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "https://incredible-hedgehog-551.convex.cloud";

export function makeClient() {
  return new ConvexHttpClient(CONVEX_URL);
}

export function log(scenario, msg, data) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] [${scenario}] ${msg}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${ts}] [${scenario}] ${msg}`);
  }
}

export function warn(scenario, msg, data) {
  const ts = new Date().toISOString();
  console.warn(`[${ts}] [${scenario}] ⚠️  ${msg}`, data ?? "");
}

// Crée (ou réutilise) un user audit-bot-N. Retourne l'userId.
export async function ensureUser(client, n, name) {
  const email = `audit-bot-${n}@local`;
  try {
    const r = await client.mutation("auth:signUpWithPassword", {
      email,
      password: "audit-bot-pass",
      name: name || `AuditBot${n}`,
    });
    return r.userId;
  } catch (err) {
    // User existe déjà → signin
    const r = await client.mutation("auth:signInWithPassword", {
      email,
      password: "audit-bot-pass",
    });
    return r.userId;
  }
}

// Crée une table dédiée à l'audit. Retourne tableId.
export async function createAuditTable(client, creatorId, opts = {}) {
  const args = {
    name: opts.name || "Audit Harness Table",
    maxPlayers: opts.maxPlayers || 6,
    gameType: "cash",
    startingStack: opts.startingStack || 1000,
    smallBlind: opts.smallBlind || 5,
    bigBlind: opts.bigBlind || 10,
    isPrivate: false,
    creatorId,
  };
  return await client.mutation("tables:createTable", args);
}

// Place un user à un siège. seatPosition optional.
export async function joinTable(client, tableId, userId, seatPosition) {
  return await client.mutation("players:joinTable", {
    tableId,
    userId,
    seatPosition,
  });
}

export async function startGame(client, tableId) {
  return await client.mutation("core/gameEngine:startGame", { tableId });
}

export async function playerAction(client, tableId, userId, action, amount) {
  const args = { tableId, userId, action };
  if (amount !== undefined) args.amount = amount;
  return await client.mutation("core/gameEngine:playerAction", args);
}

export async function getGameState(client, tableId) {
  return await client.query("tables:getGameState", { tableId });
}

export async function getTablePlayers(client, tableId) {
  return await client.query("players:getTablePlayers", { tableId });
}

export async function snapshot(client, tableId) {
  const [state, players] = await Promise.all([
    getGameState(client, tableId),
    getTablePlayers(client, tableId),
  ]);
  return { state, players };
}

export function softAssert(scenario, label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    warn(scenario, `assertion FAIL: ${label}`, { actual, expected });
  } else {
    log(scenario, `assertion OK: ${label}`);
  }
  return ok;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
```

- [ ] **Step 2: Créer `index.mjs`**

Créer `/var/www/vincent/claude-code-poker/tests/legacy/audit-harness/index.mjs` avec :

```javascript
// tests/legacy/audit-harness/index.mjs
// Entry point. Usage: node tests/legacy/audit-harness/index.mjs [s1|s2|s3|all]

import { makeClient, log } from "./lib.mjs";
import { runS1 } from "./scenarios/s1-action-ordering.mjs";
import { runS2 } from "./scenarios/s2-side-pots.mjs";
import { runS3 } from "./scenarios/s3-elimination.mjs";

const target = (process.argv[2] || "all").toLowerCase();
const client = makeClient();

const scenarios = {
  s1: runS1,
  s2: runS2,
  s3: runS3,
};

async function main() {
  log("harness", `Target: ${target}`);
  const toRun = target === "all" ? Object.keys(scenarios) : [target];

  for (const key of toRun) {
    const fn = scenarios[key];
    if (!fn) {
      console.error(`Unknown scenario: ${key}`);
      process.exit(1);
    }
    log("harness", `=== Running ${key.toUpperCase()} ===`);
    try {
      await fn(client);
      log("harness", `=== ${key.toUpperCase()} done ===\n`);
    } catch (err) {
      console.error(`[${key}] CRASHED:`, err.message);
      console.error(err.stack);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Vérifier que le client Convex npm est dispo**

Run:

```bash
node -e "import('convex/browser').then(m => console.log('OK:', Object.keys(m)))" 2>&1 | head -3
```

Expected: `OK: [ 'ConvexHttpClient', ... ]`. Si erreur "Cannot find package" → c'est qu'on a une vieille version de `convex` ; ajouter au plan une note pour l'upgrade. Sinon → ok.

---

### Task 4: Scénario S1 — action ordering 4 joueurs

**Files:**
- Create: `tests/legacy/audit-harness/scenarios/s1-action-ordering.mjs`

**Objectif** : 4 joueurs assis en sièges 0,1,2,3. Démarrer la partie. Vérifier l'ordre d'action préflop (UTG=siège 2, CO=siège 3, SB=siège 0, BB=siège 1 si dealer=siège 3 → adapter selon `dealerPosition` réel) puis postflop. Logger après chaque action.

- [ ] **Step 1: Créer le fichier**

Créer `/var/www/vincent/claude-code-poker/tests/legacy/audit-harness/scenarios/s1-action-ordering.mjs` avec :

```javascript
// tests/legacy/audit-harness/scenarios/s1-action-ordering.mjs
// S1: Action ordering 4 joueurs. Préflop ordre attendu: UTG -> ... -> BB.
// Postflop: SB -> ... -> button.

import {
  ensureUser, createAuditTable, joinTable, startGame,
  playerAction, snapshot, log, warn, softAssert, sleep,
} from "../lib.mjs";

const SCN = "S1";

export async function runS1(client) {
  // 1. Créer 4 users
  const userIds = [];
  for (let i = 1; i <= 4; i++) {
    const id = await ensureUser(client, i, `Bot${i}`);
    userIds.push(id);
    log(SCN, `user ${i} = ${id}`);
  }

  // 2. Créer une table 6 max, 4 joueurs prendront les sièges 0..3
  const tableId = await createAuditTable(client, userIds[0], {
    name: "S1 Action Ordering",
    maxPlayers: 6,
  });
  log(SCN, `tableId = ${tableId}`);

  // 3. Asseoir les 4 users en sièges 0..3
  for (let i = 0; i < 4; i++) {
    await joinTable(client, tableId, userIds[i], i);
    log(SCN, `joined seat ${i}`);
  }

  // 4. startGame
  await startGame(client, tableId);
  await sleep(200);
  let snap = await snapshot(client, tableId);
  log(SCN, "after startGame", { phase: snap.state.phase, dealer: snap.state.dealerPosition, currentPos: snap.state.currentPlayerPosition });

  // 5. Préflop : faire agir les joueurs en suivant currentPlayerPosition
  // On boucle au max 4 actions préflop avant transition.
  const preflopActions = [];
  for (let i = 0; i < 6; i++) {
    snap = await snapshot(client, tableId);
    if (snap.state.phase !== "preflop") break;
    const pos = snap.state.currentPlayerPosition;
    const player = snap.players.find(p => p.seatPosition === pos);
    if (!player) {
      warn(SCN, `no player at seat ${pos}`);
      break;
    }
    preflopActions.push({ pos, userId: player.userId });
    // Action: call (call la BB) ; le dernier joueur check si BB sans raise (heads-up edge case)
    try {
      await playerAction(client, tableId, player.userId, "call");
      log(SCN, `preflop action: seat ${pos} -> call`);
    } catch (err) {
      warn(SCN, `action failed seat ${pos}`, err.message);
      break;
    }
    await sleep(200);
  }
  log(SCN, "preflop sequence", preflopActions.map(a => a.pos));

  // 6. Vérifier que le tour préflop a bien fait passer la phase
  snap = await snapshot(client, tableId);
  softAssert(SCN, "phase after preflop", snap.state.phase, "flop");

  // 7. Vérifier ordre d'action postflop : doit commencer par SB
  if (snap.state.phase === "flop") {
    log(SCN, "flop currentPlayerPosition", snap.state.currentPlayerPosition);
    // Heads-up post-flop : SB agit en premier ; multi : SB d'abord (premier joueur actif après dealer en sens horaire)
    // On ne hardcode pas la valeur ; on vérifie juste que ce n'est PAS la même position qu'au preflop start (ordering différent)
    if (preflopActions.length && snap.state.currentPlayerPosition === preflopActions[0].pos) {
      warn(SCN, "postflop starts at same seat as preflop — ordering suspect", {
        preflopFirst: preflopActions[0].pos,
        flopFirst: snap.state.currentPlayerPosition,
      });
    } else {
      log(SCN, "postflop ordering looks different from preflop ✓");
    }
  } else {
    warn(SCN, `unexpected phase after preflop: ${snap.state.phase}`);
  }

  log(SCN, "S1 finished");
}
```

- [ ] **Step 2: Sanity check syntaxe**

Run: `node --check tests/legacy/audit-harness/scenarios/s1-action-ordering.mjs`
Expected: aucune sortie.

---

### Task 5: Scénario S2 — side pots 3-way all-in

**Files:**
- Create: `tests/legacy/audit-harness/scenarios/s2-side-pots.mjs`

- [ ] **Step 1: Créer le fichier**

```javascript
// tests/legacy/audit-harness/scenarios/s2-side-pots.mjs
// S2: 3 joueurs all-in à montants différents. Vérifier création des side pots.

import {
  ensureUser, createAuditTable, joinTable, startGame,
  playerAction, snapshot, log, warn, softAssert, sleep,
} from "../lib.mjs";

const SCN = "S2";

export async function runS2(client) {
  // 1. Créer 3 users
  const userIds = [];
  for (let i = 1; i <= 3; i++) {
    userIds.push(await ensureUser(client, i, `Bot${i}`));
  }

  // 2. Créer table avec startingStacks différentes via plusieurs joins
  // Note: createTable n'accepte qu'un startingStack global ; on prendra 200 puis on ajustera
  // les chips post-join via les actions. Si nécessaire, étendre lib.mjs.
  const tableId = await createAuditTable(client, userIds[0], {
    name: "S2 Side Pots",
    maxPlayers: 6,
    startingStack: 200,
    smallBlind: 5,
    bigBlind: 10,
  });
  log(SCN, `tableId = ${tableId}`);

  // 3. Asseoir
  for (let i = 0; i < 3; i++) {
    await joinTable(client, tableId, userIds[i], i);
  }

  // 4. Approche : startGame, puis tous push all-in.
  //    Avec startingStack = 200 et bb=10, on aura besoin de stacks différents.
  //    Pour cet audit, on simule "all-in" tel quel : tous à 200. C'est plus
  //    un side-pot trivial (tous égaux → un seul pot). Pour tester réellement
  //    des stacks différents, il faudrait jouer plusieurs mains pour creuser
  //    les stacks ; on signale en finding si pas faisable simplement.
  try {
    await startGame(client, tableId);
    await sleep(200);
  } catch (err) {
    warn(SCN, `startGame failed`, err.message);
    return;
  }

  // 5. Loop d'actions all-in jusqu'au showdown
  for (let i = 0; i < 12; i++) {
    const snap = await snapshot(client, tableId);
    if (snap.state.phase === "showdown") break;
    const pos = snap.state.currentPlayerPosition;
    const p = snap.players.find(pp => pp.seatPosition === pos);
    if (!p) break;
    try {
      await playerAction(client, tableId, p.userId, "all-in");
      log(SCN, `all-in seat ${pos}`);
    } catch (err) {
      warn(SCN, `all-in failed seat ${pos}`, err.message);
      // Tenter call si all-in refusé
      try {
        await playerAction(client, tableId, p.userId, "call");
        log(SCN, `fallback call seat ${pos}`);
      } catch (e2) {
        warn(SCN, `call also failed`, e2.message);
        break;
      }
    }
    await sleep(200);
  }

  const final = await snapshot(client, tableId);
  log(SCN, "final state", {
    phase: final.state.phase,
    pot: final.state.pot,
    sidePots: final.state.sidePots,
  });

  softAssert(SCN, "reached showdown", final.state.phase, "showdown");

  // Note: si tous les stacks sont égaux, sidePots peut être [] et pot global est correct.
  // Le finding important sera : si on observe des incohérences de comptage, on les remonte.
  if (final.state.sidePots.length > 0) {
    log(SCN, `${final.state.sidePots.length} side pots créés (à inspecter)`);
  } else {
    warn(SCN, "Aucun side pot — scenario trivial avec stacks égaux. Limitation harness.");
  }

  log(SCN, "S2 finished");
}
```

- [ ] **Step 2: Sanity check**

Run: `node --check tests/legacy/audit-harness/scenarios/s2-side-pots.mjs`

---

### Task 6: Scénario S3 — élimination en cours de main

**Files:**
- Create: `tests/legacy/audit-harness/scenarios/s3-elimination.mjs`

- [ ] **Step 1: Créer le fichier**

```javascript
// tests/legacy/audit-harness/scenarios/s3-elimination.mjs
// S3: 3 joueurs, le premier perd un all-in préflop, on vérifie que la main continue heads-up
// et que le perdant n'est pas reconvoqué.

import {
  ensureUser, createAuditTable, joinTable, startGame,
  playerAction, snapshot, log, warn, softAssert, sleep,
} from "../lib.mjs";

const SCN = "S3";

export async function runS3(client) {
  const userIds = [];
  for (let i = 1; i <= 3; i++) userIds.push(await ensureUser(client, i, `Bot${i}`));

  const tableId = await createAuditTable(client, userIds[0], {
    name: "S3 Elimination",
    maxPlayers: 6,
    startingStack: 200,
  });
  for (let i = 0; i < 3; i++) await joinTable(client, tableId, userIds[i], i);

  await startGame(client, tableId);
  await sleep(200);

  // 1. Le joueur dont c'est le tour fait fold (il "abandonne" sa main).
  //    En heads-up à 3, après un fold, on continue à 2.
  let snap = await snapshot(client, tableId);
  const firstPos = snap.state.currentPlayerPosition;
  const firstPlayer = snap.players.find(p => p.seatPosition === firstPos);
  log(SCN, `first to act: seat ${firstPos}`);

  try {
    await playerAction(client, tableId, firstPlayer.userId, "fold");
    log(SCN, `seat ${firstPos} folded`);
  } catch (err) {
    warn(SCN, `fold failed`, err.message);
    return;
  }
  await sleep(200);

  // 2. Boucle pour faire avancer la main jusqu'au showdown ou à la fin (si 1 seul reste)
  for (let i = 0; i < 20; i++) {
    snap = await snapshot(client, tableId);
    if (snap.state.phase === "showdown") break;
    if (snap.state.phase === "waiting") break;

    // Vérifier que le joueur qui a fold n'est PAS celui à qui on demande d'agir
    if (snap.state.currentPlayerPosition === firstPos) {
      warn(SCN, `joueur fold (seat ${firstPos}) reconvoqué — bug`);
    }

    const pos = snap.state.currentPlayerPosition;
    const p = snap.players.find(pp => pp.seatPosition === pos);
    if (!p) break;
    if (p.isFolded) {
      warn(SCN, `joueur folded à action seat ${pos} — bug`);
      break;
    }

    try {
      await playerAction(client, tableId, p.userId, "check");
    } catch {
      try {
        await playerAction(client, tableId, p.userId, "call");
      } catch (err) {
        warn(SCN, `action failed seat ${pos}`, err.message);
        break;
      }
    }
    await sleep(200);
  }

  const final = await snapshot(client, tableId);
  log(SCN, "final state", { phase: final.state.phase, pot: final.state.pot });
  log(SCN, "S3 finished");
}
```

- [ ] **Step 2: Sanity check**

Run: `node --check tests/legacy/audit-harness/scenarios/s3-elimination.mjs`

---

### Task 7: README harness

**Files:**
- Create: `tests/legacy/audit-harness/README.md`

- [ ] **Step 1: Créer le README**

```markdown
# Audit Harness

Script jetable utilisé pour la phase d'audit fonctionnel **0.B** du projet
claude-code-poker. Pilote le déploiement Convex dev pour rejouer 3 scénarios
multi-joueurs difficiles à reproduire manuellement.

## Prérequis

- Node 20+
- `npm install` exécuté à la racine du projet (le client `convex` est utilisé
  via `convex/browser`).
- Le déploiement Convex dev `incredible-hedgehog-551` doit être actif. Pas
  besoin de `npx convex dev` tournant : le harness parle directement à
  l'URL HTTPS du déploiement.

## Usage

```bash
# Tous les scénarios
node tests/legacy/audit-harness/index.mjs

# Un seul scénario
node tests/legacy/audit-harness/index.mjs s1
node tests/legacy/audit-harness/index.mjs s2
node tests/legacy/audit-harness/index.mjs s3
```

## Variables d'environnement

- `CONVEX_URL` : URL du déploiement à cibler. Défaut :
  `https://incredible-hedgehog-551.convex.cloud`.

## Comptes utilisés

Le harness crée (ou réutilise) `audit-bot-1@local` à `audit-bot-4@local`,
mot de passe `audit-bot-pass`. Ne pas utiliser en production.

## Tables créées

Chaque scénario crée une nouvelle table publique nommée `S1 / S2 / S3`. Les
tables ne sont **pas** supprimées en fin de run — c'est intentionnel pour
inspection post-run via le dashboard Convex. Nettoyage manuel via dashboard
si besoin.

## Sortie

Tout est loggé sur stdout au format `[ISO timestamp] [scenario] message`.
Les anomalies sont préfixées `⚠️`. Aucun fichier n'est écrit.

## Limitations connues

- Stacks initiaux égaux : les vrais side pots à montants différents
  nécessiteraient de jouer plusieurs mains pour creuser les stacks. À
  signaler comme finding si pertinent.
- Pas d'auth en mode "session" : on rappelle simplement les mutations
  signUp/signIn pour récupérer un userId. Les tokens de session ne sont
  pas gérés.
- Le harness n'est pas un test pérenne : il est dans `tests/legacy/` et
  sera retiré (ou industrialisé) après 1.B.
```

---

### Task 8: Smoke test du harness — vérification connectivité

**Files:** aucun (vérification)

- [ ] **Step 1: Test de connexion minimaliste**

Créer un fichier temporaire `/tmp/probe-convex.mjs` :

```javascript
import { ConvexHttpClient } from "convex/browser";
const c = new ConvexHttpClient("https://incredible-hedgehog-551.convex.cloud");
try {
  const r = await c.query("tables:getPublicTables", {});
  console.log("OK:", Array.isArray(r) ? `${r.length} tables` : r);
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
```

Run: `node /tmp/probe-convex.mjs`
Expected: `OK: N tables` (N >= 0).

Si fail "Cannot find package convex" → ajouter au rapport finding bloquant et utiliser fallback (smoke tests manuels uniquement, S1/S2/S3 inspectés via code statique).

Si fail réseau / 404 → vérifier l'URL du déploiement.

```bash
rm /tmp/probe-convex.mjs
```

---

### Task 9: Rédiger la checklist de smoke tests manuels

**Files:**
- Create: `docs/superpowers/specs/2026-05-04-audit-fonctionnel-checklist.md`

- [ ] **Step 1: Créer le fichier**

Contenu structuré comme suit (utiliser exactement) :

```markdown
# Checklist Smoke Tests — Audit Fonctionnel 0.B

**Objectif** : exécuter les 6 parcours MVP heads-up dans le navigateur et
remonter les anomalies. Durée estimée : 30-45 min.

## Setup (à faire une fois)

1. Terminal 1 : `npx convex dev` (laisser tourner)
2. Terminal 2 : `npm run dev` (laisser tourner, ouvrir l'URL affichée)
3. Navigateur : ouvrir l'URL en session normale **et** en navigation privée.
   Tu joueras Joueur A en normal, Joueur B en privé.

## Format des réponses

Pour chaque case, mets un statut + note courte si anomalie :
- ✅ ok
- ⚠️ glitch : brève description
- ❌ cassé : brève description

À la fin, copie-colle ce document rempli dans la conversation.

---

## Parcours 1 — Auth

- [ ] **1.1** Joueur A : signup avec un email neuf et un nom → arrive sur l'app loggé. Statut :
- [ ] **1.2** Joueur A : refresh la page (F5) → la session persiste. Statut :
- [ ] **1.3** Joueur A : signout → retour à l'écran de connexion. Statut :
- [ ] **1.4** Joueur A : signin avec les credentials créés en 1.1 → loggé. Statut :
- [ ] **1.5** Joueur A : signin avec un mauvais mot de passe → message d'erreur clair. Statut :
- [ ] **1.6** Joueur A : signup avec un email déjà utilisé → message d'erreur clair. Statut :
- [ ] **1.7** Joueur B (session privée) : signup avec un autre email → loggé en parallèle de A. Statut :

## Parcours 2 — Création table

- [ ] **2.1** Joueur A : créer une table cash, 2 joueurs max, blindes 5/10, stack 1000, privée → table créée. Statut :
- [ ] **2.2** Le code d'invitation est affiché clairement et copiable. Statut :
- [ ] **2.3** A est automatiquement assis à un siège (ou doit cliquer pour s'asseoir ?). Statut :
- [ ] **2.4** Champs invalides (smallBlind=0, maxPlayers=1) → bloqués ou message clair. Statut :

## Parcours 3 — Rejoindre table par code

- [ ] **3.1** Joueur B : entrer le code reçu de A → arrive sur la table. Statut :
- [ ] **3.2** B est assis à un siège libre. Statut :
- [ ] **3.3** A voit B arriver en temps réel (sans refresh). Statut :
- [ ] **3.4** Code invalide → erreur claire. Statut :
- [ ] **3.5** Casse de la casse (CODE en minuscules) → fonctionne ou message clair. Statut :

## Parcours 4 — Partie heads-up complète

- [ ] **4.1** A (créateur) clique "démarrer" → la partie commence. Statut :
- [ ] **4.2** Les 2 joueurs voient leurs 2 cartes privées (l'un ne voit pas celles de l'autre). Statut :
- [ ] **4.3** Les blindes sont posées correctement (SB par dealer, BB par l'autre). Statut :
- [ ] **4.4** Préflop : SB doit agir en premier (heads-up). Statut :
- [ ] **4.5** A peut call/fold/raise/all-in selon les options proposées. Statut :
- [ ] **4.6** Après que les 2 ont agi, le flop apparaît (3 cartes communautaires). Statut :
- [ ] **4.7** Postflop : BB doit agir en premier (heads-up). Statut :
- [ ] **4.8** Turn → river → showdown : les phases s'enchaînent correctement. Statut :
- [ ] **4.9** Au showdown, les 2 mains sont révélées et le gagnant est désigné. Statut :
- [ ] **4.10** Le pot est crédité au gagnant correctement. Statut :

## Parcours 5 — Multi-mains et élimination

- [ ] **5.1** Une fois la main 1 finie, la main 2 démarre (auto ou bouton). Statut :
- [ ] **5.2** Le dealer button a tourné (rotation correcte heads-up). Statut :
- [ ] **5.3** Les blindes sont posées par les bons joueurs cette fois. Statut :
- [ ] **5.4** Les cartes sont redistribuées (différentes des précédentes). Statut :
- [ ] **5.5** Faire une main avec un all-in : le perdant est éliminé ou reste à 0 ? (noter le comportement). Statut :
- [ ] **5.6** Si élimination : message de fin / retour vers l'écran d'accueil ? Statut :

## Parcours 6 — Sortir de la table

- [ ] **6.1** Joueur B clique "Quitter" entre 2 mains → quitte proprement. Statut :
- [ ] **6.2** Joueur A voit le départ de B en temps réel. Statut :
- [ ] **6.3** A se retrouve seul → la table revient à un état "waiting" ou message ? Statut :
- [ ] **6.4** Joueur B se déconnecte au milieu d'une main (clic Quitter pendant un tour) → fold auto ? Statut :
- [ ] **6.5** Le créateur de la table quitte → table supprimée ? Conservée ? Joueur restant éjecté ? Statut :

---

## Bilan synthétique

Compte ici à la fin :
- Total ✅ : __
- Total ⚠️ : __
- Total ❌ : __

Anomalies les plus gênantes (3 max) :
1.
2.
3.
```

---

### Task 10: Demander au user d'exécuter la checklist

**Files:** aucun (gate utilisateur)

- [ ] **Step 1: Notifier le user**

Message à envoyer :

> Checklist smoke disponible dans `docs/superpowers/specs/2026-05-04-audit-fonctionnel-checklist.md`.
>
> Pour la remplir :
> 1. Lance `npx convex dev` dans un terminal
> 2. Lance `npm run dev` dans un autre
> 3. Ouvre l'URL en session normale + navigation privée
> 4. Suis les ~30 cases (30-45 min). Note ✅/⚠️/❌ avec une courte description si anomalie.
> 5. Quand fini, colle le résultat dans la conversation.
>
> Pendant que tu fais ça, je lance le harness multi-joueurs en parallèle (S1, S2, S3) sur le déploiement dev.

- [ ] **Step 2: Attendre le retour user**

Le retour est un texte structuré (la checklist remplie). Le conserver pour Task 13.

---

### Task 11: Lancer le harness en parallèle

**Files:** aucun (exécution)

- [ ] **Step 1: S'assurer du `.env.local`**

Le harness utilise par défaut `https://incredible-hedgehog-551.convex.cloud`. Pas de config requise. Vérifier juste que le déploiement répond :

```bash
curl -sf -o /dev/null https://incredible-hedgehog-551.convex.cloud && echo "deploy reachable"
```

- [ ] **Step 2: Lancer S1**

```bash
node tests/legacy/audit-harness/index.mjs s1 2>&1 | tee .audit-tmp/s1.log
```

Expected: la séquence d'actions et les `softAssert` apparaissent dans le log. Aucun crash non géré (les `try/catch` de chaque action absorbent les erreurs et les loggent en `warn`).

- [ ] **Step 3: Lancer S2**

```bash
node tests/legacy/audit-harness/index.mjs s2 2>&1 | tee .audit-tmp/s2.log
```

- [ ] **Step 4: Lancer S3**

```bash
node tests/legacy/audit-harness/index.mjs s3 2>&1 | tee .audit-tmp/s3.log
```

- [ ] **Step 5: Extraire les findings**

Pour chaque log, identifier :
- Toutes les lignes `⚠️` (warnings/assertions FAIL)
- Toutes les actions qui ont crashé (`FAIL` sans warn)
- Les états finaux qui divergent de l'attendu

Convertir chaque anomalie en finding `B7.S{n}.{m}` avec sévérité.

---

### Task 12: Commit harness + checklist (avant les findings)

**Files:**
- Add: `tests/legacy/audit-harness/**`
- Add: `docs/superpowers/specs/2026-05-04-audit-fonctionnel-checklist.md`

- [ ] **Step 1: Vérifier git status**

```bash
git status --short
```

Expected: nouveaux fichiers harness + checklist.

- [ ] **Step 2: Commit**

```bash
git add tests/legacy/audit-harness docs/superpowers/specs/2026-05-04-audit-fonctionnel-checklist.md
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(audit): harness multi-joueurs et checklist smoke 0.B

Harness Node ESM (tests/legacy/audit-harness/) qui pilote le déploiement
Convex dev pour rejouer 3 scénarios: action ordering 4-way, side pots
3-way all-in, élimination en cours de main. Checklist de smoke tests
manuels dans docs/superpowers/specs/."
```

---

### Task 13: Consolider le rapport final

**Files:**
- Create: `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md`

- [ ] **Step 1: Structurer le rapport**

Sections obligatoires (ordre) :
1. **Métadonnées** : date, branche, commit de référence (avant audit), déploiement Convex utilisé, durée totale audit
2. **Résumé exécutif** : verdict 🟢/🟡/🔴, totaux par sévérité, 3-5 anomalies les plus critiques en liste
3. **Findings par parcours** :
   - Parcours 1 — Auth (B1.x)
   - Parcours 2 — Création table (B2.x)
   - Parcours 3 — Rejoindre table (B3.x)
   - Parcours 4 — Partie heads-up (B4.x)
   - Parcours 5 — Multi-mains / élimination (B5.x)
   - Parcours 6 — Sortir de la table (B6.x)
4. **Findings multi-joueurs scriptés** :
   - S1 — Action ordering (B7.S1.x)
   - S2 — Side pots (B7.S2.x)
   - S3 — Élimination (B7.S3.x)
5. **Tableau récapitulatif** : tous les IDs triés par sévérité puis ID
6. **Recommandations pour 1.B** : lots logiques (ex : lot auth, lot game flow, lot multi-hands…) avec estimation d'heures grossière

**Format finding** (cohérent avec 0.A) :

```
#### B{parcours}.{n} — {Titre}
- **Sévérité** : 🔴 | 🟡 | 🟢
- **Source** : statique | smoke | harness S{n}
- **Localisation** : `fichier:ligne` ou parcours UI
- **Description** : 1-3 phrases
- **Reproduction** : étapes minimales
- **Recommandation** : action concrète
```

- [ ] **Step 2: Remplir le rapport**

Trois sources de findings à intégrer :
1. **Audit statique** (Task 1) : findings B1.* à B6.*
2. **Smoke checklist** (Task 10 retour user) : enrichir B1 à B6 avec les anomalies remontées par le user
3. **Harness** (Task 11) : findings B7.S1.*, B7.S2.*, B7.S3.*

Pour chaque finding du smoke, remonter le statut user (⚠️ ou ❌) et la note exacte qu'il a fournie. Si une case ✅ → pas de finding.

Sévérités strictes :
- 🔴 = empêche de jouer une partie heads-up complète (ex : cartes pas distribuées, action bloquée, pas de showdown)
- 🟡 = la partie se joue mais comportement incorrect (ex : button qui tourne pas, désynchro 2s, message peu clair)
- 🟢 = visuel/UX mineur

- [ ] **Step 3: Rédiger les recommandations 1.B**

Proposer 3-6 lots, chaque lot référençant explicitement les IDs qu'il couvre :

Exemple :
- **Lot B1 — Auth & sessions** : findings B1.x (estimation Xh)
- **Lot B2 — Game flow heads-up** : B4.x + B5.x (estimation Xh)
- **Lot B3 — Multi-joueurs** : B7.S1.x + B7.S2.x + B7.S3.x (estimation Xh)
- **Lot B4 — UX cosmétique** : tous les 🟢 (estimation Xh)

- [ ] **Step 4: Self-review**

Vérifier :
- Tous les axes ont au moins une section (même `✅ aucun finding`)
- Chaque 🔴 empêche réellement la partie. Sinon → 🟡
- IDs sans trous (B1.1, B1.2 pas B1.1, B1.3)
- Recommandations 1.B référencent toutes les IDs des findings 🔴 et 🟡

Fixer inline si nécessaire.

---

### Task 14: Commit du rapport et nettoyage

**Files:**
- Add: `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md`
- Delete: `.audit-tmp/`

- [ ] **Step 1: Vérifier que `.audit-tmp/` est gitignore**

```bash
git status --ignored | grep audit-tmp || true
```

Expected: `.audit-tmp/` listé comme ignored ou pas listé du tout (pas dans staged).

- [ ] **Step 2: Commit du rapport**

```bash
git add docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "docs(audit): rapport audit fonctionnel 0.B

Findings consolidés: parcours MVP heads-up (B1-B6) + scénarios scriptés
multi-joueurs (B7.S1-S3). Sources: audit statique + smoke checklist user
+ harness Node. Recommandations regroupées en lots pour 1.B."
```

- [ ] **Step 3: Nettoyage**

```bash
rm -rf .audit-tmp
```

- [ ] **Step 4: Vérifier le commit**

```bash
git log -1 --stat
```

---

### Task 15: Bilan au user

**Files:** aucun

- [ ] **Step 1: Construire le message bilan (< 200 mots)**

```
Audit fonctionnel 0.B terminé.

📋 Rapport : docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md
🔧 Harness : tests/legacy/audit-harness/ (réutilisable)
✅ Checklist user : remplie

Verdict global : [🟢 / 🟡 / 🔴]
Findings : N🔴 / N🟡 / N🟢
- Audit statique : N findings
- Smoke checklist : N findings (anomalies remontées par toi)
- Harness S1/S2/S3 : N findings

Top 3-5 critiques :
1. B{x.y} — [titre]
2. ...

Lots de fix proposés pour 1.B :
- Lot B1 (auth) : Xh
- Lot B2 (game flow) : Xh
- Lot B3 (multi-joueurs) : Xh
- Lot B4 (cosmétique) : Xh

Tu valides le rapport ? On peut enchaîner sur le brainstorm de 1.B.
```

- [ ] **Step 2: Attendre validation user**

Ne pas invoquer brainstorming pour 1.B avant validation explicite.

---

## Self-Review

**Spec coverage** :
- ✅ Méthode hybride (statique + smoke + harness) → Tasks 1, 9-10, 3-8 + 11
- ✅ 6 parcours MVP heads-up audités → Task 1 (statique) + Task 9 (checklist)
- ✅ 3 scénarios multi-joueurs scriptés → Tasks 4, 5, 6
- ✅ Harness avec client `convex/browser` sur déploiement dev → Task 3 lib.mjs
- ✅ Sévérités 🔴/🟡/🟢 cohérentes 0.A → Tasks 1 et 13
- ✅ IDs stables `B{parcours}.{n}` → Task 13 step 1
- ✅ Rapport au format identique 0.A → Task 13
- ✅ R1 (`convex dev` casse) → géré par le smoke gate Task 8 (probe avant lancement)
- ✅ R2 (auth fail dans harness) → `ensureUser` fait fallback signin si signup échoue (lib.mjs)
- ✅ R3 (trop de findings) → couvert dans Task 13 step 4 self-review (rapporter même si stop précoce)
- ✅ R4 (checklist trop longue) → la checklist Task 9 est calibrée à ~30 cases, ~30-45 min
- ✅ Hors-scope respecté : aucune Task ne touche tournois, invitations, sécurité, perf, tables 7-9 joueurs

**Placeholder scan** : aucun TBD/TODO. Tous les fichiers livrables ont leur contenu intégral. Les findings remplis dans Task 13 sont par construction inconnus ex-ante (c'est l'audit qui les produit), mais le format et la procédure de remplissage sont entièrement spécifiés.

**Type consistency** :
- Les helpers `ensureUser`, `createAuditTable`, `joinTable`, `startGame`, `playerAction`, `snapshot`, `softAssert` sont définis Task 3 et utilisés cohéremment Tasks 4-6.
- Les chemins Convex strings (`auth:signUpWithPassword`, `tables:createTable`, `players:joinTable`, `core/gameEngine:startGame`, `core/gameEngine:playerAction`, `tables:getGameState`, `players:getTablePlayers`) suivent le format du `functionSpec` MCP vu en début de session.
- Les IDs `B{n}.{m}` sont introduits Task 13 step 1 et utilisés cohéremment.

Plan complet et auto-suffisant.
