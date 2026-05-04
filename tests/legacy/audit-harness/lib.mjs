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
