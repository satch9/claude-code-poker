# Fix Production-Ready 1.C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le Lot C1 (14 fixes 🔴 sécu/prod) et le Lot C3 (24 hardening 🟡 sécu) du rapport 0.C — migration vers `@convex-dev/auth`, helper d'autorisation appliqué à 25 mutations, filtrage des cartes/deck, RNG crypto, rate limiting, password reset, validation renforcée.

**Architecture:** Migration de `convex/auth.ts` (flow custom) vers le Password provider de `@convex-dev/auth` déjà installé mais non câblé. Helper centralisé `convex/shared/auth.ts` (`requireUserId`, `requireSelf`, `requireTableCreator`) appliqué aux mutations sensibles. Helper de filtrage `sanitizePlayer` / `sanitizeGameState` pour les queries. `@convex-dev/rate-limiter` (composant officiel) pour signin/signup/playerAction. Wipe complet des comptes existants au début (mutation admin temporaire). TDD strict : 15 tests rouges écrits en premier.

**Tech Stack:** Convex 1.15 (déploiement dev `incredible-hedgehog-551`), `@convex-dev/auth@0.0.87` (à upgrader si besoin), `@convex-dev/rate-limiter` (à installer), vitest 3.2, React 18.

**Spec source:** `docs/superpowers/specs/2026-05-05-fix-prod-ready-1C-design.md`
**Audit source:** `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `convex/auth.config.ts` | Config Convex Auth (déjà présent) | Modify (vérifier/compléter) |
| `convex/auth.ts` | Anciens `signUpWithPassword` / `signInWithPassword` custom | **Replace** : devient un fichier qui re-exporte les mutations de `@convex-dev/auth` ou est supprimé |
| `convex/shared/auth.ts` | Helper `requireUserId`, `requireSelf`, `requireTableCreator` | **Create** |
| `convex/shared/sanitize.ts` | Helper `sanitizePlayer`, `sanitizeGameState` | **Create** |
| `convex/shared/validation.ts` | Schémas email/password renforcés | Modify |
| `convex/admin/wipeAccounts.ts` | Mutation admin temporaire (wipe + cleanup tables/players) | **Create** (supprimée Tâche 11) |
| `convex/players.ts` | Mutations `joinTable`, `leaveTable`, `rebuy`, suppression `updatePlayerChips` + `updatePlayerAction`, queries `getTablePlayers`/`getActivePlayers` à filtrer | Modify |
| `convex/tables.ts` | `createTable` + `getTableByInviteCode` (privacy + rate limit), `generateInviteCode` crypto | Modify |
| `convex/users.ts` | `updateUserProfile`, `generateAvatarUploadUrl` | Modify |
| `convex/core/gameEngine.ts` | `startGame`, `playerAction`, `advancePhase`, `advanceFromShowdown`, `forcePlayerFold`, `startNextHand`, queries qui filtrent `remainingDeck` | Modify |
| `convex/utils/poker.ts` | `shuffleDeck` → `crypto.getRandomValues()` | Modify |
| `convex/convex.config.ts` | Config composants : `@convex-dev/auth` + `@convex-dev/rate-limiter` | **Create** ou Modify |
| `convex/passwordReset.ts` | Mutations `requestPasswordReset` + `resetPassword` + table `passwordResetTokens` | **Create** |
| `convex/schema.ts` | Ajout `passwordResetTokens`, ajustements table `users` (suppression `password`/`passwordSalt` après migration) | Modify |
| `src/core/hooks/useAuth.ts` | Réécriture pour `@convex-dev/auth/react` | **Replace** |
| `src/core/components/Auth/*.tsx` | Adaptation aux nouveaux hooks | Modify |
| `src/core/components/Auth/PasswordResetForm.tsx` | Nouveau formulaire reset | **Create** |
| `src/main.tsx` | `ConvexAuthProvider` déjà wrappé — vérifier config | Modify mineur |
| `tests/security-c1.test.ts` | 15 tests TDD sécurité | **Create** |
| `tests/lib/auth-test.ts` | Helpers de test (signup/signin programmatique avec session) | **Create** |
| `.env.production` | Renommer en `.env.production.example`, ajouter à `.gitignore` | Move |
| `.gitignore` | Ajouter `.env.production` | Modify |
| `package.json` | Upgrade `@typescript-eslint/*` 6→8, `eslint` 8→9, ajout `@convex-dev/rate-limiter` | Modify |

---

## Pré-requis

- [ ] **Repo clean** : `git status` retourne "nothing to commit"
- [ ] **Convex dev disponible** : `npx convex dev` lançable (vérifier `.env.local` contient `CONVEX_DEPLOYMENT`)
- [ ] **Lecture des docs** : avant de démarrer, lire la doc de `@convex-dev/auth` Password provider (https://labs.convex.dev/auth/config/passwords) et `@convex-dev/rate-limiter` (https://www.convex.dev/components/rate-limiter). Cela lève les ambiguïtés R1/R2 du spec.

---

### Task 1 : Tests TDD rouges (étape 1 du spec)

**Findings cibles** : tous (les tests sont la spec exécutable).

**Files:**
- Create: `tests/security-c1.test.ts`
- Create: `tests/lib/auth-test.ts`

- [ ] **Step 1 : Lire la doc `@convex-dev/auth` côté serveur**

Le helper de test a besoin de savoir comment forger une session pour Bob/Alice côté harness Node. Vérifier la doc :

```bash
curl -s https://labs.convex.dev/auth/api_reference/server | head -100
```

Ou consulter `node_modules/@convex-dev/auth/dist/server/`. Identifier l'API exacte de `getAuthUserId(ctx)` (utilisée par le helper plus tard) et le mécanisme pour signer un JWT côté test.

- [ ] **Step 2 : Créer `tests/lib/auth-test.ts`**

Helpers de test. Le pattern dépend de la doc lue à l'étape 1. **Si** `@convex-dev/auth` expose une API publique de signin programmatique côté Node, l'utiliser. **Sinon**, fallback : créer le user directement en DB via une mutation admin de test (création directe en respectant le format `@convex-dev/auth`), puis appeler la mutation `signIn` officielle pour récupérer le token de session.

```typescript
// tests/lib/auth-test.ts
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

const DEPLOYMENT_URL = process.env.VITE_CONVEX_URL || 'https://incredible-hedgehog-551.convex.cloud';

export type AuthedClient = {
  client: ConvexHttpClient;
  userId: string;
  email: string;
  sessionToken?: string;
};

export function makeClient(): ConvexHttpClient {
  return new ConvexHttpClient(DEPLOYMENT_URL);
}

export async function signupAndSignIn(email: string, password: string, name: string): Promise<AuthedClient> {
  const client = makeClient();
  // Adapter selon l'API @convex-dev/auth identifiée à l'étape 1
  // Exemple si signature classique:
  await client.action(api.auth.signIn, { provider: 'password', flow: 'signUp', params: { email, password, name } });
  const session = await client.query(api.auth.loggedInUser, {});
  return { client, userId: session._id, email };
}

export async function expectThrowsUnauthorized(promise: Promise<unknown>) {
  try { await promise; throw new Error('Expected throw, got success'); }
  catch (e: any) {
    if (!String(e.message).match(/Unauthorized|RateLimited|Locked/)) {
      throw new Error(`Expected Unauthorized/RateLimited/Locked, got: ${e.message}`);
    }
  }
}
```

- [ ] **Step 3 : Créer `tests/security-c1.test.ts` avec les 15 tests**

```typescript
// tests/security-c1.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { signupAndSignIn, expectThrowsUnauthorized, makeClient, AuthedClient } from './lib/auth-test.js';
import { api } from '../convex/_generated/api.js';

let bob: AuthedClient;
let alice: AuthedClient;
let tableId: string;

beforeAll(async () => {
  bob = await signupAndSignIn(`bob-c1-${Date.now()}@test.local`, 'BobPass123!', 'Bob');
  alice = await signupAndSignIn(`alice-c1-${Date.now()}@test.local`, 'AlicePass123!', 'Alice');
  // Bob crée une table heads-up
  const t = await bob.client.mutation(api.tables.createTable, {
    name: 'sec-test', maxPlayers: 2, smallBlind: 5, bigBlind: 10,
    startingStack: 1000, isPrivate: true, gameType: 'cash',
  });
  tableId = t.tableId || t;
  await bob.client.mutation(api.players.joinTable, { tableId, seatPosition: 0, buyInAmount: 1000 });
  await alice.client.mutation(api.players.joinTable, { tableId, seatPosition: 1, buyInAmount: 1000 });
});

describe('C1 — Helper auth', () => {
  it('1. requireUserId throws when no auth', async () => {
    const anon = makeClient();
    await expectThrowsUnauthorized(anon.mutation(api.tables.createTable, {
      name: 'x', maxPlayers: 2, smallBlind: 5, bigBlind: 10, startingStack: 1000, isPrivate: false, gameType: 'cash',
    }));
  });

  it('2. requireSelf throws when caller != claimedUserId', async () => {
    // Bob essaie d'agir avec userId d'Alice
    await expectThrowsUnauthorized(bob.client.mutation(api.players.leaveTable, {
      tableId, userId: alice.userId,
    }));
  });
});

describe('C1 — Mutations 🔴 protégées', () => {
  it('3. playerAction with forged userId throws', async () => {
    await expectThrowsUnauthorized(bob.client.mutation(api.core.gameEngine.playerAction, {
      tableId, userId: alice.userId, action: 'fold', amount: 0,
    }));
  });

  it('4. startGame called by non-creator throws', async () => {
    await expectThrowsUnauthorized(alice.client.mutation(api.core.gameEngine.startGame, { tableId }));
  });

  it('5. advancePhase called by random user throws', async () => {
    await expectThrowsUnauthorized(alice.client.mutation(api.core.gameEngine.advancePhase, { tableId }));
  });

  it('6. forcePlayerFold no longer publicly callable', async () => {
    // Devient internalMutation → expect "function not found" ou Unauthorized
    await expectThrowsUnauthorized((async () => {
      // @ts-expect-error mutation may no longer exist publicly
      await bob.client.mutation('core/gameEngine:forcePlayerFold', { tableId, userId: alice.userId });
    })());
  });

  it('7. updatePlayerChips no longer in public API', async () => {
    await expectThrowsUnauthorized((async () => {
      // @ts-expect-error mutation removed
      await bob.client.mutation('players:updatePlayerChips', { playerId: 'fake', chips: 99999 });
    })());
  });

  it('8. updatePlayerAction no longer in public API', async () => {
    await expectThrowsUnauthorized((async () => {
      // @ts-expect-error mutation removed
      await bob.client.mutation('players:updatePlayerAction', { playerId: 'fake', action: 'fold' });
    })());
  });
});

describe('C1 — Filtrage queries', () => {
  it('9. getTablePlayers returns cards:[] for non-caller players', async () => {
    await bob.client.mutation(api.core.gameEngine.startGame, { tableId });
    const players = await alice.client.query(api.players.getTablePlayers, { tableId });
    const bobPlayer = players.find((p: any) => p.userId === bob.userId);
    expect(bobPlayer.cards).toEqual([]);
  });

  it('10. getGameState does not return remainingDeck', async () => {
    const state = await bob.client.query(api.core.gameEngine.getGameState, { tableId });
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
      try { await c.action(api.auth.signIn, { provider: 'password', flow: 'signIn', params: { email, password: 'wrong' } }); }
      catch { /* expected */ }
    }
    // 6ème = lockout
    await expectThrowsUnauthorized(c.action(api.auth.signIn, { provider: 'password', flow: 'signIn', params: { email, password: 'wrong' } }));
  });
});

describe('C3 — Mutations 🟡 protégées', () => {
  it('13. joinTable with forged userId throws', async () => {
    const t2 = await bob.client.mutation(api.tables.createTable, {
      name: 't2', maxPlayers: 2, smallBlind: 5, bigBlind: 10, startingStack: 1000, isPrivate: false, gameType: 'cash',
    });
    await expectThrowsUnauthorized(bob.client.mutation(api.players.joinTable, {
      tableId: t2.tableId || t2, userId: alice.userId, seatPosition: 0, buyInAmount: 1000,
    }));
  });

  it('14. createTable with forged creatorId throws', async () => {
    await expectThrowsUnauthorized(bob.client.mutation(api.tables.createTable, {
      name: 'x', maxPlayers: 2, smallBlind: 5, bigBlind: 10, startingStack: 1000, isPrivate: false,
      gameType: 'cash', creatorId: alice.userId,
    } as any));
  });
});

describe('C3 — Rate limit invitation', () => {
  it('15. getTableByInviteCode rate limited at 11th call/min/IP', async () => {
    const c = bob.client;
    for (let i = 0; i < 10; i++) {
      try { await c.query(api.tables.getTableByInviteCode, { code: 'ZZZ999' }); } catch {}
    }
    await expectThrowsUnauthorized(c.query(api.tables.getTableByInviteCode, { code: 'ZZZ999' }));
  });
});
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils sont rouges**

```bash
cd /var/www/vincent/claude-code-poker && npx vitest run tests/security-c1.test.ts
```

Expected: ≥ 13 tests **FAIL** (les tests 11 grep et certains autres peuvent être verts par coïncidence si le code est déjà bon ; les ~13 autres doivent fail).

Si certains tests échouent à se setup (auth helper ne marche pas), fixer le helper avant de continuer.

- [ ] **Step 5 : Commit**

```bash
git add tests/security-c1.test.ts tests/lib/auth-test.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
test(security): tests TDD rouges pour Lot C1

15 tests couvrant :
- Helper auth (requireUserId, requireSelf)
- Mutations 🔴 protégées (playerAction, startGame, advancePhase, forcePlayerFold, updatePlayerChips, updatePlayerAction)
- Filtrage queries (cards adverses, remainingDeck)
- RNG crypto (grep poker.ts)
- Rate limit signin
- Mutations 🟡 protégées (joinTable, createTable)
- Rate limit getTableByInviteCode

Tous rouges avant les fixes des tâches 2-11.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Migration `@convex-dev/auth` Password provider + wipe

**Findings cibles** : C1.1 (hash), C1.2 (sessions), C1.4 partiel (signin lockout — sera fini en Task 8).

**Files:**
- Modify: `package.json` (upgrade `@convex-dev/auth` 0.0.87 → 0.0.92)
- Modify: `convex/auth.config.ts`
- Replace: `convex/auth.ts`
- Create: `convex/admin/wipeAccounts.ts`
- Modify: `convex/schema.ts` (suppression champs `password`/`passwordSalt`, ajout tables `@convex-dev/auth`)
- Replace: `src/core/hooks/useAuth.ts`
- Modify: `src/core/components/Auth/SignInButton.tsx`, `EmailPasswordForm.tsx`, `UserProfile.tsx`
- Modify: `src/main.tsx` (vérifier config provider)

- [ ] **Step 1 : Upgrade `@convex-dev/auth` à la version stable**

```bash
cd /var/www/vincent/claude-code-poker && npm install @convex-dev/auth@^0.0.92
```

Vérifier `package.json` puis `npx convex dev --once` pour valider que les types se génèrent.

- [ ] **Step 2 : Configurer `convex/auth.config.ts`**

Lire le fichier existant. La config doit ressembler à :

```typescript
// convex/auth.config.ts
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

Si le fichier existant diffère, l'aligner. Garder les champs custom du `Password` provider si l'API permet (`name` lors du signup) — sinon stocker `name` séparément après signup.

- [ ] **Step 3 : Modifier `convex/schema.ts` pour `@convex-dev/auth`**

Le composant `@convex-dev/auth` exige les tables `authAccounts`, `authSessions`, etc. Pattern :

```typescript
// convex/schema.ts (extrait)
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    email: v.string(),
    name: v.string(),
    // SUPPRIMÉ: password, passwordSalt (gérés par @convex-dev/auth)
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    lastSeen: v.number(),
  }).index("by_email", ["email"]),
  // ... reste des tables existantes
});
```

Vérifier dans le code quels champs exacts sont actuellement dans `users` et garder tous sauf `password`/`passwordSalt`.

- [ ] **Step 4 : Remplacer `convex/auth.ts`**

Le nouveau `auth.ts` re-exporte les helpers de `@convex-dev/auth` :

```typescript
// convex/auth.ts
export { auth, signIn, signOut, store, isAuthenticated } from "./auth.config";

// Helper query pour récupérer le user authentifié (utilisé côté front via useAuth)
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
```

- [ ] **Step 5 : Créer `convex/admin/wipeAccounts.ts` (mutation temporaire)**

```typescript
// convex/admin/wipeAccounts.ts
import { internalMutation } from "../_generated/server";

export const wipeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Suppression cascade : players, gameStates, gameActions, tables, users, authAccounts, authSessions, etc.
    for (const t of ["players", "gameStates", "gameActions", "tables", "users", "authAccounts", "authSessions", "authRefreshTokens", "authVerificationCodes", "authVerifiers", "passwordResetTokens"] as const) {
      try {
        const docs = await ctx.db.query(t as any).collect();
        for (const d of docs) await ctx.db.delete(d._id);
      } catch (e) { console.log("skip", t, String(e)); }
    }
  },
});
```

- [ ] **Step 6 : Lancer le wipe**

```bash
cd /var/www/vincent/claude-code-poker && npx convex run admin/wipeAccounts:wipeAll '{}'
```

Expected: pas d'erreur, "skip <table>" si certaines tables n'existent pas.

⚠️ DESTRUCTIF — confirmer auprès de l'utilisateur avant exécution.

- [ ] **Step 7 : Réécrire `src/core/hooks/useAuth.ts`**

```typescript
// src/core/hooks/useAuth.ts
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

export function useAuth() {
  const { signIn: signInAction, signOut: signOutAction } = useAuthActions();
  const user = useQuery(api.auth.loggedInUser);
  const [error, setError] = useState<string | null>(null);
  const isLoading = user === undefined;
  const isAuthenticated = !!user;

  async function signIn(email: string, password: string) {
    setError(null);
    try { await signInAction("password", { email, password, flow: "signIn" }); }
    catch (e: any) { setError(e.message || "Sign in failed"); throw e; }
  }

  async function signUp(email: string, password: string, name: string) {
    setError(null);
    try { await signInAction("password", { email, password, name, flow: "signUp" }); }
    catch (e: any) { setError(e.message || "Sign up failed"); throw e; }
  }

  async function signOut() {
    setError(null);
    await signOutAction();
  }

  return { user, isLoading, isAuthenticated, error, signIn, signUp, signOut };
}
```

- [ ] **Step 8 : Adapter les composants Auth**

Lire `src/core/components/Auth/SignInButton.tsx`, `EmailPasswordForm.tsx`, `UserProfile.tsx`. Les adapter pour utiliser le nouveau `useAuth` (les signatures `signIn(email, password)` / `signUp(email, password, name)` / `signOut()` sont volontairement compatibles avec l'ancien hook). Si les composants utilisent des props internes spécifiques à l'ancien flow (ex. `userId` retourné par signin), refactor pour utiliser `user` retourné par `loggedInUser` query.

- [ ] **Step 9 : Vérifier `src/main.tsx`**

```typescript
// src/main.tsx (zone à vérifier)
<ConvexAuthProvider client={convex}>
  <App />
</ConvexAuthProvider>
```

Doit déjà être en place. Si pas, l'ajouter.

- [ ] **Step 10 : `npm run typecheck` puis push convex**

```bash
cd /var/www/vincent/claude-code-poker && npm run typecheck
```

Expected: exit 0. Si erreurs, fixer avant de continuer.

```bash
npx convex dev --once
```

Expected: déploiement OK.

- [ ] **Step 11 : Smoke manuel — re-signup**

Tu (l'user) ouvre `https://home-poker.vjdev.tech` après déploiement, fait un signup avec ton email, vérifie que tu peux te re-connecter en F5.

- [ ] **Step 12 : Commit**

```bash
git add convex/ src/ package.json package-lock.json
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(auth): migration vers @convex-dev/auth Password provider

- Replace custom signUp/signIn par @convex-dev/auth (0.0.92)
- Wipe complet des comptes existants (mutation admin temporaire)
- useAuth réécrit avec useAuthActions
- Suppression des champs password/passwordSalt de la table users
- Hash + sessions gérés par le composant officiel

Résout C1.1 (hash SHA-256), C1.2 (sessions sans révocation), C1.4 partiel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : Helper `convex/shared/auth.ts` + tests verts (étape 3 du spec)

**Findings cibles** : infra (verdit tests 1-2).

**Files:**
- Create: `convex/shared/auth.ts`

- [ ] **Step 1 : Créer le helper**

```typescript
// convex/shared/auth.ts
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireUserId(ctx: MutationCtx | QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthorized: not authenticated");
  return userId;
}

export async function requireSelf(
  ctx: MutationCtx | QueryCtx,
  claimedUserId: Id<"users">,
): Promise<Id<"users">> {
  const callerId = await requireUserId(ctx);
  if (callerId !== claimedUserId) {
    throw new ConvexError("Unauthorized: identity mismatch");
  }
  return callerId;
}

export async function requireTableCreator(
  ctx: MutationCtx,
  tableId: Id<"tables">,
): Promise<Id<"users">> {
  const callerId = await requireUserId(ctx);
  const table = await ctx.db.get(tableId);
  if (!table) throw new ConvexError("Table not found");
  if (table.creatorId !== callerId) {
    throw new ConvexError("Unauthorized: not creator");
  }
  return callerId;
}
```

- [ ] **Step 2 : Lancer les tests 1-2**

```bash
npx vitest run tests/security-c1.test.ts -t "requireUserId\|requireSelf"
```

Expected: les tests 1 et 2 ne sont **toujours pas verts** car aucune mutation ne les appelle encore. Skip pour l'instant — ils verdiront aux tâches 4+.

- [ ] **Step 3 : Tests typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4 : Commit**

```bash
git add convex/shared/auth.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(auth): helper requireUserId / requireSelf / requireTableCreator

Helper centralisé pour vérifier l'identité de l'appelant, à appliquer
dans les tâches 4 et 10 sur 25 mutations sensibles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : Helper appliqué aux mutations 🔴 (étape 4)

**Findings cibles** : C2.1, C2.2, C2.3, C2.4, C2.15.

**Files:**
- Modify: `convex/core/gameEngine.ts` (startGame, playerAction, advancePhase, advanceFromShowdown, forcePlayerFold)
- Modify: `convex/players.ts` (joinTable, leaveTable)

- [ ] **Step 1 : `playerAction` — appliquer `requireSelf`**

Modifier `convex/core/gameEngine.ts:235` (mutation `playerAction`). En tête du handler, **avant toute autre logique** :

```typescript
import { requireSelf } from "../shared/auth";

export const playerAction = mutation({
  args: { tableId: v.id("tables"), userId: v.id("users"), action: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // ... reste inchangé
  },
});
```

- [ ] **Step 2 : `startGame` — appliquer `requireTableCreator`**

```typescript
import { requireTableCreator } from "../shared/auth";

export const startGame = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await requireTableCreator(ctx, args.tableId);
    // ... reste inchangé
  },
});
```

- [ ] **Step 3 : `advancePhase` et `advanceFromShowdown` — `requireTableCreator`**

Même pattern. Ces mutations sont déclenchées par le créateur ou par scheduler interne. Pour les appels scheduler (s'il y en a), créer une `internalMutation` parallèle non-protégée qui contient la vraie logique, et l'appeler depuis le scheduler.

```typescript
// convex/core/gameEngine.ts
export const advancePhase = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await requireTableCreator(ctx, args.tableId);
    return advancePhaseInternal(ctx, args.tableId);
  },
});

export const advancePhaseInternal = internalMutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    // ... logique actuelle, sans auth
  },
});
```

Adapter les appels scheduler (`ctx.scheduler.runAfter(...)`) pour cibler la version `internal`.

- [ ] **Step 4 : `forcePlayerFold` — convertir en `internalMutation`**

C'est appelé par le scheduler de timeout, pas par l'UI. La conversion en `internalMutation` la rend inaccessible publiquement → résout C2.15 directement.

```typescript
// convex/core/gameEngine.ts
import { internalMutation } from "../_generated/server";

export const forcePlayerFold = internalMutation({  // <-- était mutation
  args: { tableId: v.id("tables"), userId: v.id("users") },
  handler: async (ctx, args) => {
    // ... logique inchangée
  },
});
```

Vérifier que les appels existants passent par `internal["core/gameEngine"].forcePlayerFold` côté scheduler — ils devraient déjà.

- [ ] **Step 5 : `joinTable` et `leaveTable` — `requireSelf`**

```typescript
// convex/players.ts
import { requireSelf } from "./shared/auth";

export const joinTable = mutation({
  args: { tableId: v.id("tables"), userId: v.id("users"), seatPosition: v.number(), buyInAmount: v.number() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // ... reste inchangé
  },
});

export const leaveTable = mutation({
  args: { tableId: v.id("tables"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // ... reste inchangé
  },
});
```

- [ ] **Step 6 : Lancer les tests TDD ciblés**

```bash
npx vitest run tests/security-c1.test.ts -t "playerAction\|startGame\|advancePhase\|forcePlayerFold\|requireSelf"
```

Expected: tests 2, 3, 4, 5, 6 verts.

- [ ] **Step 7 : `npm run typecheck`** → exit 0.

- [ ] **Step 8 : Commit**

```bash
git add convex/core/gameEngine.ts convex/players.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
fix(security): vérif identité sur 7 mutations 🔴

- playerAction, advancePhase, advanceFromShowdown : requireSelf/requireTableCreator
- startGame : requireTableCreator
- forcePlayerFold : converti en internalMutation
- joinTable, leaveTable : requireSelf

Résout C2.1, C2.2, C2.3, C2.4, C2.15.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : Suppression `updatePlayerChips` + `updatePlayerAction` (étape 5)

**Findings cibles** : C2.8, C2.9.

**Files:**
- Modify: `convex/players.ts` (suppression des 2 exports)

- [ ] **Step 1 : Grep statique des appelants front**

```bash
grep -rn "updatePlayerChips\|updatePlayerAction" /var/www/vincent/claude-code-poker/src/ /var/www/vincent/claude-code-poker/convex/ --include="*.ts" --include="*.tsx" | grep -v "_generated"
```

Si appelants trouvés dans `src/`, les refactorer pour passer par `playerAction` ou par une logique interne. Si appelants seulement dans `convex/` (helpers internes), les inliner ou les rendre `internalMutation`.

- [ ] **Step 2 : Supprimer les 2 exports dans `convex/players.ts`**

Supprimer les blocks `export const updatePlayerChips = mutation(...)` (lignes ~215-225) et `export const updatePlayerAction = mutation(...)` (lignes ~228-252).

- [ ] **Step 3 : `npm run typecheck`**

Si une erreur "function not exported" apparaît, l'appelant n'a pas été refactoré à l'étape 1 → revenir à l'étape 1.

- [ ] **Step 4 : `npx convex dev --once`** pour push.

- [ ] **Step 5 : Lancer tests 7-8**

```bash
npx vitest run tests/security-c1.test.ts -t "updatePlayerChips\|updatePlayerAction"
```

Expected: tests 7 et 8 verts.

- [ ] **Step 6 : Commit**

```bash
git add convex/players.ts
# + autres fichiers refactorés à l'étape 1 si applicable
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
chore(security): supprimer updatePlayerChips et updatePlayerAction

Mutations dangereuses : patch direct des chips/action sans validation.
Les chips changent uniquement via playerAction (via le moteur de jeu).

Résout C2.8, C2.9.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6 : Filtrage `cards` + suppression `remainingDeck` (étape 6)

**Findings cibles** : C4.3, C4.4.

**Files:**
- Create: `convex/shared/sanitize.ts`
- Modify: `convex/players.ts` (queries getTablePlayers, getActivePlayers)
- Modify: `convex/core/gameEngine.ts` (query getGameState)

- [ ] **Step 1 : Créer `convex/shared/sanitize.ts`**

```typescript
// convex/shared/sanitize.ts
import { Doc, Id } from "../_generated/dataModel";

export function sanitizePlayer(player: Doc<"players">, callerId: Id<"users"> | null) {
  if (!callerId || player.userId !== callerId) {
    return { ...player, cards: [] };
  }
  return player;
}

export function sanitizeGameState(state: Doc<"gameStates"> | null) {
  if (!state) return null;
  const { remainingDeck: _omit, ...rest } = state as any;
  return rest;
}
```

- [ ] **Step 2 : Appliquer `sanitizePlayer` dans `getTablePlayers` (`convex/players.ts:166-187`)**

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { sanitizePlayer } from "./shared/sanitize";

export const getTablePlayers = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    const players = await ctx.db.query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();
    return Promise.all(players.map(async (p) => {
      const user = await ctx.db.get(p.userId);
      return { ...sanitizePlayer(p, callerId), user };
    }));
  },
});
```

Idem pour `getActivePlayers` (`convex/players.ts:255-276`).

- [ ] **Step 3 : Appliquer `sanitizeGameState` dans `getGameState`**

Trouver la query `getGameState` dans `convex/core/gameEngine.ts` (env. ligne ~600+).

```typescript
import { sanitizeGameState } from "../shared/sanitize";

export const getGameState = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();
    return sanitizeGameState(state);
  },
});
```

Vérifier également les autres queries qui retournent `gameState` ou un sous-ensemble — s'assurer qu'aucune ne fuite `remainingDeck`.

- [ ] **Step 4 : Lancer tests 9-10**

```bash
npx vitest run tests/security-c1.test.ts -t "getTablePlayers\|getGameState"
```

Expected: tests 9 et 10 verts.

- [ ] **Step 5 : `npm run typecheck` + `npx convex dev --once`** → exit 0.

- [ ] **Step 6 : Commit**

```bash
git add convex/shared/sanitize.ts convex/players.ts convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
fix(security): filtrer cards adverses + ne pas exposer remainingDeck

- sanitizePlayer dans getTablePlayers / getActivePlayers
- sanitizeGameState dans getGameState (omet remainingDeck)
- Helper réutilisable dans convex/shared/sanitize.ts

Résout C4.3 (cartes privées exposées), C4.4 (deck prédictible).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 : RNG cryptographique (étape 7)

**Findings cibles** : C4.1, C4.2.

**Files:**
- Modify: `convex/utils/poker.ts` (shuffleDeck)
- Modify: `convex/tables.ts` (generateInviteCode)

- [ ] **Step 1 : Réécrire `shuffleDeck` dans `convex/utils/poker.ts:30-39`**

```typescript
// convex/utils/poker.ts (extrait)
function cryptoRandomInt(maxExclusive: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}

export function shuffleDeck(deck: string[]): string[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

⚠️ Le modulo introduit un biais minimal sur 32 bits / petit espace (52 cartes) — négligeable pour un poker home-game. Si on veut zéro biais, utiliser une boucle de rejet, mais YAGNI ici.

- [ ] **Step 2 : Réécrire `generateInviteCode` dans `convex/tables.ts:32`**

```typescript
// convex/tables.ts (helper en module-scope)
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateInviteCode(): string {
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((n) => ALPHABET[n % ALPHABET.length]).join("");
}

// Dans createTable, remplacer l'ancien `Math.random()...` par:
let code = generateInviteCode();
let attempts = 0;
while (attempts < 5) {
  const existing = await ctx.db.query("tables").withIndex("by_invite_code", (q) => q.eq("inviteCode", code)).first();
  if (!existing) break;
  code = generateInviteCode();
  attempts++;
}
```

- [ ] **Step 3 : Lancer test 11**

```bash
npx vitest run tests/security-c1.test.ts -t "shuffleDeck does not use Math.random"
```

Expected: test 11 vert.

- [ ] **Step 4 : Vérifier les autres usages de `Math.random` dans `convex/`**

```bash
grep -rn "Math.random" convex/ --include="*.ts" | grep -v "_generated"
```

Si d'autres usages existent et sont sécurité-sensibles (ex. génération de tokens), les migrer aussi. Pour les usages cosmétiques (animations, IDs front), garder.

- [ ] **Step 5 : `npm run typecheck && npx convex dev --once`** → exit 0.

- [ ] **Step 6 : Commit**

```bash
git add convex/utils/poker.ts convex/tables.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
fix(security): crypto.getRandomValues sur shuffle + invite code

- shuffleDeck Fisher-Yates avec crypto.getRandomValues
- generateInviteCode via crypto + check unicité avec retry max 5x
- Conserve longueur 6 chars (pas de change UX)

Résout C4.1, C4.2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8 : Rate limit signin + lockout (étape 8)

**Findings cibles** : C5.2, C1.4.

**Files:**
- Modify: `package.json` (ajout `@convex-dev/rate-limiter`)
- Create or Modify: `convex/convex.config.ts`
- Modify: `convex/auth.config.ts` (intégration callback rate limit sur signin)

- [ ] **Step 1 : Installer `@convex-dev/rate-limiter`**

```bash
cd /var/www/vincent/claude-code-poker && npm install @convex-dev/rate-limiter
```

- [ ] **Step 2 : Créer/modifier `convex/convex.config.ts`**

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(rateLimiter);
export default app;
```

- [ ] **Step 3 : Configurer le rate limiter dans un module dédié**

```typescript
// convex/shared/rateLimit.ts
import { RateLimiter, MINUTE, HOUR, SECOND } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  signIn: { kind: "fixed window", rate: 5, period: 15 * MINUTE },
  signUp: { kind: "fixed window", rate: 5, period: HOUR },
  createTable: { kind: "fixed window", rate: 10, period: MINUTE },
  joinTable: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
  playerAction: { kind: "token bucket", rate: 10, period: SECOND, capacity: 10 },
  inviteLookup: { kind: "fixed window", rate: 10, period: MINUTE },
  rebuy: { kind: "fixed window", rate: 5, period: MINUTE },
});
```

- [ ] **Step 4 : Hooker le rate limiter sur `signIn`**

L'API `@convex-dev/auth` permet d'utiliser un callback `onSuccess` ou un wrapper. Pattern :

```typescript
// convex/auth.config.ts (intégration rate limit)
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { rateLimiter } from "./shared/rateLimit";
import { ConvexError } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async beforeSignIn(ctx, { params }) {
      const email = (params as any)?.email;
      if (email) {
        const status = await rateLimiter.limit(ctx, "signIn", { key: email });
        if (!status.ok) throw new ConvexError("Locked: too many attempts, retry later");
      }
    },
  },
});
```

⚠️ L'API exacte du callback dépend de la version `@convex-dev/auth`. Si `beforeSignIn` n'existe pas, créer un wrapper `signInRateLimited` action publique qui appelle `rateLimiter.limit()` puis `signIn`. Le frontend utilise alors `signInRateLimited` au lieu du provider direct.

- [ ] **Step 5 : Lancer test 12**

```bash
npx vitest run tests/security-c1.test.ts -t "signIn 5 wrong attempts"
```

Expected: test 12 vert.

- [ ] **Step 6 : `npm run typecheck && npx convex dev --once`** → exit 0.

- [ ] **Step 7 : Commit**

```bash
git add convex/convex.config.ts convex/shared/rateLimit.ts convex/auth.config.ts package.json package-lock.json
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(security): rate limit signin + lockout 15min via @convex-dev/rate-limiter

- @convex-dev/rate-limiter installé et configuré dans convex.config.ts
- shared/rateLimit.ts : 7 limites (signIn, signUp, createTable, joinTable, playerAction, inviteLookup, rebuy)
- signIn : 5 tentatives / 15 min / email → lockout

Résout C5.2 (brute-force signin), C1.4 (lockout après échecs).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9 : `.env.production` + `npm audit fix` (étape 9)

**Findings cibles** : C9.1, C9.2.

**Files:**
- Move: `.env.production` → `.env.production.example`
- Modify: `.gitignore`
- Modify: `package.json` (upgrade `@typescript-eslint/*`, `eslint`)

- [ ] **Step 1 : Renommer `.env.production` en template**

```bash
cd /var/www/vincent/claude-code-poker
git mv .env.production .env.production.example
```

Éditer le `.env.production.example` pour remplacer les vraies URLs dev par des placeholders :

```env
# .env.production.example — copier en .env.production et remplir avec vos valeurs prod
VITE_CONVEX_URL=https://YOUR-PROD-DEPLOYMENT.convex.cloud
VITE_CONVEX_SITE_URL=https://YOUR-PROD-DEPLOYMENT.convex.site
```

- [ ] **Step 2 : Ajouter `.env.production` à `.gitignore`**

Éditer `.gitignore` :

```
# ... existants
.env.local
.env.production
```

- [ ] **Step 3 : Upgrade `@typescript-eslint/*` et `eslint`**

```bash
npm install --save-dev @typescript-eslint/eslint-plugin@^8 @typescript-eslint/parser@^8 eslint@^9
```

- [ ] **Step 4 : Si `eslint` 9 nécessite une nouvelle config (`eslint.config.js`)**

ESLint 9 exige `eslint.config.js` (flat config). Migrer si besoin :

```javascript
// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsparser },
    plugins: { '@typescript-eslint': tseslint },
    rules: { ...tseslint.configs.recommended.rules },
  },
];
```

⚠️ Si la config `.eslintrc.cjs` actuelle est complexe, la migration peut prendre 30+min. **Alternative** : conserver `eslint@8` (pas EOL critique pour 1.C, c'est dans hors-scope C5) et upgrader uniquement `@typescript-eslint/*` qui supporte `@typescript-eslint/parser@8` avec `eslint@8`. Vérifier compatibilité.

- [ ] **Step 5 : `npm audit fix --only=prod=false`**

```bash
npm audit fix --only=prod=false
```

Inspecter le diff `package-lock.json`. Si majors auto-bumpés (ex. `vite` 5→8), revert :

```bash
git checkout package-lock.json
# upgrade ciblé sans toucher vite
```

- [ ] **Step 6 : `npm audit` final**

```bash
npm audit --audit-level=high
```

Expected: 0 vulnérabilités HIGH ou CRITICAL.

- [ ] **Step 7 : `npm run typecheck && npm run lint && npx vitest run`** → tout exit 0.

- [ ] **Step 8 : Commit**

```bash
git add .env.production.example .gitignore package.json package-lock.json eslint.config.js .eslintrc.cjs
# Note: l'ancien .env.production a été git mv'd, déjà staged
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
chore(prod): .env.production gitignored + npm audit fix sur deps build

- .env.production renommé en .env.production.example (template)
- .env.production ajouté au .gitignore
- @typescript-eslint/* upgrade 6 → 8
- eslint upgrade conditionnel (8 → 9 ou maintenu si config trop complexe)
- npm audit : 0 HIGH/CRITICAL

Résout C9.1 (env tracked), C9.2 (CVE HIGH dans build deps).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10 : Helper appliqué aux mutations 🟡 + privacy invite code (étape 10)

**Findings cibles** : C2.5, C2.6, C2.7, C2.10, C2.11, C2.12, C2.16, C2.20.

**Files:**
- Modify: `convex/tables.ts` (createTable + getTableByInviteCode)
- Modify: `convex/users.ts` (updateUserProfile, generateAvatarUploadUrl)
- Modify: `convex/players.ts` (rebuy)
- Modify: `convex/core/gameEngine.ts` (startNextHand)

- [ ] **Step 1 : `createTable` — `requireUserId` (l'arg `creatorId` devient redondant)**

```typescript
// convex/tables.ts
import { requireUserId } from "./shared/auth";

export const createTable = mutation({
  args: { name: v.string(), maxPlayers: v.number(), smallBlind: v.number(), bigBlind: v.number(),
          startingStack: v.number(), isPrivate: v.boolean(), gameType: v.string() },
  handler: async (ctx, args) => {
    const creatorId = await requireUserId(ctx);
    // ... reste, en utilisant creatorId au lieu de args.creatorId
  },
});
```

⚠️ `creatorId` retiré de `args`. Adapter les appelants front (`src/`) pour ne plus le passer.

- [ ] **Step 2 : `updateUserProfile`, `generateAvatarUploadUrl` — `requireSelf`**

```typescript
// convex/users.ts
import { requireSelf, requireUserId } from "./shared/auth";

export const updateUserProfile = mutation({
  args: { userId: v.id("users"), name: v.optional(v.string()), /* ... */ },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // ... reste inchangé
  },
});

export const generateAvatarUploadUrl = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // ... reste
  },
});
```

- [ ] **Step 3 : `rebuy` — `requireSelf`**

```typescript
// convex/players.ts (rebuy)
export const rebuy = mutation({
  args: { tableId: v.id("tables"), userId: v.id("users"), amount: v.number() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // ... reste
  },
});
```

- [ ] **Step 4 : `startNextHand` — `requireTableCreator`**

```typescript
// convex/core/gameEngine.ts (startNextHand)
export const startNextHand = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await requireTableCreator(ctx, args.tableId);
    // ... reste
  },
});
```

- [ ] **Step 5 : `getTableByInviteCode` — privacy + rate limit**

```typescript
// convex/tables.ts
import { rateLimiter } from "./shared/rateLimit";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getTableByInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // Rate limit par caller (userId si authentifié, sinon anonyme global)
    const callerId = await getAuthUserId(ctx);
    const status = await rateLimiter.limit(ctx, "inviteLookup", { key: callerId ?? "anonymous" });
    if (!status.ok) throw new ConvexError("RateLimited: too many lookups");

    const table = await ctx.db.query("tables").withIndex("by_invite_code", (q) => q.eq("inviteCode", args.code)).first();
    if (!table) return null;
    // Privacy : si table privée, n'exposer que si caller est dans players
    if (table.isPrivate) {
      if (!callerId) return null;
      const isMember = await ctx.db.query("players").withIndex("by_table", (q) => q.eq("tableId", table._id))
        .filter((q) => q.eq(q.field("userId"), callerId)).first();
      if (!isMember) return null;
    }
    return table;
  },
});
```

- [ ] **Step 6 : Lancer tests 13-14**

```bash
npx vitest run tests/security-c1.test.ts -t "joinTable with forged\|createTable with forged"
```

Expected: tests 13 et 14 verts.

- [ ] **Step 7 : `npm run typecheck && npx convex dev --once`** → exit 0.

- [ ] **Step 8 : Commit**

```bash
git add convex/tables.ts convex/users.ts convex/players.ts convex/core/gameEngine.ts src/
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
fix(security): vérif identité sur 9 mutations 🟡 + privacy invite code

- createTable : requireUserId (creatorId implicite)
- updateUserProfile, generateAvatarUploadUrl, rebuy : requireSelf
- startNextHand : requireTableCreator
- getTableByInviteCode : filtre isPrivate (caller doit être dans players)
- getTableByInviteCode : rate limit 10/min/caller

Résout C2.5, C2.6, C2.7, C2.10, C2.11, C2.12, C2.16, C2.20.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11 : Rate limit global + password reset + validation renforcée (étape 11)

**Findings cibles** : C1.3, C3.4, C3.5, C5.1, C5.3, C5.4, C5.5, C5.6, C5.7, C5.8, C5.9.

**Files:**
- Modify: `convex/auth.config.ts` (rate limit signUp dans `beforeSignIn` ou équivalent)
- Modify: `convex/tables.ts` (rate limit createTable)
- Modify: `convex/players.ts` (rate limit joinTable, playerAction, rebuy)
- Modify: `convex/core/gameEngine.ts` (rate limit playerAction)
- Create: `convex/passwordReset.ts`
- Modify: `convex/schema.ts` (table `passwordResetTokens`)
- Modify: `convex/shared/validation.ts` (email RFC + password entropie)
- Create: `src/core/components/Auth/PasswordResetForm.tsx`
- Modify: routing front pour `/reset?token=...`

- [ ] **Step 1 : Rate limit sur signUp, createTable, joinTable, playerAction, rebuy**

Dans chaque mutation, en tête du handler **après** `requireSelf`/`requireUserId` :

```typescript
const status = await rateLimiter.limit(ctx, "createTable", { key: callerId });
if (!status.ok) throw new ConvexError("RateLimited");
```

Pour `signUp` : utiliser le callback `beforeSignIn` (côté `auth.config.ts`) avec branche `flow === 'signUp'` et clé IP (récupérable via `ctx.auth` headers ou `request.headers.get('x-forwarded-for')` selon la doc).

- [ ] **Step 2 : Renforcer `convex/shared/validation.ts`**

```typescript
// convex/shared/validation.ts
import { z } from "zod";

export const emailSchema = z.string()
  .min(5).max(255)
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format")
  .refine((s) => !s.endsWith(".c"), "TLD too short");

export const passwordSchema = z.string().refine(
  (p) => p.length >= 12 || (p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)),
  "Password must be ≥12 chars OR ≥8 chars with uppercase + digit + special",
);

export const userNameSchema = z.string().min(1).max(50);

export function validateOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new ConvexError(r.error.errors[0].message);
  return r.data;
}
```

⚠️ Veiller à ce que ces schémas soient invoqués dans le `Password` provider config si possible, ou dans un wrapper `signUp` custom.

- [ ] **Step 3 : Ajouter table `passwordResetTokens` dans `convex/schema.ts`**

```typescript
// convex/schema.ts
passwordResetTokens: defineTable({
  token: v.string(),
  userId: v.id("users"),
  expiresAt: v.number(),
}).index("by_token", ["token"]),
```

- [ ] **Step 4 : Créer `convex/passwordReset.ts`**

```typescript
// convex/passwordReset.ts
import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { passwordSchema, validateOrThrow } from "./shared/validation";

const TOKEN_TTL_MS = 15 * 60 * 1000;

function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", args.email)).first();
    // Toujours retourner success (anti-énumération)
    if (!user) return { ok: true };
    const token = generateResetToken();
    await ctx.db.insert("passwordResetTokens", { token, userId: user._id, expiresAt: Date.now() + TOKEN_TTL_MS });
    // Envoi email via Resend (déjà configuré pour Invitations)
    await ctx.scheduler.runAfter(0, "sendResetEmailInternal" as any, { email: args.email, token });
    return { ok: true };
  },
});

export const resetPassword = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    validateOrThrow(passwordSchema, args.newPassword);
    const t = await ctx.db.query("passwordResetTokens").withIndex("by_token", (q) => q.eq("token", args.token)).first();
    if (!t || t.expiresAt < Date.now()) throw new ConvexError("Invalid or expired token");
    // Appel API @convex-dev/auth pour reset le password
    // L'API exacte dépend de la version — voir doc. Pattern attendu : modifier l'auth account password.
    // Si pas d'API directe, fallback : supprimer l'auth account et recréer.
    // À adapter à l'étape 1 de cette tâche après lecture de la doc.
    await ctx.db.delete(t._id);
    return { ok: true };
  },
});
```

⚠️ L'étape "Appel API `@convex-dev/auth` pour reset le password" est l'angle mort connu (R2 du spec). À adapter selon la doc. Si la lib expose `auth.changePassword(userId, newPassword)` ou équivalent, l'utiliser. Sinon, fallback documenté plus bas.

**Fallback** si pas d'API directe : supprimer le `authAccount` du user via `ctx.runMutation(internal.authAccountInternal.deleteByUserId, { userId })` puis appeler `signIn` avec `flow: 'signUp'` programmatiquement (ce qui re-crée l'auth account). Risque : casse les sessions actives. Acceptable pour un reset.

- [ ] **Step 5 : Créer le frontend `PasswordResetForm.tsx`**

```typescript
// src/core/components/Auth/PasswordResetForm.tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function PasswordResetForm() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const reset = useMutation(api.passwordReset.resetPassword);
  const [pwd, setPwd] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!token) return <div>Invalid reset link.</div>;
  if (done) return <div>Password reset. <a href="/">Sign in</a></div>;

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      try { await reset({ token, newPassword: pwd }); setDone(true); }
      catch (e: any) { setErr(e.message); }
    }}>
      <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password (≥12 chars)" required />
      <button type="submit">Reset password</button>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </form>
  );
}
```

Ajouter une route ou condition dans `AppMain.tsx` : si `window.location.pathname === "/reset"`, render `PasswordResetForm`.

Ajouter aussi un bouton "Forgot password ?" dans `EmailPasswordForm.tsx` qui ouvre une modale demandant l'email et appelle `requestPasswordReset`.

- [ ] **Step 6 : Lancer test 15**

```bash
npx vitest run tests/security-c1.test.ts -t "getTableByInviteCode rate limited"
```

Expected: test 15 vert.

- [ ] **Step 7 : Lancer toute la suite TDD**

```bash
npx vitest run tests/security-c1.test.ts
```

Expected: 15/15 verts.

- [ ] **Step 8 : Lancer `npm run typecheck && npm run lint && npx vitest run`** → tout exit 0.

- [ ] **Step 9 : Smoke manuel password reset**

Sur `https://home-poker.vjdev.tech` après déploiement :
1. Cliquer "Forgot password" → entrer ton email
2. Recevoir l'email Resend
3. Cliquer le lien → entrer un nouveau mot de passe
4. Sign in avec le nouveau password → succès

- [ ] **Step 10 : Commit final**

```bash
git add convex/ src/ package.json package-lock.json
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(security): rate limit global + password reset + validation renforcée

- Rate limit sur signup, createTable, joinTable, playerAction, rebuy
- Password reset flow : requestPasswordReset + email Resend + resetPassword
- Email regex RFC 5322 + password entropie (≥12 chars OU 8+maj+chiffre+spécial)
- Frontend PasswordResetForm + bouton "Forgot password"

Résout C1.3, C3.4, C3.5, C5.1, C5.3, C5.4, C5.5, C5.6, C5.7, C5.8, C5.9.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 11 : Supprimer la mutation admin temporaire**

```bash
rm convex/admin/wipeAccounts.ts
# Si dossier convex/admin/ vide, le supprimer aussi
rmdir convex/admin/ 2>/dev/null || true
git add -u
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore: supprimer la mutation admin temporaire wipeAccounts"
```

---

## Critères de sortie globaux

- [ ] `npm run typecheck` exit 0
- [ ] `npm run lint` exit 0
- [ ] `npx vitest run` exit 0, **15/15 tests `tests/security-c1.test.ts` verts**
- [ ] `npm audit --audit-level=high` : 0 vulnérabilités HIGH ou CRITICAL
- [ ] `.env.production` n'apparaît plus dans `git ls-files`
- [ ] Smoke test manuel sur `home-poker.vjdev.tech` :
  - Signup neuf après wipe → réussi
  - Partie heads-up complète (preflop → showdown) → gagnant correct
  - DevTools : `playerAction({ userId: <autre> })` → throw `Unauthorized`
  - DevTools : payload `getTablePlayers` → `cards: []` pour les autres
  - DevTools : payload `getGameState` → pas de `remainingDeck`
  - 6 tentatives signin wrong password → 6ème throw `Locked`
  - Password reset (request → email → reset → resignin) → réussi

## Risques (rappel du spec)

- **R1** Migration `@convex-dev/auth` plus longue qu'estimée → upgrade en isolation au début Tâche 2
- **R2** `getAuthUserId` API spécifique → lecture doc en pré-requis
- **R3** Helper rend `userId` arg redondant → adapter callers front
- **R4** Suppression `updatePlayerChips`/`updatePlayerAction` casse callers → grep préalable Tâche 5 Step 1
- **R5** `npm audit fix` agressif → `--only=prod=false` + inspection diff
- **R6** Tests TDD nécessitent auth helper → Tâche 1 Step 1 dépend de la doc
- **R7** Lockout signin par email seul → clé `(email, IP)` composite si la doc le permet, sinon email seul accepté
- **R8** Wipe déconnecte tout → re-signup user en premier après Tâche 2

## Suite

Une fois 1.C validé par toi (auto + smoke), invoquer `superpowers:brainstorming` pour la phase suivante :
- **C4** (perf 🟡) — recommandé si > 4 joueurs simultanés prévus
- **C5** (deps majeures `convex` 1.25→1.37, `vite` 5→8) — recommandé avant tout nouveau gros lot fonctionnel
