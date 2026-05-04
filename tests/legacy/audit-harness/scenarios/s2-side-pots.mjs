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
