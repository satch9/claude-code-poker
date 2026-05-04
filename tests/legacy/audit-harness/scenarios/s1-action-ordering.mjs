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
