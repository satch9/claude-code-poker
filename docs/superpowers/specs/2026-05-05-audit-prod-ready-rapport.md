# Rapport d'audit production-ready — Phase 0.C

## Métadonnées

| Champ | Valeur |
|---|---|
| Date | 2026-05-05 |
| Phase | 0.C — Audit production-ready (sécu + perf) |
| Spec source | `docs/superpowers/specs/2026-05-05-audit-prod-ready-design.md` |
| Plan d'exécution | `docs/superpowers/plans/2026-05-05-audit-prod-ready-0C.md` |
| Branche | `master` |
| Commit de référence | `3782ea5` |
| Threat model | B — public restreint authentifié |
| Méthode | Statique exhaustive (3 sub-agents parallèles : Sécu axes 1-5, Perf axes 6-8, Prod axe 9) |
| Smoke runtime | Skippé (findings statiques suffisants pour 1.C — à reproduire au début des fixes 🔴) |
| Load test 9 joueurs | Skippé (axe 8 perf 🔴=0 en statique — à conserver pour validation post-1.C) |

## Résumé exécutif

**Verdict global : 🔴 ROUGE.**

L'application **n'est pas prête pour une ouverture publique**, même restreinte. Quatre familles de findings 🔴 critiques rendent le jeu trivialement triché et le compte d'un autre utilisateur trivialement détournable :

1. **16 mutations Convex sans vérification d'identité** (`startGame`, `playerAction`, `advancePhase`, `createTable`, `joinTable`, `leaveTable`, `updatePlayerChips`, `updatePlayerAction`, `forcePlayerFold`, `rebuy`, `updateUserProfile`, `generateAvatarUploadUrl`, `startNextHand`, `advanceFromShowdown`, `signOut`...) — un utilisateur authentifié peut agir en tant que n'importe quel autre joueur ou se créditer arbitrairement de chips.
2. **Cartes adverses + deck restant exposés côté client** (`getTablePlayers` retourne `cards: [...]` pour tous les joueurs, `getGameState` retourne `remainingDeck`) — n'importe qui en mode DevTools voit les cartes adverses ET prédit toutes les futures cartes communes.
3. **RNG cryptographiquement faible** dans `shuffleDeck` (`Math.random()` au lieu de `crypto.getRandomValues()`) — deck théoriquement prédictible.
4. **Aucun rate limiting** : signin brute-forçable, signup spammable, codes invitation énumérables.

Plus deux 🔴 production : `.env.production` tracked dans git avec IDs dev, et 9 CVE HIGH dans la chaîne de build (`@typescript-eslint`, `vite`, `rollup`, `minimatch`).

Côté performance, **0 finding 🔴** : le code est fonctionnel sous charge faible. Les 10 findings 🟡 (N+1 sur user lookups, payload bloaté en showdown, rerenders cascade depuis `PokerTable`, lobby + table bundled ensemble) sont des optimisations non bloquantes, à traiter après les correctifs sécu.

**Total findings : 71** — 🔴 14 / 🟡 36 / 🟢 21.

Les fixes doivent être enchaînés en 5 lots (cf. *Recommandations*). Le **lot C1** (correctifs sécu critiques) est prioritaire absolu : tant qu'il n'est pas appliqué, l'application doit rester fermée à toute audience non-supervisée.

---

## Convention IDs

Les findings du sub-agent Sécu utilisaient initialement le préfixe `A<axe>.<num>` ; ils sont renommés `C<axe>.<num>` ci-dessous pour cohérence avec les axes 6-9. Mapping : A1.x→C1.x, A2.x→C2.x, A3.x→C3.x, A4.x→C4.x, A5.x→C5.x.

---

## Findings par axe

### Axe 1 — Auth & sessions

#### C1.1 — Hash password SHA-256 single-pass (faible)
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/auth.ts:123-140`
- **Description** : Hash via `crypto.subtle.digest("SHA-256", password + salt)` sans itération ni PBKDF2. Le salt 16 bytes par user (introduit en 1.B) est correct, mais SHA-256 single-pass reste vulnérable au brute-force GPU (milliards de hash/s).
- **Recommandation** : Migrer vers PBKDF2 ≥ 100k itérations, ou Argon2 si supporté par le runtime Convex.

#### C1.2 — Pas de révocation de session côté serveur
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/auth.ts:104-111`, `src/core/hooks/useAuth.ts:50-69`
- **Description** : Session stockée en localStorage. `signOut` patch uniquement `lastSeen`, sans révocation de token. Pas de logout multi-device (logout sur device A ne déconnecte pas device B).
- **Recommandation** : Table `sessions` côté serveur avec révocation par token, cookie `httpOnly`/`secure`/`sameSite`.

#### C1.3 — Pas de password reset
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/auth.ts` (entier)
- **Description** : Aucun endpoint de reset. Un user qui oublie son mot de passe n'a pas de recours.
- **Recommandation** : Flow reset avec token temporaire (15 min) + email.

#### C1.4 — Pas de lockout sur tentatives signin
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/auth.ts:49-101`
- **Description** : `signInWithPassword` retourne "Invalid email or password" sans rate limit ni lockout. Brute-force possible.
- **Recommandation** : 5 tentatives échouées → lockout 15 min, backoff exponentiel.

#### C1.5 — Hash correctement filtré dans la query
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/auth.ts:95-98`
- **Description** : `signInWithPassword` extrait correctement `password` et `passwordSalt` avant retour. Pas de leak.
- **Recommandation** : Maintenir.

---

### Axe 2 — Autorisation Convex

> **Pattern récurrent** : 16 mutations acceptent `userId` ou `tableId` en argument **sans appeler `ctx.auth.getUserIdentity()`** pour valider que le caller est bien le user/créateur en question. Conséquence : un user authentifié peut forger n'importe quelle requête.

#### C2.1 — `startGame` sans vérif identité
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:225-232`
- **Description** : Accepte uniquement `tableId`, ne vérifie pas que le caller est le créateur. UI restreint le bouton mais DevTools contourne.
- **Recommandation** : Ajouter `userId` arg + `ctx.db.get(tableId).creatorId === args.userId`.

#### C2.2 — `playerAction` sans vérif identité
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:235-507`
- **Description** : Accepte `userId` en argument sans valider l'identité du caller. Un user peut faire fold n'importe quel autre joueur.
- **Recommandation** : `ctx.auth.getUserIdentity()` doit matcher `args.userId`.

#### C2.3 — `advancePhase` sans vérif identité
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:510-578`
- **Description** : Tout user authentifié peut avancer la phase, sauter des tours, forcer un showdown.
- **Recommandation** : Restreindre au créateur ou à un joueur autorisé.

#### C2.4 — `advanceFromShowdown` sans vérif identité
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:581-605`
- **Description** : Tout user peut déclencher l'avance depuis showdown.
- **Recommandation** : Validation créateur/autorisé.

#### C2.5 — `createTable` accepte `creatorId` sans vérif
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/tables.ts:6-64`
- **Description** : Un user peut créer une table avec `creatorId` d'un autre, l'usurpant.
- **Recommandation** : `ctx.auth.getUserIdentity()` doit matcher `args.creatorId`.

#### C2.6 — `joinTable` sans vérif identité
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:6-89`
- **Description** : Un user peut faire rejoindre n'importe quel autre user à une table.
- **Recommandation** : Valider l'identité du caller.

#### C2.7 — `leaveTable` sans vérif identité
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:92-163`
- **Description** : Un user peut faire quitter n'importe quel autre joueur.
- **Recommandation** : Valider l'identité.

#### C2.8 — `updatePlayerChips` sans vérif + sans validation valeur
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/players.ts:215-225`
- **Description** : Patch direct des chips par `playerId`. **Permet de se créditer 999999 chips trivialement.** Pas d'auth ni de borne.
- **Recommandation** : Supprimer cette mutation publique. Les chips ne doivent changer que via les actions de jeu (bet, win, rebuy).

#### C2.9 — `updatePlayerAction` sans vérif identité
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/players.ts:228-252`
- **Description** : Patch direct de l'état d'action par `playerId`. Permet de forcer fold/check/raise sur un autre.
- **Recommandation** : Supprimer ou sécuriser.

#### C2.10 — `rebuy` sans vérif identité
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:278-337`
- **Description** : Un user peut déclencher rebuy pour un autre joueur sans son consentement.
- **Recommandation** : Validation caller.

#### C2.11 — `updateUserProfile` sans vérif identité
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/users.ts:30-84`
- **Description** : Modification du profil (nom, avatar) d'un autre user possible.
- **Recommandation** : Validation caller.

#### C2.12 — `generateAvatarUploadUrl` sans vérif identité
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/users.ts:14-27`
- **Description** : Génère URL d'upload pour le storage d'un autre user.
- **Recommandation** : Validation caller.

#### C2.13 — `getTablePlayers` retourne tous les joueurs (intentionnel)
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/players.ts:166-187`
- **Description** : Retour pleine liste pour rendu UI. Pas de fuite (sauf le champ `cards`, traité en C4.3).
- **Recommandation** : Garder ; surveiller si champs sensibles ajoutés.

#### C2.14 — `getActivePlayers` accessible à tous (intentionnel)
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/players.ts:255-276`
- **Description** : État de jeu visible à tous, normal pour UI.
- **Recommandation** : Garder ; vérifier filtre `cards` (cf. C4.3).

#### C2.15 — `forcePlayerFold` sans vérif identité
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:1379-1388`
- **Description** : Mutation accepte `userId` et appelle `playerAction(fold)` sans valider le caller. Conçue pour les timeouts mais abusable.
- **Recommandation** : Convertir en `internalMutation` ou restreindre au créateur.

#### C2.16 — `startNextHand` sans vérif identité
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/core/gameEngine.ts:1392-1420`
- **Description** : N'importe quel user peut déclencher la main suivante.
- **Recommandation** : Validation créateur.

#### C2.17 — `getUser` query sans vérif (acceptable)
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/users.ts:5-11`
- **Description** : Profil public visible. Pas de champ sensible exposé (hash filtré).
- **Recommandation** : Surveiller ajouts de champs.

#### C2.18 — `getUserStats` sans vérif (acceptable)
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/users/stats.ts:5-206`
- **Description** : Stats publiques (leaderboard). OK.
- **Recommandation** : Garder.

#### C2.19 — `getUserRanking` sans vérif (acceptable)
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/users/stats.ts:210-276`
- **Description** : Classement public.
- **Recommandation** : Garder.

#### C2.20 — `getTableByInviteCode` sans contrôle de privacy
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/tables.ts:169-199`
- **Description** : Retourne info table à toute personne ayant le code, sans filtre `isPrivate` ni ACL. Sécurité par obscurité acceptable si documentée.
- **Recommandation** : Documenter le modèle ; éventuellement ACL pour les tables vraiment privées (cf. C5.6 brute-force).

---

### Axe 3 — Validation entrées & XSS

#### C3.1 — Table name validé + rendu safe
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/shared/validation.ts:20-38`, `src/core/components/Lobby/TableCard.tsx`
- **Description** : `name` validé ≤ 50 chars, rendu en text content (pas `innerHTML`). Pas de XSS.
- **Recommandation** : Maintenir.

#### C3.2 — User name validé + rendu safe
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `convex/shared/validation.ts:15-18`, `src/core/components/Game/ActionFeed.tsx:53-78`
- **Description** : Validation 1-50 chars, rendu via template literal en text content.
- **Recommandation** : Maintenir.

#### C3.3 — Champ `message` rendu sans escape explicite
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `src/core/components/Game/ActionFeed.tsx:56-58`
- **Description** : `${playerName} ${item.message}`. Côté serveur le message est contrôlé ("paie la petite blind"), mais si un jour le message accepte du user input, XSS possible.
- **Recommandation** : Garder text-only ou sanitize si user input.

#### C3.4 — Regex email faible
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/shared/validation.ts:4-8`
- **Description** : `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepte `a@b.c`. Fonctionnel mais permissif.
- **Recommandation** : Regex RFC 5322 ou librairie dédiée.

#### C3.5 — Password : longueur ≥8 mais pas d'entropie
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/shared/validation.ts:10-13`
- **Description** : Permet `12345678`. Pas d'exigence majuscule/chiffre/spécial.
- **Recommandation** : Min 12 chars OU mix maj/chiffre/spécial.

#### C3.6 — `smallBlind`/`bigBlind`/`startingStack` validés
- **Sévérité** : 🟢
- **Localisation** : `convex/shared/validation.ts:20-38`
- **Description** : Entiers positifs. `buyInAmount` clampé.
- **Recommandation** : Maintenir.

#### C3.7 — `seatPosition` validé
- **Sévérité** : 🟢
- **Localisation** : `convex/players.ts:45-55`
- **Description** : Borné `0..maxPlayers-1`.
- **Recommandation** : Maintenir.

#### C3.8 — Pas de `dangerouslySetInnerHTML`
- **Sévérité** : 🟢
- **Localisation** : `src/`
- **Description** : Grep retourne 0. Pratique saine.
- **Recommandation** : Maintenir.

---

### Axe 4 — Anti-triche jeu

#### C4.1 — `shuffleDeck` utilise `Math.random()`
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/utils/poker.ts:30-39`
- **Description** : Fisher-Yates avec `Math.random()`. Non cryptographique, prédictible si seed connue. Côté Convex serveur, l'attaquant n'a pas accès au seed mais l'usage de `Math.random()` reste un anti-pattern poker.
- **Recommandation** : `crypto.getRandomValues()` (ou équivalent runtime Convex).

#### C4.2 — `inviteCode` généré via `Math.random()`
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/tables.ts:32`
- **Description** : `Math.random().toString(36).substring(2,8).toUpperCase()`. Codes 6 chars, 36⁶ ≈ 2.18 milliards. Math.random prédictible + risque de collision.
- **Recommandation** : `crypto.getRandomValues()` + check unicité avant insert.

#### C4.3 — Cartes privées exposées dans `getTablePlayers`
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/players.ts:166-187`
- **Description** : La query retourne `cards: [...]` pour TOUS les joueurs, pas seulement le caller. Un user en DevTools lit les cartes adverses. **Confirme S1 du rapport 0.A.**
- **Recommandation** : Filtrer côté serveur — retourner `cards` uniquement pour le joueur dont `userId === ctx.auth.getUserIdentity()`. Pour les autres, renvoyer `[]` ou champ absent.

#### C4.4 — `remainingDeck` exposé via `getGameState`
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/schema.ts:98`, `convex/core/gameEngine.ts:200`
- **Description** : Le champ `gameState.remainingDeck` (introduit en 1.B pour fixer B4.1 deck-par-phase) est stocké tel quel et retourné par `getGameState`. **L'attaquant prédit toutes les futures community cards et hole cards adverses.**
- **Recommandation** : Ne jamais retourner `remainingDeck` dans une query ; le garder strictement serveur. Filtrer dans `getGameState`.

#### C4.5 — Cartes au showdown visibles (intentionnel)
- **Sévérité** : 🟢
- **Localisation** : `convex/core/gameEngine.ts:1093-1168`
- **Description** : `getShowdownResults` retourne `cards`. Normal — au showdown les cartes sont publiques.
- **Recommandation** : Garder.

#### C4.6 — Rotation dealer correcte
- **Sévérité** : 🟢
- **Localisation** : `convex/utils/turnManager.ts`, `convex/core/gameEngine.ts:1069-1074`
- **Description** : Logique correcte, pas de raccourci possible.
- **Recommandation** : Maintenir.

#### C4.7 — Blindes posées server-side
- **Sévérité** : 🟢
- **Localisation** : `convex/core/gameEngine.ts:120-150`
- **Description** : Logique blindes dans `startGameInternal`. Montants déduits correctement.
- **Recommandation** : Maintenir.

#### C4.8 — Validation tour serveur
- **Sévérité** : 🟢
- **Localisation** : `convex/core/gameEngine.ts:279-282`
- **Description** : `playerAction` vérifie `currentPlayerPosition === player.seatPosition` avant traitement.
- **Recommandation** : Maintenir.

#### C4.9 — Side pots — logique complexe peu testée
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:890-909`, `convex/utils/turnManager.ts:calculateSidePots`
- **Description** : Calcul side pots à la résolution, fallback check-down. Complexité élevée, kicker logic à audit en cas de tie.
- **Recommandation** : Tests unitaires ciblés all-in + side pots multi-niveaux.

---

### Axe 5 — Rate limiting & abus

#### C5.1 — Pas de rate limit sur `signUpWithPassword`
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/auth.ts:11-46`
- **Description** : Spam de création de comptes possible (DoS DB, énumération).
- **Recommandation** : 5 signups/IP/h via Convex `RateLimiter` ou middleware custom.

#### C5.2 — Pas de rate limit sur `signInWithPassword`
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `convex/auth.ts:49-101`
- **Description** : Brute-force sans frein. Combiné à C1.1 (hash faible) et C1.4 (pas de lockout) = takeover compte trivial.
- **Recommandation** : Backoff exponentiel + lockout 5 tentatives / 15 min.

#### C5.3 — Pas de rate limit sur `createTable`
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts:6-64`
- **Description** : Création illimitée → remplit la DB.
- **Recommandation** : Max 10 tables actives par user.

#### C5.4 — Pas de rate limit sur `joinTable`
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:6-89`
- **Description** : Joins en rafale possibles.
- **Recommandation** : 10 joins/min/user.

#### C5.5 — Pas de rate limit sur `playerAction`
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:235-507`
- **Description** : Spam d'actions hors-tour possible (la validation tour rejette mais pas avant traitement).
- **Recommandation** : 1 action/100ms par user.

#### C5.6 — `getTableByInviteCode` sans anti-brute-force
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts:169-199`
- **Description** : Codes 6 chars (~2.18 milliards). Sans rate limit, ~100 req/s côté client → millions de tentatives/h. Énumération réaliste si l'attaquant cible les tables actives.
- **Recommandation** : 10 queries/min/IP. Idéalement codes 8+ chars.

#### C5.7 — Pas de rate limit sur `updatePlayerChips`
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:215-225`
- **Description** : Aggrave C2.8 (mutation déjà critique).
- **Recommandation** : Supprimer la mutation (cf. C2.8).

#### C5.8 — Pas de rate limit sur `rebuy`
- **Sévérité** : 🟡
- **Localisation** : `convex/players.ts:278-337`
- **Description** : Rebuy spam possible.
- **Recommandation** : Rate limit + gate par phase de jeu (folded/waiting).

#### C5.9 — Pas de framework de rate limiting global
- **Sévérité** : 🟡
- **Localisation** : application entière
- **Description** : Aucune utilisation des `RateLimiter` Convex ni middleware équivalent.
- **Recommandation** : Adopter un framework centralisé (Convex `RateLimiter` ou Upstash Redis).

---

### Axe 6 — Queries Convex (perf)

#### C6.1 — N+1 user lookup dans `getTablePlayers` / `getActivePlayers`
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `convex/players.ts:175-182`, `convex/core/gameEngine.ts:977-980`
- **Description** : `players.map()` avec `await ctx.db.get(player.userId)` séquentiel. 9 joueurs = 9 round-trips DB.
- **Recommandation** : `Promise.all` ou jointure indexée.

#### C6.2 — N+1 dans showdown (3 passes)
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:874-883, 966-980, 977-981`
- **Description** : 3 boucles successives sur `playerHands`, chacune avec `db.get(userId)`. Total 3×N appels.
- **Recommandation** : Pré-charger les users une fois.

#### C6.3 — N+1 sur `getPublicTables` / `getTablesWithUserInfo`
- **Sévérité** : 🟡
- **Localisation** : `convex/tables.ts:70-96`, `105-145`
- **Description** : Pour chaque table en lobby, query `players` séparée. À 50 tables = 50 sub-queries.
- **Recommandation** : Dénormaliser `playerCount` au niveau table.

#### C6.4 — Payload bloaté `getShowdownResults`
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:1093-1150`
- **Description** : Retourne objets `player` complets + `user`. Le front n'a besoin que de `{ name, handRank, cards }`.
- **Recommandation** : Projection ciblée.

#### C6.5 — `startGame` : `db.get` en boucle post-blinds
- **Sévérité** : 🟡
- **Localisation** : `convex/core/gameEngine.ts:153-175`
- **Description** : Pattern N+1 limité (2 appels en heads-up) mais répété ailleurs.
- **Recommandation** : Pré-charger les users.

---

### Axe 7 — Rerenders front

#### C7.1 — `quickRaiseAmounts` recréé sans `useMemo`
- **Sévérité** : 🟢
- **Localisation** : `src/core/components/Game/BettingControls.tsx:59-64`
- **Description** : Array recréé à chaque render. Mineur.
- **Recommandation** : `useMemo` si BettingControls devient memoized.

#### C7.2 — `seats` recréé à chaque render PokerTable
- **Sévérité** : 🟡
- **Localisation** : `src/core/components/Game/PokerTable.tsx:217-234`
- **Description** : `Array.from()` + `players.find()` recréé. PlayerSeat n'est pas `memo` → cascade.
- **Recommandation** : `React.memo(PlayerSeat)` + `useMemo(seats)`.

#### C7.3 — Helpers blind position recréés
- **Sévérité** : 🟢
- **Localisation** : `src/core/components/Game/PokerTable.tsx:236-289`
- **Description** : `getSmallBlindPosition`/`getBigBlindPosition` déclarés dans le composant.
- **Recommandation** : Extraire en module-scope ou `useCallback`.

#### C7.4 — Props inline instables (`seatGeom`, `seatAngle`)
- **Sévérité** : 🟡
- **Localisation** : `src/core/components/Game/PokerTable.tsx:217-234`
- **Description** : Objets inline → refs instables, problématique pour animations.
- **Recommandation** : Mémoriser.

#### C7.5 — Toutes les queries `useGameLogic` actives en permanence
- **Sévérité** : 🟡
- **Localisation** : `src/core/hooks/useGameLogic.ts:30-56`
- **Description** : Queries refetchées à chaque tick même hors-pertinence. `getShowdownResults` est déjà conditionnelle (✓).
- **Recommandation** : Conditionner les autres queries selon la phase.

---

### Axe 8 — Bundle & scalabilité

#### C8.1 — Lobby + PokerTable bundled ensemble
- **Sévérité** : 🟡
- **Localisation** : `src/core/components/App/AppMain.tsx:1-14`
- **Description** : Imports statiques de `Lobby`, `PokerTable`, `CreateTableForm`. PokerTable + dépendances chargées même au lobby.
- **Recommandation** : `React.lazy()` + `Suspense`.

#### C8.2 — `pokersolver` côté serveur uniquement (OK)
- **Sévérité** : 🟢
- **Localisation** : `convex/utils/handEvaluator.ts:1`
- **Description** : Pas dans le bundle front. Optimal.
- **Recommandation** : Aucune.

#### C8.3 — Lazy-loading sub-composants Game (post-C8.1)
- **Sévérité** : 🟢
- **Localisation** : `src/core/components/Game/PokerTable.tsx:2-11`
- **Description** : ShowdownResults, RebuyDialog, InviteDialog candidats au lazy si PokerTable est lazy.
- **Recommandation** : Phase 2 après C8.1.

#### C8.4 — `vite.config.ts` sans `manualChunks`
- **Sévérité** : 🟢
- **Localisation** : `vite.config.ts`
- **Description** : Vite auto-splitting suffit probablement.
- **Recommandation** : Audit bundle size post-build avant action.

---

### Axe 9 — Secrets, env, deps

#### C9.1 — `.env.production` tracked dans git avec IDs dev
- **Sévérité** : 🔴
- **Source** : statique
- **Localisation** : `.env.production`
- **Description** : Fichier commité, contient `VITE_CONVEX_URL` pointant sur `incredible-hedgehog-551` (dev). Les commentaires indiquent un switch prévu vers `accurate-nightingale-834`. Build prod actuel utilise donc le dev.
- **Recommandation** : Renommer en `.env.production.example` + ajouter à `.gitignore`. Gérer via secrets CI/CD.

#### C9.2 — 9 CVE HIGH dans la chaîne de build
- **Sévérité** : 🔴
- **Source** : statique (`npm audit`)
- **Localisation** : `package.json` devDependencies (`@typescript-eslint/*@6.21.0`)
- **Description** : minimatch ReDoS, glob shell injection, flatted Prototype Pollution, rollup path traversal. Dev/build-time mais exécutées à chaque `npm run build`.
- **Recommandation** : Upgrade `@typescript-eslint/*` ≥7, `vite`, `eslint`, `rollup`. `npm audit fix`.

#### C9.3 — Deps dev majeures obsolètes
- **Sévérité** : 🟡
- **Source** : statique (`npm outdated`)
- **Localisation** : `package.json` devDependencies
- **Description** : `@typescript-eslint/*` 6→8, `eslint` 8→10, `typescript` 5→6, `vite` 5→8.
- **Recommandation** : Upgrade incrémental, eslint/ts d'abord puis vite.

#### C9.4 — `convex` 12 patches en retard
- **Sévérité** : 🟡
- **Source** : statique
- **Localisation** : `package.json` (`convex@1.25.2` → 1.37.0)
- **Description** : 12 patches incluant possibles fixes sécu/perf/bugs côté runtime poker.
- **Recommandation** : Upgrade ≥1.37.0, tester les flows mutation/auth.

#### C9.5 — `@convex-dev/auth` 5 patches en retard
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `package.json` (`@convex-dev/auth@0.0.87` → 0.0.92)
- **Description** : Gap mineur.
- **Recommandation** : Upgrade trivial.

#### C9.6 — Variables env correctement scopées (OK)
- **Sévérité** : 🟢
- **Source** : statique
- **Localisation** : `src/main.tsx`, `.env.production`, `.env.local`
- **Description** : `VITE_*` correctement utilisé pour les variables côté client. Pas de secret dans le bundle. `CONVEX_DEPLOYMENT` dans `.env.local` (gitignored). Aucune clé hardcodée.
- **Recommandation** : Maintenir.

---

## Tableau récapitulatif

Trié par sévérité puis par axe.

| ID | Sév. | Axe | Titre | Localisation |
|----|------|-----|-------|--------------|
| C1.1 | 🔴 | 1 | Hash SHA-256 single-pass | `convex/auth.ts:123-140` |
| C2.1 | 🔴 | 2 | `startGame` sans vérif identité | `convex/core/gameEngine.ts:225-232` |
| C2.2 | 🔴 | 2 | `playerAction` sans vérif identité | `convex/core/gameEngine.ts:235-507` |
| C2.3 | 🔴 | 2 | `advancePhase` sans vérif identité | `convex/core/gameEngine.ts:510-578` |
| C2.4 | 🔴 | 2 | `advanceFromShowdown` sans vérif identité | `convex/core/gameEngine.ts:581-605` |
| C2.8 | 🔴 | 2 | `updatePlayerChips` patch direct sans validation | `convex/players.ts:215-225` |
| C2.9 | 🔴 | 2 | `updatePlayerAction` patch direct sans vérif | `convex/players.ts:228-252` |
| C2.15 | 🔴 | 2 | `forcePlayerFold` sans vérif identité | `convex/core/gameEngine.ts:1379-1388` |
| C4.1 | 🔴 | 4 | `shuffleDeck` utilise `Math.random()` | `convex/utils/poker.ts:30-39` |
| C4.3 | 🔴 | 4 | Cartes adverses exposées dans `getTablePlayers` | `convex/players.ts:166-187` |
| C4.4 | 🔴 | 4 | `remainingDeck` exposé via `getGameState` | `convex/schema.ts:98`, `convex/core/gameEngine.ts:200` |
| C5.2 | 🔴 | 5 | Pas de rate limit signin (brute-force) | `convex/auth.ts:49-101` |
| C9.1 | 🔴 | 9 | `.env.production` tracké avec IDs dev | `.env.production` |
| C9.2 | 🔴 | 9 | 9 CVE HIGH dans chaîne de build | `package.json` |
| C1.2 | 🟡 | 1 | Pas de révocation de session serveur | `convex/auth.ts:104-111` |
| C1.3 | 🟡 | 1 | Pas de password reset | `convex/auth.ts` |
| C1.4 | 🟡 | 1 | Pas de lockout signin | `convex/auth.ts:49-101` |
| C2.5 | 🟡 | 2 | `createTable` accepte `creatorId` sans vérif | `convex/tables.ts:6-64` |
| C2.6 | 🟡 | 2 | `joinTable` sans vérif identité | `convex/players.ts:6-89` |
| C2.7 | 🟡 | 2 | `leaveTable` sans vérif identité | `convex/players.ts:92-163` |
| C2.10 | 🟡 | 2 | `rebuy` sans vérif identité | `convex/players.ts:278-337` |
| C2.11 | 🟡 | 2 | `updateUserProfile` sans vérif identité | `convex/users.ts:30-84` |
| C2.12 | 🟡 | 2 | `generateAvatarUploadUrl` sans vérif identité | `convex/users.ts:14-27` |
| C2.16 | 🟡 | 2 | `startNextHand` sans vérif identité | `convex/core/gameEngine.ts:1392-1420` |
| C2.20 | 🟡 | 2 | `getTableByInviteCode` sans contrôle privacy | `convex/tables.ts:169-199` |
| C3.3 | 🟡 | 3 | `message` rendu sans escape | `src/core/components/Game/ActionFeed.tsx:56-58` |
| C3.4 | 🟡 | 3 | Regex email faible | `convex/shared/validation.ts:4-8` |
| C3.5 | 🟡 | 3 | Password sans entropie | `convex/shared/validation.ts:10-13` |
| C4.2 | 🟡 | 4 | `inviteCode` via `Math.random()` | `convex/tables.ts:32` |
| C4.9 | 🟡 | 4 | Side pots peu testés | `convex/core/gameEngine.ts:890-909` |
| C5.1 | 🟡 | 5 | Pas de rate limit signup | `convex/auth.ts:11-46` |
| C5.3 | 🟡 | 5 | Pas de rate limit createTable | `convex/tables.ts:6-64` |
| C5.4 | 🟡 | 5 | Pas de rate limit joinTable | `convex/players.ts:6-89` |
| C5.5 | 🟡 | 5 | Pas de rate limit playerAction | `convex/core/gameEngine.ts:235-507` |
| C5.6 | 🟡 | 5 | Brute-force codes invitation | `convex/tables.ts:169-199` |
| C5.7 | 🟡 | 5 | Pas de rate limit updatePlayerChips | `convex/players.ts:215-225` |
| C5.8 | 🟡 | 5 | Pas de rate limit rebuy | `convex/players.ts:278-337` |
| C5.9 | 🟡 | 5 | Pas de framework rate limiting global | application |
| C6.1 | 🟡 | 6 | N+1 user lookup `getTablePlayers/getActivePlayers` | `convex/players.ts:175-182` |
| C6.2 | 🟡 | 6 | N+1 dans showdown (3 passes) | `convex/core/gameEngine.ts:874-981` |
| C6.3 | 🟡 | 6 | N+1 sur `getPublicTables/getTablesWithUserInfo` | `convex/tables.ts:70-145` |
| C6.4 | 🟡 | 6 | Payload bloaté `getShowdownResults` | `convex/core/gameEngine.ts:1093-1150` |
| C6.5 | 🟡 | 6 | `startGame` db.get en boucle | `convex/core/gameEngine.ts:153-175` |
| C7.2 | 🟡 | 7 | `seats` recréé à chaque render PokerTable | `src/core/components/Game/PokerTable.tsx:217-234` |
| C7.4 | 🟡 | 7 | Props inline instables | `src/core/components/Game/PokerTable.tsx:217-234` |
| C7.5 | 🟡 | 7 | Toutes queries `useGameLogic` actives | `src/core/hooks/useGameLogic.ts:30-56` |
| C8.1 | 🟡 | 8 | Lobby + PokerTable bundled ensemble | `src/core/components/App/AppMain.tsx:1-14` |
| C9.3 | 🟡 | 9 | Deps dev majeures obsolètes | `package.json` |
| C9.4 | 🟡 | 9 | `convex` 12 patches en retard | `package.json` |
| C1.5 | 🟢 | 1 | Hash filtré dans la query (info) | `convex/auth.ts:95-98` |
| C2.13 | 🟢 | 2 | `getTablePlayers` exposition contrôlée | `convex/players.ts:166-187` |
| C2.14 | 🟢 | 2 | `getActivePlayers` exposition contrôlée | `convex/players.ts:255-276` |
| C2.17 | 🟢 | 2 | `getUser` exposition publique acceptable | `convex/users.ts:5-11` |
| C2.18 | 🟢 | 2 | `getUserStats` exposition publique acceptable | `convex/users/stats.ts:5-206` |
| C2.19 | 🟢 | 2 | `getUserRanking` exposition publique acceptable | `convex/users/stats.ts:210-276` |
| C3.1 | 🟢 | 3 | Table name validé + safe | `convex/shared/validation.ts:20-38` |
| C3.2 | 🟢 | 3 | User name validé + safe | `convex/shared/validation.ts:15-18` |
| C3.6 | 🟢 | 3 | Blind/bet validés | `convex/shared/validation.ts:20-38` |
| C3.7 | 🟢 | 3 | `seatPosition` validé | `convex/players.ts:45-55` |
| C3.8 | 🟢 | 3 | Pas de `dangerouslySetInnerHTML` | `src/` |
| C4.5 | 🟢 | 4 | Cartes au showdown visibles (intentionnel) | `convex/core/gameEngine.ts:1093-1168` |
| C4.6 | 🟢 | 4 | Rotation dealer correcte | `convex/utils/turnManager.ts` |
| C4.7 | 🟢 | 4 | Blindes posées server-side | `convex/core/gameEngine.ts:120-150` |
| C4.8 | 🟢 | 4 | Validation tour serveur | `convex/core/gameEngine.ts:279-282` |
| C7.1 | 🟢 | 7 | `quickRaiseAmounts` sans memo | `src/core/components/Game/BettingControls.tsx:59-64` |
| C7.3 | 🟢 | 7 | Helpers blind position recréés | `src/core/components/Game/PokerTable.tsx:236-289` |
| C8.2 | 🟢 | 8 | `pokersolver` côté serveur (OK) | `convex/utils/handEvaluator.ts:1` |
| C8.3 | 🟢 | 8 | Lazy sub-composants Game | `src/core/components/Game/PokerTable.tsx:2-11` |
| C8.4 | 🟢 | 8 | `vite.config.ts` sans `manualChunks` | `vite.config.ts` |
| C9.5 | 🟢 | 9 | `@convex-dev/auth` 5 patches en retard | `package.json` |
| C9.6 | 🟢 | 9 | Variables env correctement scopées (OK) | `src/main.tsx`, `.env.*` |

**Comptage** : 14 🔴 + 36 🟡 + 21 🟢 = **71 findings**.

---

## Recommandations pour 1.C

### Lot C1 — Critiques sécu (🔴 sécu, ~6-8h, BLOQUE l'ouverture publique)

**Findings** : C1.1, C2.1, C2.2, C2.3, C2.4, C2.8, C2.9, C2.15, C4.1, C4.3, C4.4, C5.2.

**Objectif** : faire qu'aucun user authentifié ne puisse usurper un autre, manipuler les chips, lire les cartes adverses, ou prédire le deck.

**Étapes attendues** :
1. **Auth helper centralisé** : créer `convex/shared/auth.ts` avec `requireUserId(ctx, claimedUserId)` qui appelle `ctx.auth.getUserIdentity()` et compare. À utiliser dans toutes les mutations sensibles.
2. **Appliquer à 16 mutations** : startGame, playerAction, advancePhase, advanceFromShowdown, createTable, joinTable, leaveTable, updatePlayerChips, updatePlayerAction, forcePlayerFold, rebuy, updateUserProfile, generateAvatarUploadUrl, startNextHand. Pour les mutations "internal" (forcePlayerFold via scheduler), passer en `internalMutation`.
3. **Supprimer `updatePlayerChips`** (C2.8) et `updatePlayerAction` (C2.9) de l'API publique — les chips ne doivent changer que via le moteur de jeu.
4. **Filtrer `cards` dans `getTablePlayers` / `getActivePlayers`** : projeter `cards` uniquement si `userId === caller`, `[]` sinon.
5. **Filtrer `remainingDeck` dans `getGameState`** : ne jamais le retourner côté client.
6. **`shuffleDeck` → `crypto.getRandomValues()`**.
7. **Hash → PBKDF2 ≥ 100k itérations** (avec migration des comptes existants au prochain signin réussi, ou wipe des comptes test).
8. **Rate limit signin** : 5 tentatives échouées → lockout 15 min (mémoire de tentatives par email/IP via une table dédiée).

**Tests TDD obligatoires** : un test par mutation qui vérifie que l'appel avec un `userId` ≠ caller jette `Unauthorized`.

### Lot C2 — Critiques perf (🔴 perf, ~0h)

**Findings** : aucun.

**Objectif** : N/A — la perf n'a pas de blocant 🔴 en statique. À ré-évaluer après 1.C si load test 9 joueurs activé.

### Lot C3 — Hardening sécu (🟡 sécu, ~5-6h)

**Findings** : C1.2, C1.3, C1.4, C2.5, C2.6, C2.7, C2.10, C2.11, C2.12, C2.16, C2.20, C3.3, C3.4, C3.5, C4.2, C4.9, C5.1, C5.3, C5.4, C5.5, C5.6, C5.7, C5.8, C5.9.

**Objectif** : combler les 24 manques de hardening — auth helper appliqué partout (pas seulement aux 🔴), framework rate limiting global, validation renforcée, password reset.

**Étapes attendues** :
1. **Étendre l'auth helper** aux 9 mutations 🟡 restantes (createTable, joinTable, leaveTable, rebuy, updateUserProfile, generateAvatarUploadUrl, startNextHand).
2. **Framework rate limiting** : adopter Convex `RateLimiter` ou middleware custom. Appliquer sur signup, createTable, joinTable, playerAction, getTableByInviteCode, rebuy.
3. **Password reset** : flow avec token temporaire 15 min + email (via Resend déjà disponible vu les invitations).
4. **Renforcer validation** : email RFC 5322, password ≥ 12 chars OU mix maj/chiffre/spécial.
5. **`inviteCode`** → `crypto.getRandomValues()` + check unicité.
6. **Tests side pots** : couvrir les scénarios all-in multi-niveaux (C4.9).
7. **`getTableByInviteCode`** : documenter le modèle de privacy ou ajouter une ACL stricte pour `isPrivate=true`.

### Lot C4 — Optimisations perf (🟡 perf, ~3-4h)

**Findings** : C6.1, C6.2, C6.3, C6.4, C6.5, C7.2, C7.4, C7.5, C8.1.

**Objectif** : éliminer les N+1 + cascades de rerender + bundle bloaté.

**Étapes attendues** :
1. **Batch user lookups** : `Promise.all` dans getTablePlayers/getActivePlayers/showdown — ou pré-charger un Map<userId, user> en début de query.
2. **Dénormaliser `playerCount`** sur la table pour `getPublicTables` (mise à jour atomique au join/leave).
3. **Projection `getShowdownResults`** : retourner `{ name, handRank, cards }` au lieu de l'objet complet.
4. **`React.memo(PlayerSeat)` + `useMemo(seats)`** dans PokerTable.
5. **Conditionner queries `useGameLogic`** selon la phase.
6. **`React.lazy(PokerTable)` + `React.lazy(CreateTableForm)`** dans AppMain.

### Lot C5 — Hardening prod-ready (🟡 axe 9 + mineurs, ~4-5h)

**Findings** : C9.3, C9.4 + tous les 🟢 restants à valider/ignorer.

**Objectif** : remettre les deps à jour + nettoyer les mineurs.

**Étapes attendues** :
1. **Upgrade `convex` 1.25 → ≥1.37** + tests end-to-end.
2. **Upgrade `@convex-dev/auth`** (C9.5).
3. **Upgrade `@typescript-eslint/*`, eslint, typescript** (C9.3, débloque aussi `npm audit fix` pour C9.2 résiduels).
4. **Upgrade `vite`** dans une étape isolée (3 majors, breaking changes).
5. Triage des 🟢 : confirmer "OK acceptable" ou ouvrir des micro-issues séparées pour les mémo manquants (C7.1, C7.3) et chunks vite (C8.4).

### Estimation globale lots C1-C5 : ~18-23h

**Lot C1 doit être livré avant toute exposition publique de l'app.** C2/C3/C4/C5 peuvent être enchaînés sur plusieurs sessions.

---

## Hors-scope (rappel de la spec)

Conformément au cadrage 0.C (threat model B — public restreint authentifié), les zones suivantes ne sont **pas** couvertes :

- **RGPD / légal** (right to delete, data retention, export utilisateur) — réservé à un threat model C ou si l'app monétise.
- **Observabilité côté client** (Sentry, error tracking front, telemetry produit) — phase 0.D si besoin.
- **CI/CD pipeline** (GitHub Actions, déploiement automatisé, tests d'intégration en pipeline) — orthogonal sécu/perf.
- **i18n homogène** — déjà signalé en 0.B, hors périmètre 0.C.
- **Refactoring qualité code** (taille des fichiers, séparation des responsabilités) — non lié à sécu/perf.

Par ailleurs, la phase 0.C n'a **pas exécuté** :

- **Smoke runtime navigateur** sur `home-poker.vjdev.tech` — skippé d'un commun accord, les findings statiques 🔴 sont suffisamment clairs et seront reproduits en TDD au début de 1.C.
- **Load test 9 joueurs** — skippé, perf 🔴=0 en statique. Le harness reste à implémenter en 1.C-perf si validation sous charge nécessaire.

---

*Fin du rapport. Prêt pour le brainstorm de la phase 1.C.*
