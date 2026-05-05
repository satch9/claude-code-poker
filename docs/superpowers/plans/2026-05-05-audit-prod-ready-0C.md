# Audit Production-Ready 0.C — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire un rapport priorisé des findings sécurité + performance du repo (post-module Invitations), qui alimentera le plan de fix 1.C.

**Architecture:** Audit hybride en 4 voies : (1) 3 sub-agents parallèles (Sécu axes 1-5, Perf axes 6-8, Prod axe 9) en lecture seule, (2) smoke runtime DevTools sur `home-poker.vjdev.tech` exécuté par le main agent, (3) load test 9 bots simultanés via harness Convex, (4) consolidation finale dans un rapport markdown au format identique à 0.A et 0.B.

**Tech Stack:** Convex 1.25 (déploiement dev `incredible-hedgehog-551`), client `convex/browser` côté Node, ESM Node 20+, vitest 3.2.

**Spec source:** `docs/superpowers/specs/2026-05-05-audit-prod-ready-design.md`
**Audits précédents:** `docs/superpowers/specs/2026-05-04-audit-technique-rapport.md`, `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure

| Fichier | Rôle | Création / Modif |
|---|---|---|
| `.audit-tmp/0C/` | Logs bruts sub-agents (gitignored) | Create transitoire |
| `.audit-tmp/0C/secu.md` | Findings axes 1-5 | Create |
| `.audit-tmp/0C/perf.md` | Findings axes 6-8 | Create |
| `.audit-tmp/0C/prod.md` | Findings axe 9 | Create |
| `.audit-tmp/0C/load.json` | Métriques load test | Create |
| `.audit-tmp/0C/runtime-smoke.md` | Findings smoke navigateur | Create |
| `tests/load/0C-9player-bench.mjs` | Harness load test 9 joueurs | Create |
| `tests/load/0C-lib.mjs` | Helpers communs (auth, table, action) | Create |
| `tests/load/README.md` | Doc d'usage | Create |
| `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md` | Rapport consolidé final | Create |

---

## Pré-requis

- [ ] **Repo clean** : `git status` retourne "nothing to commit, working tree clean"
- [ ] **Convex dev disponible** : `npx convex dev` peut être lancé en background si besoin (vérifier `CONVEX_DEPLOYMENT` dans `.env.local`)
- [ ] **`.audit-tmp/` gitignored** : `grep -q "^\.audit-tmp" .gitignore` → exit 0
- [ ] **Comptes test prêts** : 2 comptes `audit0c-1@test.local` / `audit0c-2@test.local` créés sur `home-poker.vjdev.tech` OU mutation admin pour les créer pendant Task 4

Si un pré-requis manque : ping user.

---

### Task 1 : Setup .audit-tmp/0C/

**Files:**
- Create: `.audit-tmp/0C/` (dossier)

- [ ] **Step 1 : Créer le dossier**

```bash
mkdir -p .audit-tmp/0C
```

Expected: dossier créé, pas de sortie.

- [ ] **Step 2 : Vérifier gitignore**

```bash
git check-ignore .audit-tmp/0C/test
```

Expected: `.audit-tmp/0C/test` est ignoré (exit 0). Si pas ignoré, ajouter `.audit-tmp/` à `.gitignore` et committer séparément avant de continuer.

---

### Task 2 : Dispatch sub-agent Sécu (axes 1-5)

**Findings collectés** : C1.* à C5.*

**Files:**
- Create: `.audit-tmp/0C/secu.md`

- [ ] **Step 1 : Dispatch un sub-agent Explore avec le prompt suivant**

Utiliser `Agent(subagent_type=Explore)` avec ce prompt **tel quel** :

> Audit sécurité statique d'une app poker Convex/React dans `/var/www/vincent/claude-code-poker`. Threat model : public restreint authentifié — utilisateur malicieux avec DevTools, scrapers, joueur tricheur. Couvre 5 axes :
>
> **Axe 1 — Auth & sessions.** Lis `convex/auth.ts`, `src/core/hooks/useAuth.ts`. Vérifie : hash password (post-1.B utilise salt par user, vérifier l'implémentation est correcte), tokens/sessions Convex, `signOut` côté serveur, multi-device, password reset (existe ? sinon noter), absence de lockout après N tentatives, fuite éventuelle du hash dans queries `getUser*`.
>
> **Axe 2 — Autorisation Convex.** Liste TOUTES les `query`/`mutation`/`action` dans `convex/` (sauf `_generated`). Pour chacune : vérifie `ctx.auth.getUserIdentity()` ou validation `userId` arg. Identifie celles qui ne vérifient PAS l'identité de l'appelant. Cible particulière : `players.ts` (join/leave/action), `tables.ts` (create/update), `core/gameEngine.ts` (startGame, playerAction, advanceToNextPhase), module Invitations (`convex/modules/invitations/*`). Consolide par module si plusieurs mutations partagent le même défaut (ex : "5 mutations de `players.ts` ne vérifient pas l'auth").
>
> **Axe 3 — Validation entrées.** Pour chaque mutation : args validés via `v.*` ou Zod ? Cherche XSS dans rendu de `name`/`username`/`actionFeed` côté UI (`src/`) — y a-t-il un `dangerouslySetInnerHTML` ou rendu non escapé ?
>
> **Axe 4 — Anti-triche jeu.** Audit `convex/utils/poker.ts:shuffleDeck` (RNG : `Math.random` ou crypto ?). Audit toutes les queries qui retournent des `players` ou `gameStates` : le champ `cards` (cartes privées) est-il filtré pour ne renvoyer que celles du joueur appelant ? Le champ `remainingDeck` (post-1.B) est-il exposé ? Vérifier `convex/players.ts` (getTablePlayers, getActivePlayers, getPlayerByUserAndTable).
>
> **Axe 5 — Rate limiting & abus.** Cherche dans tout le repo : `rate-limit`, `throttle`, `RateLimiter`. Identifie les surfaces exposées : signup, signin, createTable, joinByCode (codes 6 chars = 36⁶ ≈ 2 milliards, mais brute-forçable côté client), playerAction (spam possible).
>
> **Format de sortie** : markdown structuré, écris dans `.audit-tmp/0C/secu.md`. Pour chaque finding :
> ```
> #### C<axe>.<num> — Titre court
> - **Sévérité** : 🔴 / 🟡 / 🟢
> - **Source** : statique
> - **Localisation** : `chemin/fichier.ts:ligne`
> - **Description** : 2-3 lignes, fact-based
> - **Recommandation** : direction de fix
> ```
> Sévérité : 🔴 exploit direct (lit cartes adverses, prend le compte d'un autre), 🟡 risque conditionnel ou hardening important, 🟢 mineur. Sois exhaustif mais consolide les doublons. Ne propose AUCUN fix toi-même. N'écris PAS de code. Termine en confirmant le path du fichier produit.

- [ ] **Step 2 : Vérifier le fichier produit**

```bash
ls -la .audit-tmp/0C/secu.md && wc -l .audit-tmp/0C/secu.md
```

Expected: fichier > 30 lignes. Si < 30, le sub-agent a échoué — re-dispatch ou faire en grep séquentiel.

---

### Task 3 : Dispatch sub-agent Perf (axes 6-8)

**Findings collectés** : C6.* à C8.* (statique uniquement — l'axe 8 load test est en Task 5)

**Files:**
- Create: `.audit-tmp/0C/perf.md`

- [ ] **Step 1 : Dispatch un sub-agent Explore avec le prompt suivant**

> Audit performance statique d'une app poker Convex/React dans `/var/www/vincent/claude-code-poker`. Couvre 3 axes (le load test en charge réelle est traité ailleurs — ici tu fais uniquement le statique).
>
> **Axe 6 — Queries Convex.** Lis `convex/schema.ts` et liste tous les indexes. Grep `withIndex` dans `convex/` : pour chaque query qui scan une table, vérifie qu'elle utilise un index. Identifie : queries sans `withIndex` qui filtrent ou trient (= full scan), queries qui retournent des objets gros (ex : table entière + tous les players + gameState dans un seul return = payload bloated), N+1 (mutation qui boucle des `db.get` au lieu d'un `withIndex`).
>
> **Axe 7 — Rerenders front.** Grep `useMemo`, `useCallback`, `React.memo` dans `src/`. Pour les composants critiques (`PokerTable`, `PlayerSeat`, `BettingControls`, `CommunityCards`, `Lobby`) : vérifie les deps des `useMemo`/`useCallback` (objets recréés à chaque render = mémo cassé), repère les props qui changent à chaque render (objets/arrays inline). Lis spécifiquement `src/core/components/Game/PokerTable.tsx` et identifie les sources de re-render systématique.
>
> **Axe 8 (statique uniquement) — Bundle & scalabilité.** Estime statiquement : taille des `import` lourds (ex : `pokersolver` complet importé partout vs ciblé), `import` dynamiques manquants (lobby + table chargés ensemble alors qu'on est sur l'un OU l'autre), polyfills inutiles. Liste les composants qui pourraient être lazy-loadés.
>
> **Format de sortie** : markdown dans `.audit-tmp/0C/perf.md`. Format finding identique à l'audit sécu :
> ```
> #### C<axe>.<num> — Titre court
> - **Sévérité** : 🔴 / 🟡 / 🟢
> - **Source** : statique
> - **Localisation** : `chemin/fichier.ts:ligne`
> - **Description** : 2-3 lignes
> - **Recommandation** : direction de fix
> ```
> Sévérité : 🔴 dégradation perf >2× empêchant le jeu (full scan sur table à 100+ rows + sans index), 🟡 perceptible <2× (rerender évitable mais peu fréquent), 🟢 micro-optimisation. Ne propose AUCUN fix de code. Termine en confirmant le path produit.

- [ ] **Step 2 : Vérifier**

```bash
ls -la .audit-tmp/0C/perf.md && wc -l .audit-tmp/0C/perf.md
```

Expected: fichier > 20 lignes.

---

### Task 4 : Dispatch sub-agent Prod (axe 9)

**Findings collectés** : C9.*

**Files:**
- Create: `.audit-tmp/0C/prod.md`

- [ ] **Step 1 : Dispatch un sub-agent Explore avec le prompt suivant**

> Audit production-ready statique d'une app poker Convex/React dans `/var/www/vincent/claude-code-poker`. Un seul axe : secrets / env / deps.
>
> Couvre :
> - Fichiers `.env*` : tracked dans git ? (`git ls-files | grep -E '\.env'`). Si oui, leur contenu est-il sensible ?
> - Clés Convex / Resend / autres clés API : présentes en clair côté front (dans `src/` ou dans le bundle) ? Vérifie `import.meta.env.VITE_*` — toute variable VITE_* finit dans le bundle client, donc rien de sensible ne doit y être.
> - `npm audit` : lance `npm audit --json` et résume les vulnérabilités (high/critical seulement, ignore les low).
> - Override `@auth/core` : `package.json` contient `"overrides"` ou `"resolutions"` ? Si oui, lequel et pourquoi (vérifier en regardant la version installée vs la latest publique sur npm registry — `npm view @auth/core version`).
> - Deps obsolètes critiques : `npm outdated --json` — résume seulement les deps avec un major retard ET impact sécurité (ex : eslint EOL, convex retard, packages avec CVE).
> - Scripts npm dangereux : `package.json` contient des `prepublish`/`postinstall` qui exécutent du code arbitraire ?
>
> **Format** : markdown dans `.audit-tmp/0C/prod.md`. Format finding identique aux autres axes. Sévérité : 🔴 secret leaké en prod / CVE high exploitable, 🟡 dep obsolète sans CVE direct, 🟢 hygiène. Ne propose AUCUN fix de code. Termine en confirmant le path produit.

- [ ] **Step 2 : Vérifier**

```bash
ls -la .audit-tmp/0C/prod.md && wc -l .audit-tmp/0C/prod.md
```

Expected: fichier > 15 lignes.

---

### Task 5 : Smoke runtime sur `home-poker.vjdev.tech`

**Findings collectés** : suffixés `-runtime` (C2.x-runtime, C4.x-runtime).

**Files:**
- Create: `.audit-tmp/0C/runtime-smoke.md`

**Note** : nécessite 2 navigateurs ou 2 onglets en mode incognito. Le main agent ne peut pas lancer de navigateur — c'est le user qui clique. Le main agent fournit les étapes précises et reçoit les retours.

- [ ] **Step 1 : Préparer 2 comptes test**

Sur `home-poker.vjdev.tech`, signup deux comptes :
- `audit0c-1@test.local` / mot de passe `Audit0C-Test-1`
- `audit0c-2@test.local` / mot de passe `Audit0C-Test-2`

Si la création échoue (rate limit, signup fermé), ping user.

- [ ] **Step 2 : Test bypass autorisation (axe 2-runtime)**

Compte 1 ouvert, joue une partie heads-up jusqu'à preflop avec un bot (ou demande à user de jouer compte 2 simultanément). Dans la console DevTools du compte 1, exécuter :

```js
// Récupérer le ConvexClient global (exposé par le hook useConvex)
const c = window.__convexClient || window.convexClient; // adapter au runtime
// Tenter d'agir en tant que l'autre joueur
await c.mutation('core/gameEngine:playerAction', {
  tableId: '<id_de_la_table>',
  userId: '<userId_du_joueur_2>',
  action: 'fold'
});
```

Attendu sain : la mutation rejette (`Unauthorized` ou similaire).
Attendu vulnérable : la mutation passe → finding 🔴 C2.x-runtime.

Noter le résultat dans `.audit-tmp/0C/runtime-smoke.md`.

- [ ] **Step 3 : Test leak cartes adverses (axe 4-runtime)**

Compte 1 sur la table, ouvre DevTools → Network → filtrer "convex" → trouver la requête `getTablePlayers` ou équivalent. Inspecter le payload retourné : contient-il les `cards` du joueur 2 ?

Attendu sain : `cards: []` ou champ absent pour les autres joueurs.
Attendu vulnérable : cartes lisibles → finding 🔴 C4.x-runtime.

Noter dans le fichier.

- [ ] **Step 4 : Test bruteforce signin (axe 1-runtime)**

Console DevTools, sur écran login déconnecté :

```js
for (let i = 0; i < 10; i++) {
  try {
    await c.mutation('auth:signInWithPassword', {
      email: 'audit0c-1@test.local',
      password: 'wrong-' + i
    });
  } catch(e) { console.log(i, e.message); }
}
```

Attendu sain : après N tentatives, lockout ou délai imposé.
Attendu vulnérable : 10 tentatives sans frein → finding 🟡 C1.x-runtime.

- [ ] **Step 5 : Test brute-force code invitation (axe 5-runtime)**

Console DevTools, compte 1 connecté :

```js
const codes = ['ABC123', 'XYZ789', '000000', '111111', '999999', 'AAAAAA'];
for (const code of codes) {
  try {
    const r = await c.query('modules/invitations:getTableByInviteCode', { code });
    console.log(code, '→', r);
  } catch(e) { console.log(code, '→ err:', e.message); }
}
```

Attendu sain : pas de différence de timing révélant l'existence d'un code, ou rate limit après quelques essais.
Attendu vulnérable : enumération possible → finding 🟡 C5.x-runtime.

- [ ] **Step 6 : Consolider les retours**

Écrire dans `.audit-tmp/0C/runtime-smoke.md` les findings runtime au format standard (Sévérité / Source: runtime / Localisation / Description avec étapes repro / Recommandation).

---

### Task 6 : Harness load test (axe 8 runtime)

**Findings collectés** : C8.*-load.

**Files:**
- Create: `tests/load/0C-lib.mjs`
- Create: `tests/load/0C-9player-bench.mjs`
- Create: `tests/load/README.md`
- Create: `.audit-tmp/0C/load.json`

- [ ] **Step 1 : Créer `tests/load/0C-lib.mjs`**

Helpers communs (auth signup, signin, joinTable, playerAction). Inspirer de `tests/legacy/audit-harness/lib.mjs` du 0.B (s'il existe encore) ou réécrire à partir du client `convex/browser`.

Contenu attendu :

```javascript
// tests/load/0C-lib.mjs
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

const DEPLOYMENT_URL = process.env.VITE_CONVEX_URL || 'https://incredible-hedgehog-551.convex.cloud';

export function makeClient() {
  return new ConvexHttpClient(DEPLOYMENT_URL);
}

export async function signupOrSignin(client, email, password) {
  try {
    return await client.mutation(api.auth.signUpWithPassword, { email, password, name: email });
  } catch (e) {
    if (String(e).includes('exists')) {
      return await client.mutation(api.auth.signInWithPassword, { email, password });
    }
    throw e;
  }
}

export async function timed(label, fn) {
  const t0 = performance.now();
  try {
    const r = await fn();
    return { label, ms: performance.now() - t0, ok: true, result: r };
  } catch (e) {
    return { label, ms: performance.now() - t0, ok: false, error: String(e) };
  }
}

export function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor(p * s.length));
  return s[i];
}
```

- [ ] **Step 2 : Créer `tests/load/0C-9player-bench.mjs`**

```javascript
// tests/load/0C-9player-bench.mjs
// Lance 9 clients Convex en parallèle, joue ~50 mains ou 5 minutes max,
// mesure latence par action et écrit .audit-tmp/0C/load.json.

import { writeFileSync } from 'node:fs';
import { makeClient, signupOrSignin, timed, percentile } from './0C-lib.mjs';
import { api } from '../../convex/_generated/api.js';

const PLAYERS = 9;
const TARGET_HANDS = 50;
const TIMEOUT_MS = 5 * 60 * 1000;

async function setup() {
  const players = [];
  for (let i = 1; i <= PLAYERS; i++) {
    const c = makeClient();
    const u = await signupOrSignin(c, `load0c-${i}@test.local`, `Load0C-${i}`);
    players.push({ client: c, userId: u.userId || u._id, idx: i });
  }
  return players;
}

async function createTableAndJoin(players) {
  const host = players[0];
  const t = await host.client.mutation(api.tables.createTable, {
    creatorId: host.userId,
    name: 'load-bench',
    maxPlayers: PLAYERS,
    smallBlind: 5,
    bigBlind: 10,
    startingStack: 1000,
    isPrivate: true,
    gameType: 'cash',
  });
  const tableId = t.tableId || t;
  for (let i = 0; i < PLAYERS; i++) {
    await players[i].client.mutation(api.players.joinTable, {
      tableId, userId: players[i].userId, seatPosition: i, buyInAmount: 1000,
    });
  }
  return tableId;
}

async function playAction(player, tableId, action, amount) {
  return timed(`${action}-${player.idx}`, () =>
    player.client.mutation(api.core.gameEngine.playerAction, {
      tableId, userId: player.userId, action, amount,
    })
  );
}

async function main() {
  console.log('[setup] creating 9 clients...');
  const players = await setup();
  console.log('[setup] creating table...');
  const tableId = await createTableAndJoin(players);
  console.log('[setup] starting game...');
  await players[0].client.mutation(api.core.gameEngine.startGame, {
    tableId, userId: players[0].userId,
  });

  const samples = [];
  const errors = [];
  const tStart = Date.now();
  let handsPlayed = 0;

  while (handsPlayed < TARGET_HANDS && Date.now() - tStart < TIMEOUT_MS) {
    // Stratégie naïve : tout le monde call/check jusqu'au showdown.
    // Boucle robuste : interroger l'état, déterminer le joueur courant, agir.
    try {
      const state = await players[0].client.query(api.core.gameEngine.getGameState, { tableId });
      const current = state.currentPlayerIdx;
      if (current == null) {
        handsPlayed++;
        await new Promise(r => setTimeout(r, 200)); // laisser le scheduler avancer
        continue;
      }
      const p = players[current];
      const r = await playAction(p, tableId, 'call', 0);
      if (r.ok) samples.push(r); else errors.push(r);
    } catch (e) {
      errors.push({ ms: 0, ok: false, error: String(e) });
    }
  }

  const lats = samples.map(s => s.ms);
  const out = {
    players: PLAYERS,
    handsPlayed,
    elapsedMs: Date.now() - tStart,
    samples: samples.length,
    errors: errors.length,
    latency: {
      p50: percentile(lats, 0.5),
      p95: percentile(lats, 0.95),
      p99: percentile(lats, 0.99),
      max: Math.max(...lats),
    },
    errorSample: errors.slice(0, 5),
  };
  writeFileSync('.audit-tmp/0C/load.json', JSON.stringify(out, null, 2));
  console.log('[done]', out);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3 : Créer `tests/load/README.md`**

```markdown
# Load tests 0.C

## 9-player bench

Mesure la latence des actions de jeu avec 9 clients Convex simultanés.

```bash
node tests/load/0C-9player-bench.mjs
```

Sortie : `.audit-tmp/0C/load.json` avec P50/P95/P99 et erreurs.

Pré-requis : `VITE_CONVEX_URL` exporté ou défaut sur le déploiement dev courant.
```

- [ ] **Step 4 : Lancer le harness**

```bash
node tests/load/0C-9player-bench.mjs
```

Expected: termine en <5 min, écrit `.audit-tmp/0C/load.json`. Si le harness échoue avant 5 mains, c'est en soi un finding 🔴 (à documenter).

Si l'API Convex (noms de mutations, signatures) a divergé du plan, **adapter le code** (ne pas modifier le déploiement). Si l'adaptation prend > 1h, ping user.

- [ ] **Step 5 : Interpréter les métriques**

Critères :
- P50 < 200ms = OK, P95 < 500ms = OK
- P95 entre 500-1000ms = finding 🟡 C8.x
- P95 > 1000ms ou erreurs > 5% = finding 🔴 C8.x

Documenter dans `.audit-tmp/0C/perf.md` (ajouter à la suite des findings perf statiques).

- [ ] **Step 6 : Commit le harness**

```bash
git add tests/load/
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
chore(audit): harness load test 9 joueurs pour 0.C

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 : Consolidation du rapport

**Files:**
- Create: `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md`

- [ ] **Step 1 : Lire les 4 fichiers source**

```bash
cat .audit-tmp/0C/secu.md .audit-tmp/0C/perf.md .audit-tmp/0C/prod.md .audit-tmp/0C/runtime-smoke.md
cat .audit-tmp/0C/load.json
```

- [ ] **Step 2 : Renuméroter les IDs en `C<axe>.<num>` cohérent**

Convention :
- C1.1, C1.2, ... pour axe 1 (auth)
- C2.1, ... pour axe 2 (autorisation)
- ...jusqu'à C9.x

Findings runtime suffixés `-runtime`, findings load suffixés `-load`.

- [ ] **Step 3 : Écrire le rapport au format 0.A/0.B**

Structure obligatoire :

```markdown
# Rapport d'audit production-ready — Phase 0.C

## Métadonnées
| Champ | Valeur |
|---|---|
| Date | 2026-05-05 |
| Phase | 0.C |
| Spec source | docs/superpowers/specs/2026-05-05-audit-prod-ready-design.md |
| Plan d'exécution | docs/superpowers/plans/2026-05-05-audit-prod-ready-0C.md |
| Branche | master |
| Commit de référence | <hash master au début de l'audit> |
| Threat model | B — public restreint authentifié |
| Méthode | Statique (3 sub-agents) + smoke runtime + load test 9 joueurs |

## Résumé exécutif
Verdict global : 🔴 / 🟠 / 🟡 / 🟢 (selon nb de 🔴).
Total findings : N — 🔴 X / 🟡 Y / 🟢 Z.

## Findings par axe
### Axe 1 — Auth & sessions
[findings]
### Axe 2 — Autorisation Convex
[findings]
... (jusqu'à 9)

## Tableau récapitulatif
| ID | Sév. | Source | Titre | Localisation |
|----|------|--------|-------|--------------|
[trié par sévérité puis par axe]

## Recommandations pour 1.C
### Lot C1 — Critiques sécu (🔴 sécu)
### Lot C2 — Critiques perf (🔴 perf)
### Lot C3 — Hardening sécu (🟡 sécu)
### Lot C4 — Optimisations perf (🟡 perf)
### Lot C5 — Hardening prod (🟡 axe 9 + mineurs)

Estimation globale lots C1-C5 : ~Xh-Yh

## Hors-scope (rappel)
[liste de la spec : RGPD, observabilité front, CI/CD, i18n]

*Fin du rapport. Prêt pour le brainstorm de la phase 1.C.*
```

- [ ] **Step 4 : Vérifier la cohérence**

- Tous les findings ont un ID unique de la forme `C<axe>.<num>`
- Le tableau récap inclut TOUS les findings (compter : tableau == somme des findings dans les sections par axe)
- Section "Recommandations pour 1.C" a bien 5 lots, chaque finding 🔴/🟡 est cité dans un lot
- Hors-scope copié de la spec sans contradiction

- [ ] **Step 5 : Commit le rapport**

```bash
git add docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "$(cat <<'EOF'
feat(audit): rapport 0.C — production-ready (sécurité + performance)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8 : Cleanup & handoff

- [ ] **Step 1 : Supprimer les comptes test prod (R3 mitigation)**

Soit via mutation admin si elle existe (`api.users.deleteByEmailPrefix({ prefix: 'audit0c-' })`), soit lister les emails à supprimer manuellement et les transmettre au user.

Documenter dans le commentaire du commit final ou dans une note PR : "comptes `audit0c-*` et `load0c-*` à supprimer manuellement".

- [ ] **Step 2 : Vérifier l'état final**

```bash
git status
git log --oneline -5
```

Expected: working tree clean, le commit `feat(audit): rapport 0.C` en HEAD ou à 1-2 commits du HEAD.

- [ ] **Step 3 : Notifier user**

Court message :
> Audit 0.C terminé. Rapport : `docs/superpowers/specs/2026-05-05-audit-prod-ready-rapport.md`. Findings totaux : N (🔴 X / 🟡 Y / 🟢 Z). Comptes test à cleanup : audit0c-1, audit0c-2, load0c-1..9. Prêt pour le brainstorm 1.C quand tu veux.

---

## Critères de sortie globaux

- [ ] Rapport commité contenant ≥ 1 finding par axe (ou justification documentée si 0 finding sur un axe)
- [ ] Tableau récapitulatif présent et cohérent
- [ ] Section "Recommandations pour 1.C" présente avec 5 lots
- [ ] Harness load test commité dans `tests/load/`
- [ ] Hors-scope rappelés explicitement
- [ ] `git status` clean

## Risques (rappel de la spec)

- R1 — bruit axe 2 → consolider par module
- R2 — load test révèle bugs fonctionnels → backlog 1.B-tail, pas dans 0.C
- R3 — comptes test pollution prod → cleanup Task 8
- R4 — Convex dev sature à 9 connexions → documenter en C8.x-load
- R5 — module Invitations 🔴 → prioritaire en 1.C

## Suite

Une fois le rapport validé par le user, invoquer `superpowers:brainstorming` pour la phase **1.C** (spec de fix sécu + perf), puis `writing-plans` pour le plan d'exécution.
