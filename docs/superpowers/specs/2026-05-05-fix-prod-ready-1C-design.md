# Spec — Fix production-ready 1.C

**Date** : 2026-05-05
**Phase** : 1.C (implémentation)
**Source** : `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md`
**Phase précédente** : 0.C (audit production-ready, terminée — 71 findings, 14 🔴)
**Phase suivante** : C4 (perf 🟡) ou C5 (deps majeures), à brainstormer après 1.C

## Contexte

L'audit 0.C a révélé 71 findings dont 14 🔴 critiques :
- 16 mutations Convex sans vérification d'identité (impersonation triviale)
- Cartes adverses + `remainingDeck` exposés côté client
- `shuffleDeck` utilise `Math.random()` (RNG faible)
- Aucun rate limit sur signin (brute-force trivial)
- Hash SHA-256 single-pass (faible)
- `.env.production` tracked dans git avec IDs dev
- 9 CVE HIGH dans la chaîne de build

Inspection du code a confirmé un point d'architecture critique : le flow auth actuel est **custom** (`signUpWithPassword`/`signInWithPassword` avec hash maison + session localStorage), alors que `ConvexAuthProvider` est wrappé dans `main.tsx` mais jamais utilisé. Résultat : `ctx.auth.getUserIdentity()` retourne `null`. Impossible de fixer C2.x sans repenser l'auth.

## Objectif

Appliquer le Lot C1 (14 fixes 🔴 sécu/prod) et le Lot C3 (24 hardening 🟡 sécu) du rapport 0.C. À la fin de 1.C, l'application peut être ouverte à un cercle restreint authentifié sans risque trivial : aucune mutation n'est exploitable par usurpation, les cartes privées sont serveur-only, le shuffle est crypto-secure, les déploiements n'utilisent plus d'IDs dev en prod, les CVE HIGH sont patchées, le rate limiting est en place, le password reset existe.

## Périmètre — IN

- **Lot C1** Critiques sécu (auth migration, helper, filtrage cartes, RNG, rate limit signin, env, CVE) — ~12h
- **Lot C3** Hardening sécu (helper appliqué partout, rate limiting global, password reset, validation renforcée) — ~4h

## Périmètre — OUT (reporté)

- **Lot C2** (perf 🔴) — aucun finding, sans objet
- **Lot C4** (perf 🟡 : N+1, rerenders, bundle) — phase dédiée
- **Lot C5** (deps majeures `convex` 1.25→1.37, `vite` 5→8) — phase dédiée
- Findings 🟢 — triage à faire en fin de 1.C ou plus tard
- C9.4-C9.6 (deps mineures non bloquantes)

## Décisions clés (locks brainstorm)

| Lock | Choix |
|---|---|
| Scope | C1 + C3 |
| Architecture auth | Migration vers `@convex-dev/auth` Password provider |
| Migration comptes existants | Wipe complet + re-signup |
| Framework rate limiting | `@convex-dev/rate-limiter` (composant officiel) |
| Stratégie de tests | TDD strict — ~15 tests rouges écrits en premier |

## Architecture

### Migration auth

`@convex-dev/auth` Password provider remplace `convex/auth.ts`. La table `users` reste mais les champs `password` et `passwordSalt` sont supprimés (gérés par `@convex-dev/auth` dans une table dédiée). Le frontend `useAuth` est réécrit pour utiliser les hooks de `@convex-dev/auth/react`. Wipe en début de phase via une mutation admin temporaire `convex/admin/wipeAccounts.ts` (supprimée à la fin de 1.C).

### Helper d'autorisation

```ts
// convex/shared/auth.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

export async function requireUserId(ctx: MutationCtx | QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthorized: not authenticated");
  return userId;
}

export async function requireSelf(ctx, claimedUserId: Id<"users">): Promise<Id<"users">> {
  const callerId = await requireUserId(ctx);
  if (callerId !== claimedUserId) throw new ConvexError("Unauthorized: identity mismatch");
  return callerId;
}

export async function requireTableCreator(ctx, tableId: Id<"tables">): Promise<Id<"users">> {
  const callerId = await requireUserId(ctx);
  const table = await ctx.db.get(tableId);
  if (!table || table.creatorId !== callerId) throw new ConvexError("Unauthorized: not creator");
  return callerId;
}
```

Appliqué à 25 mutations (16 🔴 + 9 🟡). Pattern récurrent : ~3 lignes par mutation.

### Filtrage des champs sensibles

`getTablePlayers` et `getActivePlayers` : helper `sanitizePlayer(player, callerId)` qui retourne `{ ...player, cards: player.userId === callerId ? player.cards : [] }`. `getGameState` : helper `sanitizeGameState(state)` qui supprime le champ `remainingDeck` du retour.

### RNG cryptographique

`convex/utils/poker.ts` : `Math.random()` → `crypto.getRandomValues()` dans `shuffleDeck`. Idem pour `generateInviteCode` dans `convex/tables.ts`.

### Suppression mutations dangereuses

`updatePlayerChips` (C2.8) et `updatePlayerAction` (C2.9) supprimées entièrement. Vérification statique préalable qu'aucun appelant côté front ne les utilise (grep `useMutation\(api\.players\.updatePlayer(Chips|Action)`). Si appelant trouvé, refactor vers `playerAction` ou helper interne.

### Rate limiting

`@convex-dev/rate-limiter` configuré dans `convex/convex.config.ts`. Limites :

| Endpoint | Limite | Clé |
|---|---|---|
| `signInWithPassword` | 5 / 15 min | `(email, IP)` (composite, anti-DoS d'un user) |
| `signUpWithPassword` | 5 / 1h | `IP` |
| `createTable` | 10 actives par user (check en mutation) | `userId` |
| `joinTable` | 10 / min | `userId` |
| `playerAction` | 10 / sec | `userId` |
| `getTableByInviteCode` | 10 / min | `IP` |
| `rebuy` | 5 / min | `userId` |

Le lockout signin (C1.4) est implémenté via la même table de rate-limiter (5 fails consécutifs = clé bloquée 15 min).

### Password reset (C1.3)

- Mutation `requestPasswordReset(email)` → génère token 32 bytes via `crypto.getRandomValues()`, stocke dans table `passwordResetTokens` (`token`, `userId`, `expiresAt: Date.now() + 15*60*1000`), envoie email via Resend (déjà configuré pour le module Invitations) avec lien `https://home-poker.vjdev.tech/reset?token=...`
- Mutation `resetPassword(token, newPassword)` → vérifie token non expiré, valide `newPassword` via le schéma renforcé, appelle l'API `@convex-dev/auth` pour changer le hash, supprime le token

### Validation renforcée

`convex/shared/validation.ts` :
- Email : regex robuste (RFC 5322 simplifiée) `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` avec rejets de cas pathologiques (`a@b.c` rejeté)
- Password : ≥ 12 chars OU (≥ 8 chars + 1 majuscule + 1 chiffre + 1 spécial)

Appliqué aux mutations Password provider config et `resetPassword`.

### Code invitation crypto

`crypto.getRandomValues()` + check d'unicité dans la table avant insert + retry max 5x si collision. Conserver longueur 6 chars (pas changer l'UX).

### `.env.production`

Renommer en `.env.production.example` (template avec valeurs placeholder). Ajouter `.env.production` à `.gitignore`. Documenter dans README qu'il faut créer un `.env.production` local avec les vraies URLs prod.

### CVE build

`npm audit fix` agressif après upgrade `@typescript-eslint/*` 6 → 8 et `eslint` 8 → 9. Conserver `vite` 5.x pour cette phase (3 majors = phase dédiée). Si `npm audit fix` voudrait bumper `vite`, utiliser `--only=prod=false` avec inspection diff `package-lock.json` puis reverter les majors auto-bumpés.

### `getTableByInviteCode` privacy

Modifier la query pour ne retourner que `null` si `table.isPrivate` ET le caller n'est pas dans `table.players`. Documente le modèle dans le code.

## Décomposition en sous-lots ordonnés

11 étapes séquentielles, chacune commitable indépendamment. À chaque étape, `npm run typecheck && npm run lint && npx vitest run` doit retourner exit 0.

| # | Lot | Étape | Findings | Effort |
|---|---|---|---|---|
| 1 | Setup | Tests TDD rouges (~15 tests) | — | ~2h |
| 2 | C1 | Migration `@convex-dev/auth` Password + wipe + réécriture `useAuth` | C1.1, C1.2, C1.4 partiel | ~4h |
| 3 | C1 | Helper `convex/shared/auth.ts` + tests helper | infra | ~30min |
| 4 | C1 | Helper appliqué aux mutations 🔴 (startGame, playerAction, advancePhase, advanceFromShowdown, forcePlayerFold, joinTable, leaveTable) | C2.1, C2.2, C2.3, C2.4, C2.15 | ~1h30 |
| 5 | C1 | Suppression `updatePlayerChips` + `updatePlayerAction` | C2.8, C2.9 | ~30min |
| 6 | C1 | Filtrage `cards` dans queries + suppression `remainingDeck` | C4.3, C4.4 | ~1h |
| 7 | C1 | `crypto.getRandomValues()` dans `shuffleDeck` + `generateInviteCode` | C4.1, C4.2 | ~30min |
| 8 | C1 | `@convex-dev/rate-limiter` + rate limit signin avec lockout | C5.2, C1.4 | ~1h30 |
| 9 | C1 | `.env.production` → `.example` + `.gitignore` + `npm audit fix` | C9.1, C9.2 | ~1h |
| 10 | C3 | Helper appliqué aux 9 mutations 🟡 (createTable, updateUserProfile, generateAvatarUploadUrl, rebuy, startNextHand) + filtre `isPrivate` sur `getTableByInviteCode` | C2.5, C2.6, C2.7, C2.10, C2.11, C2.12, C2.16, C2.20 | ~1h30 |
| 11 | C3 | Rate limiting global (signup, createTable, joinTable, playerAction, getTableByInviteCode, rebuy) + password reset flow + validation renforcée email/password | C1.3, C3.4, C3.5, C5.1, C5.3-C5.9 | ~3h |

**Total estimé : ~16h.**

## Tests TDD (étape 1)

15 tests dans `tests/security-c1.test.ts`. Tous **doivent échouer** avant l'étape 2.

| # | Test | Vérifie | Étape qui le verdit |
|---|---|---|---|
| 1 | `requireUserId throws when no auth` | helper rejette caller anonyme | 3 |
| 2 | `requireSelf throws when caller != claimedUserId` | helper rejette usurpation | 3 |
| 3 | `playerAction with forged userId throws Unauthorized` | C2.2 | 4 |
| 4 | `startGame called by non-creator throws Unauthorized` | C2.1 | 4 |
| 5 | `advancePhase called by random user throws Unauthorized` | C2.3 | 4 |
| 6 | `forcePlayerFold no longer publicly callable` | C2.15 (devient internal) | 4 |
| 7 | `updatePlayerChips no longer in public API` | C2.8 supprimée | 5 |
| 8 | `updatePlayerAction no longer in public API` | C2.9 supprimée | 5 |
| 9 | `getTablePlayers returns cards:[] for non-caller players` | C4.3 | 6 |
| 10 | `getGameState does not return remainingDeck` | C4.4 | 6 |
| 11 | `shuffleDeck does not use Math.random (grep code)` | C4.1 | 7 |
| 12 | `signInWithPassword 5 wrong attempts then locked 15min` | C5.2 + C1.4 | 8 |
| 13 | `joinTable with forged userId throws Unauthorized` | C2.6 | 10 |
| 14 | `createTable with forged creatorId throws Unauthorized` | C2.5 | 10 |
| 15 | `getTableByInviteCode rate limited at 11th call/min/IP` | C5.6 | 11 |

**Stratégie test** :
- Helper qui crée 2 users authentifiés via `@convex-dev/auth` (Bob, Alice) et retourne leurs `ConvexClient` respectifs avec session active
- Chaque test forge un appel depuis le client de Bob avec un argument prétendant être Alice → vérifie que ça throw
- Pour les rate limits : appel en boucle, vérifier que le N+1ème throw `RateLimited`
- Test 11 : grep statique sur `convex/utils/poker.ts` (test déterministe, pas statistique)

## Critères de sortie

```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npx vitest run      # exit 0, les 15 tests sécu passent
npm audit           # 0 HIGH, 0 CRITICAL
```

**Smoke test manuel** sur `https://home-poker.vjdev.tech` :

1. Signup neuf après wipe → réussi
2. Signin → session active visible (token côté `@convex-dev/auth`)
3. Créer table heads-up, jouer 1 main complète → showdown correct
4. DevTools : tenter `playerAction({ userId: <autre_userId>, ... })` → `Unauthorized`
5. DevTools : inspecter payload `getTablePlayers` → `cards` autres joueurs = `[]`
6. DevTools : inspecter payload `getGameState` → pas de champ `remainingDeck`
7. DevTools : 6 tentatives signin avec mauvais password → 6ème throw `RateLimited`
8. Tester password reset : `requestPasswordReset(email)` → email reçu → `resetPassword(token, ...)` → signin avec nouveau password OK

## Stratégie de commits

Granularité : un commit par étape (11 commits attendus). Pattern :

- `test(security): tests TDD rouges pour Lot C1` (étape 1)
- `feat(auth): migration vers @convex-dev/auth Password provider` (étape 2)
- `feat(auth): helper requireUserId / requireSelf / requireTableCreator` (étape 3)
- `fix(security): vérif identité sur 7 mutations 🔴` (étape 4)
- `chore(security): supprimer updatePlayerChips et updatePlayerAction` (étape 5)
- `fix(security): filtrer cards adverses + ne pas exposer remainingDeck` (étape 6)
- `fix(security): crypto.getRandomValues sur shuffle + invite code` (étape 7)
- `feat(security): rate limit signin + lockout 15min via @convex-dev/rate-limiter` (étape 8)
- `chore(prod): .env.production gitignored + npm audit fix sur deps build` (étape 9)
- `fix(security): vérif identité sur 9 mutations 🟡 + privacy invite code` (étape 10)
- `feat(security): rate limit global + password reset + validation renforcée` (étape 11)

Chaque commit signe avec `viny1976@gmail.com` / `satch9`. Pas de `--no-verify`.

## Risques

- **R1 — Migration `@convex-dev/auth` plus longue qu'estimée.** Si l'API du provider Password a changé entre 0.0.87 (installé) et 0.0.92 (latest), upgrade nécessaire. **Mitigation** : faire l'upgrade au début de l'étape 2 en isolation. +~30min.
- **R2 — `getAuthUserId` ne retourne pas `Id<"users">` directement.** Selon le schéma, le user_id peut être dans une table dédiée (ex. `authAccounts`). **Mitigation** : adapter le helper pour faire un lookup. Lecture rapide de la doc au début de l'étape 2.
- **R3 — Helper rend l'arg `userId` redondant dans les mutations.** **Décision** : retirer l'arg quand redondant — le frontend connaît son `userId` via le hook `useAuth`. Audit léger des appelants front pour adapter.
- **R4 — Suppression `updatePlayerChips`/`updatePlayerAction` casse un appelant front oublié.** **Mitigation** : grep statique exhaustif avant suppression. Si appelant trouvé, refactor.
- **R5 — `npm audit fix` agressif upgrade indirectement `vite` ou autres majors.** **Mitigation** : `npm audit fix --only=prod=false` + inspection diff `package-lock.json`. Si majors auto-bumpés, revert et upgrade ciblé manuel.
- **R6 — Tests TDD nécessitent un user authentifié via `@convex-dev/auth` côté harness.** Le harness 0.B n'avait pas cette intégration. **Mitigation** : helper d'auth de test (signin programmatique avec récupération de session). Si absent, créer un user en DB et générer le JWT manuellement via la lib.
- **R7 — Lockout signin par email seul peut être abusé pour DoS.** **Mitigation** : lockout par `(email, IP)` (clé composite). Le composant `@convex-dev/rate-limiter` supporte les clés composites.
- **R8 — Wipe complet déconnecte tout le monde.** **Mitigation** : tu refais signup en premier après l'étape 2.

## Hypothèses

- **H1** — `@convex-dev/auth` Password provider est stable et utilisable en prod (pas en preview).
- **H2** — `@convex-dev/rate-limiter` est compatible `convex@1.25.2` (pas d'upgrade convex en 1.C — reporté à C5).
- **H3** — Le déploiement Convex dev `incredible-hedgehog-551` accepte les composants additionnels sans changer de plan.
- **H4** — `Resend` (utilisé pour les invitations) est utilisable pour le password reset (clé API déjà configurée côté serveur Convex).
- **H5** — Tu es disponible ~15min en milieu de phase pour le re-signup post-wipe et le smoke test final.

## Suite

Après validation user de 1.C (auto + smoke), invoquer `superpowers:brainstorming` pour la phase suivante :
- **C4** (perf 🟡 : N+1, rerenders, bundle) — recommandé si tu prévois > 4 joueurs simultanés
- **C5** (deps majeures `convex` 1.25→1.37, `vite` 5→8) — recommandé avant tout nouveau gros lot fonctionnel
