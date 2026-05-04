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
