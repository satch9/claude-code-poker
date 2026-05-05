// tests/security-c1.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  signupAndSignIn,
  expectThrowsUnauthorized,
  makeClient,
  AuthedClient,
} from './lib/auth-test.js';
import { api } from '../convex/_generated/api.js';

let bob: AuthedClient;
let alice: AuthedClient;
let tableId: string;

beforeAll(async () => {
  bob = await signupAndSignIn(`bob-c1-${Date.now()}@test.local`, 'BobPass123!', 'Bob');
  alice = await signupAndSignIn(`alice-c1-${Date.now()}@test.local`, 'AlicePass123!', 'Alice');
  // Bob crée une table heads-up
  const t: any = await bob.client.mutation(api.tables.createTable, {
    name: 'sec-test',
    maxPlayers: 2,
    smallBlind: 5,
    bigBlind: 10,
    startingStack: 1000,
    isPrivate: true,
    gameType: 'cash',
  } as any);
  tableId = t.tableId || t;
  await bob.client.mutation(api.players.joinTable, {
    tableId,
    seatPosition: 0,
    buyInAmount: 1000,
  } as any);
  await alice.client.mutation(api.players.joinTable, {
    tableId,
    seatPosition: 1,
    buyInAmount: 1000,
  } as any);
});

describe('C1 — Helper auth', () => {
  it('1. requireUserId throws when no auth', async () => {
    const anon = makeClient();
    await expectThrowsUnauthorized(
      anon.mutation(api.tables.createTable, {
        name: 'x',
        maxPlayers: 2,
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000,
        isPrivate: false,
        gameType: 'cash',
      } as any),
    );
  });

  it('2. requireSelf throws when caller != claimedUserId', async () => {
    // Bob essaie d'agir avec userId d'Alice
    await expectThrowsUnauthorized(
      bob.client.mutation(api.players.leaveTable, {
        tableId,
        userId: alice.userId,
      } as any),
    );
  });
});

describe('C1 — Mutations 🔴 protégées', () => {
  it('3. playerAction with forged userId throws', async () => {
    await expectThrowsUnauthorized(
      bob.client.mutation(api.core.gameEngine.playerAction, {
        tableId,
        userId: alice.userId,
        action: 'fold',
        amount: 0,
      } as any),
    );
  });

  it('4. startGame called by non-creator throws', async () => {
    await expectThrowsUnauthorized(
      alice.client.mutation(api.core.gameEngine.startGame, { tableId } as any),
    );
  });

  it('5. advancePhase called by random user throws', async () => {
    await expectThrowsUnauthorized(
      alice.client.mutation(api.core.gameEngine.advancePhase, { tableId } as any),
    );
  });

  it('6. forcePlayerFold no longer publicly callable', async () => {
    // Devient internalMutation → expect "function not found" ou Unauthorized
    await expectThrowsUnauthorized(
      (async () => {
        // @ts-expect-error mutation may no longer exist publicly
        await bob.client.mutation('core/gameEngine:forcePlayerFold', {
          tableId,
          userId: alice.userId,
        });
      })(),
    );
  });

  it('7. updatePlayerChips no longer in public API', async () => {
    await expectThrowsUnauthorized(
      (async () => {
        // @ts-expect-error mutation removed
        await bob.client.mutation('players:updatePlayerChips', {
          playerId: 'fake',
          chips: 99999,
        });
      })(),
    );
  });

  it('8. updatePlayerAction no longer in public API', async () => {
    await expectThrowsUnauthorized(
      (async () => {
        // @ts-expect-error mutation removed
        await bob.client.mutation('players:updatePlayerAction', {
          playerId: 'fake',
          action: 'fold',
        });
      })(),
    );
  });
});

describe('C1 — Filtrage queries', () => {
  it('9. getTablePlayers returns cards:[] for non-caller players', async () => {
    await bob.client.mutation(api.core.gameEngine.startGame, { tableId } as any);
    const players: any = await alice.client.query(api.players.getTablePlayers, {
      tableId,
    } as any);
    const bobPlayer = players.find((p: any) => p.userId === bob.userId);
    expect(bobPlayer.cards).toEqual([]);
  });

  it('10. getGameState does not return remainingDeck', async () => {
    const state: any = await bob.client.query(api.core.gameEngine.getGameState, {
      tableId,
    } as any);
    expect((state as any).remainingDeck).toBeUndefined();
  });
});

describe('C1 — RNG crypto', () => {
  it('11. shuffleDeck does not use Math.random (grep)', () => {
    const src = readFileSync('convex/utils/poker.ts', 'utf-8');
    expect(src).not.toMatch(/Math\.random/);
    expect(src).toMatch(/crypto\.getRandomValues/);
  });
});

describe('C1 — Rate limit signin', () => {
  it('12. signIn 5 wrong attempts then locked', async () => {
    const email = `lock-${Date.now()}@test.local`;
    const c = makeClient();
    // 5 tentatives wrong password (compte inexistant = même path d'erreur)
    for (let i = 0; i < 5; i++) {
      try {
        await (c as any).action(api.auth.signIn, {
          provider: 'password',
          params: { email, password: 'wrong', flow: 'signIn' },
        });
      } catch {
        /* expected */
      }
    }
    // 6ème = lockout
    await expectThrowsUnauthorized(
      (c as any).action(api.auth.signIn, {
        provider: 'password',
        params: { email, password: 'wrong', flow: 'signIn' },
      }),
    );
  });
});

describe('C3 — Mutations 🟡 protégées', () => {
  it('13. joinTable with forged userId throws', async () => {
    const t2: any = await bob.client.mutation(api.tables.createTable, {
      name: 't2',
      maxPlayers: 2,
      smallBlind: 5,
      bigBlind: 10,
      startingStack: 1000,
      isPrivate: false,
      gameType: 'cash',
    } as any);
    await expectThrowsUnauthorized(
      bob.client.mutation(api.players.joinTable, {
        tableId: t2.tableId || t2,
        userId: alice.userId,
        seatPosition: 0,
        buyInAmount: 1000,
      } as any),
    );
  });

  it('14. createTable with forged creatorId throws', async () => {
    await expectThrowsUnauthorized(
      bob.client.mutation(api.tables.createTable, {
        name: 'x',
        maxPlayers: 2,
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000,
        isPrivate: false,
        gameType: 'cash',
        creatorId: alice.userId,
      } as any),
    );
  });
});

describe('C3 — Rate limit invitation', () => {
  it('15. getTableByInviteCode rate limited at 11th call/min/IP', async () => {
    const c = bob.client;
    for (let i = 0; i < 10; i++) {
      try {
        await c.query(api.tables.getTableByInviteCode, { code: 'ZZZ999' } as any);
      } catch {}
    }
    await expectThrowsUnauthorized(
      c.query(api.tables.getTableByInviteCode, { code: 'ZZZ999' } as any),
    );
  });
});
