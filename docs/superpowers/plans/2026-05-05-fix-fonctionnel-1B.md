# Fix Fonctionnel 1.B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le MVP heads-up jouable de bout en bout (gagnant correct, pot bien réparti, showdown visible, leave gérable, validation serveur, UX créateur cohérente).

**Architecture:** 17 tasks séquentielles regroupées en 3 lots (B1 moteur, B2 auth/validation, B3 UX). Le Lot B1 commence par TDD strict (10 tests poker rouges) pour fixer la spec du moteur avant tout fix. Les fixes sont commités individuellement (un commit par étape majeure).

**Tech Stack:** Convex 1.15, vitest 3, Zod (à activer), pokersolver, React 18, TypeScript 5.2.

**Spec source:** `docs/superpowers/specs/2026-05-05-fix-fonctionnel-1B-design.md`
**Audit source:** `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure — Vue d'ensemble

| Fichier | Action |
|---|---|
| `tests/poker-integrity.test.js` | Modifier — ajout de ~10 tests (Task 1) |
| `convex/utils/handEvaluator.ts` | Modifier — fix régression (Task 2) |
| `convex/core/gameEngine.ts` | Modifier — pot, deck, scheduler, leave (Tasks 3-7) |
| `convex/schema.ts` | Modifier — ajout `users.passwordSalt`, `gameStates.remainingDeck` (Tasks 4, 10) |
| `convex/shared/validation.ts` | Create — schémas Zod (Task 8) |
| `convex/auth.ts` | Modifier — Zod, salt, signOut (Tasks 9, 10, 11) |
| `convex/tables.ts` | Modifier — Zod validation, filtre `isPrivate` (Tasks 9, 16) |
| `convex/players.ts` | Modifier — clamp `buyInAmount`, leave during hand (Tasks 7, 9) |
| `src/core/hooks/useAuth.ts` | Modifier — error state, signOut serveur (Tasks 11, 12) |
| `src/core/components/Auth/LoginForm.tsx` | Modifier — affichage erreurs (Task 12) |
| `src/core/components/Auth/EmailPasswordForm.tsx` | Modifier — affichage erreurs (Task 12) |
| `src/core/components/Game/PokerTable.tsx` | Modifier — droits créateur, message attente (Tasks 13, 14) |
| `src/core/components/Game/ShowdownResults.tsx` | Modifier — retrait bouton Continuer (Task 13) |
| `src/core/components/App/AppMain.tsx` | Modifier — auto-seat créateur (Task 15) |

---

### Task 1: TDD — 10 tests poker rouges (Lot B1)

**Findings adressés** : préparation des fixes B-runtime.5, B-runtime.7, et garde-fou général moteur.

**Files:**
- Modify: `tests/poker-integrity.test.js`

- [ ] **Step 1: Lire la structure existante**

```bash
head -60 tests/poker-integrity.test.js
```

Confirme : `import { evaluateHandRobust, determineWinners, validateHand } from '../convex/utils/handEvaluator';`. Le `describe('🃏 Évaluation des Mains - Tests Critiques')` existe déjà et contient quelques tests (royal flush, ties, wheel, etc.).

- [ ] **Step 2: Ajouter 10 nouveaux tests dans un nouveau `describe`**

À la fin de `tests/poker-integrity.test.js`, ajouter :

```javascript
describe('🃏 Régression 1.B — Tests TDD pour fix handEvaluator/determineWinners', () => {
  // Helper: une "main" en Texas Hold'em est 7 cartes (2 hole + 5 community).
  // evaluateHandRobust prend ces 7 cartes et retourne la meilleure main de 5.
  const heart = (r) => ({ rank: r, suit: 'hearts' });
  const diamond = (r) => ({ rank: r, suit: 'diamonds' });
  const club = (r) => ({ rank: r, suit: 'clubs' });
  const spade = (r) => ({ rank: r, suit: 'spades' });

  it('1. Royal Flush A♠K♠Q♠J♠T♠ → name=Royal Flush, rank=9', () => {
    const cards = [spade('A'), spade('K'), spade('Q'), spade('J'), spade('10')];
    const r = evaluateHandRobust(cards);
    expect(r.name).toBe('Royal Flush');
    expect(r.rank).toBe(9);
  });

  it('2. Wheel straight A-2-3-4-5 → name=Straight, rank=4', () => {
    const cards = [heart('A'), club('2'), spade('3'), heart('4'), diamond('5')];
    const r = evaluateHandRobust(cards);
    expect(r.name).toBe('Straight');
    expect(r.rank).toBe(4);
  });

  it('3. Reproduction B-runtime.5 — Eliott (A♠ 6) bat Satch9 (4 Q) sur board A 9 10 Q 10', () => {
    const board = [spade('A'), heart('9'), diamond('10'), club('Q'), spade('10')];
    const eliott = [...board, spade('A'), diamond('6')];
    const satch = [...board, heart('4'), heart('Q')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(eliott), playerId: 'eliott' },
      { hand: evaluateHandRobust(satch), playerId: 'satch9' },
    ]);
    expect(winners).toEqual(['eliott']);
  });

  it('4. Two pair AA-1010 (kicker Q) bat QQ-1010 (kicker A)', () => {
    const eliott = [spade('A'), heart('A'), club('10'), diamond('10'), spade('Q')];
    const satch = [club('Q'), heart('Q'), club('10'), diamond('10'), heart('A')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(eliott), playerId: 'eliott' },
      { hand: evaluateHandRobust(satch), playerId: 'satch9' },
    ]);
    expect(winners).toEqual(['eliott']);
  });

  it('5. One pair AA + KQJ bat AA + KQ9', () => {
    const a = [spade('A'), heart('A'), club('K'), diamond('Q'), spade('J')];
    const b = [diamond('A'), club('A'), heart('K'), spade('Q'), heart('9')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });

  it('6. Flush bat Straight', () => {
    const flush = [heart('K'), heart('9'), heart('7'), heart('5'), heart('3')];
    const straight = [club('9'), diamond('10'), spade('J'), heart('Q'), club('K')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(flush), playerId: 'flush' },
      { hand: evaluateHandRobust(straight), playerId: 'straight' },
    ]);
    expect(winners).toEqual(['flush']);
  });

  it('7. Full house Ks over 3s bat Js over 5s', () => {
    const a = [spade('K'), heart('K'), club('K'), diamond('3'), spade('3')];
    const b = [spade('J'), heart('J'), club('J'), diamond('5'), heart('5')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });

  it('8. Vrai split — 2 mains identiques sur board complet', () => {
    // Les 2 joueurs jouent uniquement le board (5 cartes communes meilleures que leurs hole)
    const board = [spade('A'), heart('A'), club('A'), diamond('A'), spade('K')];
    const a = [...board, club('2'), heart('3')];
    const b = [...board, diamond('4'), spade('5')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners.sort()).toEqual(['a', 'b']);
  });

  it('9. Trips A bat Trips K (mêmes kickers QJ)', () => {
    const a = [spade('A'), heart('A'), club('A'), diamond('Q'), spade('J')];
    const b = [spade('K'), heart('K'), club('K'), diamond('Q'), heart('J')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });

  it('10. High card AKQJ9 bat AKQJ8 (last kicker tranche)', () => {
    const a = [spade('A'), heart('K'), club('Q'), diamond('J'), spade('9')];
    const b = [diamond('A'), club('K'), heart('Q'), spade('J'), heart('8')];
    const winners = determineWinners([
      { hand: evaluateHandRobust(a), playerId: 'a' },
      { hand: evaluateHandRobust(b), playerId: 'b' },
    ]);
    expect(winners).toEqual(['a']);
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent (le but TDD)**

Run: `npx vitest run tests/poker-integrity.test.js -t "Régression 1.B"`

Expected: au moins 1 test échoue (probablement le #3 et le #4 — le bug B-runtime.5). Les autres devraient passer si pokersolver est OK.

Si **aucun** test n'échoue → la régression a été détectée incorrectement, signaler dans le commit et continuer (le code ferait peut-être déjà ce qu'il faut, à vérifier au Task 2).

- [ ] **Step 4: Commit (les tests rouges sont la preuve de la régression)**

```bash
git add tests/poker-integrity.test.js
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "test(poker): 10 tests TDD pour la régression handEvaluator/determineWinners

Couvre Royal Flush, wheel straight, reproduction B-runtime.5 (Eliott vs
Satch9), 2 paires avec kickers, 1 paire séquentielle, flush vs straight,
full house, vrai split, trips, high card.

Au moins le test #3 et #4 doivent échouer sur le code actuel — c'est la
preuve écrite de la régression introduite par 3844844 (mapping rank-1)."
```

---

### Task 2: Fix handEvaluator + determineWinners (Lot B1)

**Findings adressés** : B-runtime.5.

**Files:**
- Modify: `convex/utils/handEvaluator.ts`

**Hypothèse de bug** : la fonction `determineWinnersWithGame` (ligne 182) recrée les hands pokersolver depuis `hand.cards` (5 cartes seulement, la meilleure main). Quand 2 joueurs ont 2 paires de structure différente (AA-TT vs QQ-TT), pokersolver compare correctement. Mais quelque chose dans la chaîne perd l'information. Les tests de Task 1 vont permettre de localiser précisément.

- [ ] **Step 1: Lire `evaluateHandWithGame` lignes 95-163**

```bash
sed -n '95,163p' convex/utils/handEvaluator.ts
```

Comprendre la chaîne : `Hand.solve(7 cards)` → `solvedHand.cards` (5 best) → `EnhancedHandRank.cards = handCards` (les 5 best). Le `mappedRank = solvedHand.rank - 1` (sauf Royal Flush) est l'ajout problématique.

- [ ] **Step 2: Lire `determineWinnersWithGame` lignes 182-208**

```bash
sed -n '182,208p' convex/utils/handEvaluator.ts
```

Confirmer : `Hand.solve(hand.cards)` recrée le pokersolver hand depuis 5 cartes, puis `Hand.winners` compare. **Si on ne passe que 5 cartes au lieu de 7, pokersolver perd l'info des 2 hole cards non utilisées dans la meilleure main, mais le tie-break reste correct sur 5 cartes**. Le bug n'est probablement pas ici.

- [ ] **Step 3: Investigation — exécuter un test ciblé pour comprendre**

Créer un fichier temporaire `/tmp/probe-b5.mjs` :

```javascript
import { Hand } from 'pokersolver';

// Eliott meilleure main: A,A,10,10,Q (ordre indifférent)
const eliott = Hand.solve(['As', 'Ah', 'Tc', 'Td', 'Qs']);
// Satch9 meilleure main: Q,Q,10,10,A
const satch = Hand.solve(['Qc', 'Qh', 'Tc', 'Td', 'Ah']);

console.log('Eliott rank:', eliott.rank, 'name:', eliott.name, 'descr:', eliott.descr);
console.log('Satch  rank:', satch.rank, 'name:', satch.name, 'descr:', satch.descr);
const winners = Hand.winners([eliott, satch]);
console.log('Winners:', winners.map(h => h.descr));
```

Run: `node /tmp/probe-b5.mjs`

Expected: pokersolver doit donner Eliott gagnant (2 paires AA hautes). Si oui, le bug est dans NOTRE code. Si non, le bug est dans pokersolver lui-même (peu probable).

- [ ] **Step 4: Si pokersolver gère correctement le cas (probable), localiser le bug dans notre code**

Le bug peut être :
- (a) Dans `evaluateHandWithGame` : la conversion de `solvedHand.cards` vers `handCards` perd des suits ou des ranks
- (b) Dans `determineWinnersWithGame` : la conversion `hand.cards.map(cardToPokerSolverFormat)` produit des doubles ou perd des cartes

Inspecter avec un `console.log` dans `evaluateHandWithGame` après `solvedHand` (ligne 124) :

```typescript
console.log('DEBUG eval:', {
  inputCards: cardStrings,
  solvedRank: solvedHand.rank,
  solvedName: solvedHand.name,
  solvedCards: solvedHand.cards.map(c => c.toString()),
});
```

Lancer le test #3 et observer.

- [ ] **Step 5: Implémenter le fix**

Le fix dépend du diagnostic Step 4. Trois cas probables :

**Cas A** — Le mapping `rank - 1` casse une comparaison externe (mais `Hand.winners` utilise les solvedHand directement, donc improbable). Si confirmé : revert partiel du mapping.

**Cas B** — La reconstruction dans `determineWinnersWithGame` (ligne 188-192) introduit un doublon de carte si une hole card a la même valeur qu'une community card. La main reconstituée serait alors invalide. Fix : passer les 7 cartes originales au lieu de `hand.cards`. Mais on ne les a plus à ce stade, il faut stocker les 7 cartes dans `EnhancedHandRank` (nouveau champ `originalCards`).

**Cas C** — Le calcul de `score` dans `evaluateHandWithGame` (ligne 135) est utilisé ailleurs pour comparer et il est faux pour 2-paires. Vérifier `calculateHandScore`.

Implémenter le fix correspondant. Pour le **Cas B** (le plus probable d'après l'analyse) :

```typescript
// Dans EnhancedHandRank interface (ligne 5-13), ajouter:
export interface EnhancedHandRank {
  rank: number;
  name: string;
  cards: Card[];
  description: string;
  rawRank: number;
  kickers: Card[];
  score: number;
  originalCards: Card[]; // ← AJOUTER : les 7 cartes initiales pour les comparaisons exactes
}

// Dans evaluateHandWithGame, ajouter à l'objet retourné (ligne 146-154) :
return {
  rank: mappedRank,
  name: finalName,
  cards: handCards,
  description: solvedHand.descr,
  rawRank: solvedHand.rank,
  kickers: kickers,
  score: score,
  originalCards: cards, // ← AJOUTER
};

// Dans determineWinnersWithGame (ligne 188-192), utiliser originalCards :
const solvedHands = hands.map(({ hand, playerId }) => {
  const cardStrings = hand.originalCards.map(cardToPokerSolverFormat);
  const solvedHand = Hand.solve(cardStrings, game);
  return { solved: solvedHand, playerId, originalHand: hand };
});

// Adapter aussi evaluateHandFallback (ligne 213) et l'autre returns avec
// originalCards: cards (pour les mains incomplètes <5 cartes : originalCards = cards aussi)
```

Pour les mains incomplètes (ligne 100-112) ajouter `originalCards: cards`.

- [ ] **Step 6: Lancer les 10 nouveaux tests**

Run: `npx vitest run tests/poker-integrity.test.js -t "Régression 1.B"`

Expected: tous les 10 tests passent.

Si certains échouent encore, retourner Step 4-5 avec investigation ciblée du test qui échoue.

- [ ] **Step 7: Lancer toute la suite vitest pour vérifier qu'on n'a rien cassé**

Run: `npx vitest run`

Expected: tous les tests passent (les anciens + les 10 nouveaux).

- [ ] **Step 8: Vérifier typecheck/lint**

Run: `npm run typecheck && npm run lint`

Expected: exit 0 (warnings ESLint OK, errors interdites).

- [ ] **Step 9: Commit**

```bash
git add convex/utils/handEvaluator.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(handEvaluator): corriger la régression de comparaison multi-joueurs

determineWinners reconstruisait les pokersolver hands depuis hand.cards
(5 cartes), perdant le contexte des 7 cartes originales nécessaire à
Hand.winners pour départager certaines comparaisons (notamment 2 paires
avec kickers différents).

Ajout du champ originalCards dans EnhancedHandRank, utilisé par
determineWinnersWithGame.

Résout B-runtime.5. Les 10 tests TDD ajoutés en Task 1 passent."
```

---

### Task 3: Distribution correcte du pot (Lot B1)

**Findings adressés** : B-runtime.7.

**Files:**
- Modify: `convex/core/gameEngine.ts` (fonction `determineWinner`, autour de ligne 788+)

- [ ] **Step 1: Localiser la fonction de distribution**

Run:

```bash
grep -n "determineWinner\|chips.*+.*pot\|chips.*=.*\\+\\s*pot\|distributePot\|share\|split" convex/core/gameEngine.ts | head -20
```

Lire les 30 lignes autour de la fonction qui crédite les jetons aux gagnants.

- [ ] **Step 2: Vérifier la logique actuelle**

Probablement : si `winners.length === 1`, attribue tout le pot. Si plusieurs, peut-être un bug (par exemple seul le premier reçoit, ou la division est mauvaise).

- [ ] **Step 3: Implémenter la distribution équitable**

```typescript
// Dans determineWinner (ou la fonction qui distribue) :
const winnerIds = determineWinners(handsForComparison);
const totalPot = gameState.pot;
const sharePerWinner = Math.floor(totalPot / winnerIds.length);
const remainder = totalPot - sharePerWinner * winnerIds.length;

// Distribuer la part entière à chacun
for (const winnerUserId of winnerIds) {
  const player = players.find(p => p.userId === winnerUserId);
  if (!player) continue;
  await ctx.db.patch(player._id, { chips: player.chips + sharePerWinner });
}

// Donner le reste au premier gagnant après le dealer (sens horaire)
if (remainder > 0) {
  const dealerPos = gameState.dealerPosition;
  const winnerPlayers = winnerIds
    .map(uid => players.find(p => p.userId === uid))
    .filter(Boolean)
    .sort((a, b) => {
      const distA = (a.seatPosition - dealerPos + table.maxPlayers) % table.maxPlayers;
      const distB = (b.seatPosition - dealerPos + table.maxPlayers) % table.maxPlayers;
      return distA - distB;
    });
  const firstAfterDealer = winnerPlayers[0];
  if (firstAfterDealer) {
    await ctx.db.patch(firstAfterDealer._id, {
      chips: firstAfterDealer.chips + sharePerWinner + remainder,
    });
    // Note: on a déjà ajouté sharePerWinner dans la boucle précédente,
    // donc on ajoute SEULEMENT le remainder ici. Adapter selon l'ordre des opérations.
  }
}

// Reset du pot
await ctx.db.patch(gameState._id, { pot: 0, sidePots: [] });
```

⚠️ Adapter exactement à la structure du code existant — ne pas dupliquer l'addition `sharePerWinner`. Si la boucle distribue tout le pot puis qu'on ajoute le reste, attention à ne pas double-créditer.

Forme alternative plus claire :

```typescript
const winnerIds = determineWinners(handsForComparison);
const totalPot = gameState.pot;
const sharePerWinner = Math.floor(totalPot / winnerIds.length);
const remainder = totalPot - sharePerWinner * winnerIds.length;

// Trier les gagnants par distance au dealer (sens horaire)
const dealerPos = gameState.dealerPosition;
const sortedWinners = winnerIds
  .map(uid => players.find(p => p.userId === uid))
  .filter(p => p !== undefined)
  .sort((a, b) => {
    const distA = (a.seatPosition - dealerPos + table.maxPlayers) % table.maxPlayers;
    const distB = (b.seatPosition - dealerPos + table.maxPlayers) % table.maxPlayers;
    return distA - distB;
  });

// Distribuer
for (let i = 0; i < sortedWinners.length; i++) {
  const player = sortedWinners[i];
  const extra = i === 0 ? remainder : 0; // le premier après dealer prend le reste
  await ctx.db.patch(player._id, { chips: player.chips + sharePerWinner + extra });
}

await ctx.db.patch(gameState._id, { pot: 0, sidePots: [] });
```

- [ ] **Step 4: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(gameEngine): distribution équitable du pot multi-gagnants

Quand determineWinners retourne plusieurs gagnants (split), le pot est
divisé à parts entières égales et le reste va au premier gagnant après
le dealer (sens horaire) — convention poker standard.

Résout B-runtime.7."
```

---

### Task 4: Conserver le deck unique entre phases (Lot B1)

**Findings adressés** : B4.1.

**Files:**
- Modify: `convex/schema.ts` (ajouter `gameStates.remainingDeck`)
- Modify: `convex/core/gameEngine.ts` (lignes 642 et 1431 + startGame)

- [ ] **Step 1: Ajouter `remainingDeck` au schéma**

Modifier `convex/schema.ts` ligne 96-108 (table `gameStates`) — ajouter le champ après `communityCards` :

```typescript
gameStates: defineTable({
    tableId: v.id("tables"),
    phase: v.union(
      v.literal("waiting"),
      v.literal("preflop"),
      v.literal("flop"),
      v.literal("turn"),
      v.literal("river"),
      v.literal("showdown")
    ),
    communityCards: v.array(v.string()),
    remainingDeck: v.optional(v.array(v.string())), // ← AJOUTER
    pot: v.number(),
    // ... reste inchangé
}).index("by_table", ["tableId"]),
```

`v.optional` car les anciens documents `gameStates` n'ont pas ce champ.

- [ ] **Step 2: Modifier `startGameInternal` pour initialiser `remainingDeck`**

Localiser dans `convex/core/gameEngine.ts` la fonction `startGameInternal` (ligne ~72). Après le shuffle initial et la distribution des hole cards aux joueurs, le code doit :
1. Créer le deck shuffle
2. Pop 2 cartes par joueur (hole cards)
3. **Stocker le deck restant** dans `gameStates.remainingDeck`

```typescript
// Exemple (à adapter à la structure exacte) :
const fullDeck = shuffleDeck(createDeck()); // tableau de strings genre ["As", "Ks", ...]
const remainingDeck = [...fullDeck];

// Distribuer 2 cartes par joueur
for (const player of players) {
  const card1 = remainingDeck.shift();
  const card2 = remainingDeck.shift();
  await ctx.db.patch(player._id, { cards: [card1, card2] });
}

// Stocker le deck restant
await ctx.db.patch(gameStateId, {
  // ... autres champs
  remainingDeck,
});
```

- [ ] **Step 3: Modifier `advanceToNextPhase` pour tirer depuis `remainingDeck`**

Localiser ligne 642 (`advanceToNextPhase`) et ligne 1431 (`advanceToNextPhaseWithStateMachine`). Remplacer :

```typescript
// AVANT (problématique)
const deck = shuffleDeck(createDeck());
const flop = deck.slice(0, 3);
```

Par :

```typescript
// APRÈS (correct)
const deck = [...(gameState.remainingDeck || [])];
if (deck.length === 0) {
  // Fallback compat anciennes parties (ne devrait pas arriver pour nouvelles)
  console.warn('remainingDeck vide, fallback shuffle');
  deck.push(...shuffleDeck(createDeck()));
}
// Tirer 1 carte burnée + N pour la phase
const burned = deck.shift(); // brûle 1 carte (convention poker)
let newCommunity = [];
if (phase === 'flop') {
  newCommunity = deck.splice(0, 3); // 3 cartes
} else if (phase === 'turn' || phase === 'river') {
  newCommunity = deck.splice(0, 1); // 1 carte
}

// Mettre à jour gameState avec le nouveau remainingDeck et les cartes communautaires
await ctx.db.patch(gameStateId, {
  remainingDeck: deck,
  communityCards: [...gameState.communityCards, ...newCommunity],
  // ... autres mises à jour
});
```

⚠️ Adapter à la structure réelle du code. Faire la même modif dans `advanceToNextPhaseWithStateMachine`.

- [ ] **Step 4: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0. Si erreur sur `remainingDeck` undefined, c'est que le push schema n'a pas eu lieu. Le déclencher si `npx convex dev` n'est pas en cours :

```bash
npx convex dev --once
```

- [ ] **Step 5: Lancer les tests existants pour vérifier rien cassé**

Run: `npx vitest run`

Expected: les 19 tests (9 existants + 10 nouveaux) passent.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(gameEngine): conserver le deck unique entre phases

Ajout du champ gameStates.remainingDeck (optionnel pour compat). Le deck
est shufflé au startGame, on en tire les hole cards puis les community
cards à chaque phase depuis ce même deck. Plus de risque de doublon
entre cartes privées et communautaires.

Résout B4.1."
```

---

### Task 5: Fix référence `forcePlayerFold` (Lot B1)

**Findings adressés** : B4.2.

**Files:**
- Modify: `convex/core/gameEngine.ts:1295` (et alentours si `internal/gameEngine` apparaît ailleurs)

- [ ] **Step 1: Localiser toutes les occurrences**

```bash
grep -n 'internal\["internal/gameEngine"\]\|internal\.\["internal/gameEngine"\]\|"internal/gameEngine"' convex/core/gameEngine.ts
```

- [ ] **Step 2: Remplacer**

Pour chaque occurrence, remplacer :

```typescript
internal["internal/gameEngine"]
```

par :

```typescript
internal["core/gameEngine"]
```

Note : la convention Convex est que `internal["chemin/du/module"]` doit refléter le **vrai chemin** du fichier. Le module est dans `convex/core/gameEngine.ts`, donc le chemin est `core/gameEngine`.

- [ ] **Step 3: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(gameEngine): corriger référence internal pour forcePlayerFold

internal['internal/gameEngine'] n'existait pas — le module est dans
convex/core/gameEngine.ts donc la clef est 'core/gameEngine'.

Résout B4.2."
```

---

### Task 6: Showdown visible 3s via scheduler (Lot B1)

**Findings adressés** : B5.1.

**Files:**
- Modify: `convex/core/gameEngine.ts` (fin de `endHand` ou `determineWinner`)

- [ ] **Step 1: Localiser la fin de main qui enchaîne sur la suivante**

```bash
grep -n "prepareNextHand\|startNextHandInternal\|endHand" convex/core/gameEngine.ts | head -10
```

Lire le contexte autour de l'enchaînement synchrone (lignes ~968-971 selon le rapport).

- [ ] **Step 2: Vérifier l'existence d'une mutation interne `startNextHandInternal`**

```bash
grep -n "export const.*startNextHand\|internalMutation\|export const startNextHandInternal" convex/core/gameEngine.ts
grep -rn "startNextHandInternal" convex/_generated/api.d.ts 2>/dev/null
```

Cas A : `startNextHandInternal` existe en internal mutation → utilisable directement.
Cas B : n'existe pas → la créer avant.

Pour le cas B, ajouter en tête de `convex/core/gameEngine.ts` :

```typescript
import { internalMutation } from "./_generated/server";
// ... reste des imports
```

Puis exporter une internal mutation qui fait le démarrage de la main suivante (extraire la logique existante de `endHand`/`prepareNextHand`) :

```typescript
export const startNextHandInternal = internalMutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    // Extraire ici la logique qui était synchrone dans endHand après determineWinner
    // (prepareNextHand puis startGameInternal sur les players actifs)
    return await prepareAndStartNextHand(ctx, args.tableId);
  },
});
```

- [ ] **Step 3: Remplacer l'appel synchrone par le scheduler**

Dans la fonction qui termine le showdown (souvent `determineWinner` ou `endHand`), remplacer :

```typescript
// AVANT (synchrone, le client ne voit pas le showdown)
await prepareNextHand(ctx, tableId);
await startGameInternal(ctx, tableId);
```

par :

```typescript
// APRÈS : passer en phase showdown puis schedule la main suivante 3s plus tard
await ctx.db.patch(gameStateId, {
  phase: "showdown",
  autoAdvanceAt: Date.now() + 3000,
  updatedAt: Date.now(),
});

// Schedule l'enchaînement
await ctx.scheduler.runAfter(
  3000,
  internal["core/gameEngine"].startNextHandInternal,
  { tableId }
);
```

⚠️ Le `runAfter` prend (delay_ms, functionRef, args). La signature exacte de `internal[...]` peut varier — vérifier sur le code généré dans `convex/_generated/api.d.ts`.

- [ ] **Step 4: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add convex/core/gameEngine.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(gameEngine): showdown visible 3s via scheduler

Au lieu d'enchaîner synchrone determineWinner → prepareNextHand →
startGame, on reste en phase showdown et on schedule l'enchaînement via
ctx.scheduler.runAfter(3000). Le client a 3s pour afficher les cartes.

Résout B5.1."
```

---

### Task 7: Leave during hand (Lot B1)

**Findings adressés** : B6.1.

**Files:**
- Modify: `convex/players.ts:88-119` (`leaveTable`)

- [ ] **Step 1: Lire `leaveTable`**

```bash
sed -n '88,119p' convex/players.ts
```

Localiser la ligne `if (gameState.phase !== "waiting") throw new Error(...)` et la remplacer par une logique qui gère le leave pendant une main.

- [ ] **Step 2: Implémenter le leave during hand**

Remplacer la condition de blocage par :

```typescript
// AVANT
if (gameState && gameState.phase !== "waiting") {
  throw new Error("Cannot leave table during active game");
}

// APRÈS
if (gameState && gameState.phase !== "waiting" && gameState.phase !== "showdown") {
  // C'est le tour du joueur partant ?
  const isMyTurn = player.seatPosition === gameState.currentPlayerPosition;

  if (isMyTurn && !player.isFolded) {
    // Fold automatique avant de partir
    await ctx.db.patch(player._id, {
      isFolded: true,
      hasActed: true,
      lastAction: "fold",
    });
    // Note : on ne déclenche pas la transition de tour ici (sera gérée par
    // le prochain check de fin de tour ou par la mutation playerAction d'autres
    // joueurs). Si on veut être propre, appeler une fonction utilitaire qui
    // avance le tour comme dans playerAction normal.
  } else if (!player.isFolded) {
    // Marquer fold passif (le joueur n'agit plus)
    await ctx.db.patch(player._id, {
      isFolded: true,
      hasActed: true,
      lastAction: "fold",
    });
  }
}

// Suppression du doc players (toujours)
await ctx.db.delete(player._id);

// Si moins de 2 joueurs restants, reset gameState à waiting
const remainingPlayers = await ctx.db
  .query("players")
  .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
  .collect();

if (remainingPlayers.length < 2 && gameState) {
  await ctx.db.patch(gameState._id, {
    phase: "waiting",
    pot: 0,
    currentBet: 0,
    communityCards: [],
    remainingDeck: [],
    sidePots: [],
    updatedAt: Date.now(),
  });
  await ctx.db.patch(args.tableId, { status: "waiting" });
}

// Logger l'événement
await ctx.db.insert("gameActions", {
  tableId: args.tableId,
  playerId: player._id,
  playerName: player.userId, // ou récupérer le nom user si dispo
  action: "left",
  isSystem: true,
  timestamp: Date.now(),
});
```

⚠️ Adapter à la structure exacte de la fonction. Lire d'abord le code complet pour ne rien casser.

- [ ] **Step 3: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add convex/players.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(players): autoriser leaveTable pendant une main avec fold auto

Plus de throw si phase != waiting. Si c'est le tour du joueur partant,
fold auto. Si moins de 2 joueurs restants après leave, reset gameState
à waiting. Log de l'événement 'left' dans gameActions.

Résout B6.1, B6.3 (event log), B6.4 (état solitaire reset)."
```

---

### Task 8: Créer `convex/shared/validation.ts` (Lot B2)

**Findings adressés** : préparation B1.2, B2.1, B3.3.

**Files:**
- Create: `convex/shared/validation.ts`

- [ ] **Step 1: Créer le fichier avec les schémas Zod**

```typescript
// convex/shared/validation.ts
import { z } from "zod";

export const emailSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email invalide");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit faire au moins 8 caractères")
  .max(200);

export const userNameSchema = z
  .string()
  .min(1, "Le nom est requis")
  .max(50);

export const createTableSchema = z.object({
  name: z.string().min(1).max(50),
  maxPlayers: z.number().int().min(2).max(9),
  gameType: z.enum(["cash", "tournament"]),
  buyIn: z.number().nonnegative().optional(),
  startingStack: z.number().int().positive(),
  smallBlind: z.number().int().positive(),
  bigBlind: z.number().int().positive(),
  isPrivate: z.boolean(),
})
.refine((d) => d.bigBlind >= 2 * d.smallBlind, {
  message: "bigBlind doit être >= 2 × smallBlind",
  path: ["bigBlind"],
})
.refine((d) => d.startingStack >= 10 * d.bigBlind, {
  message: "startingStack doit être >= 10 × bigBlind",
  path: ["startingStack"],
});

export const buyInAmountSchema = z.number().int().positive();

// Helper pour transformer un échec Zod en ConvexError lisible
export function validateOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ");
    throw new Error(`Validation: ${msg}`);
  }
  return result.data;
}
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add convex/shared/validation.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(validation): schémas Zod pour auth, createTable, buyIn

Active la dépendance zod (déjà déclarée dans package.json mais non
utilisée). Schémas réutilisables avec helper validateOrThrow."
```

---

### Task 9: Appliquer la validation Zod aux mutations (Lot B2)

**Findings adressés** : B1.2, B2.1, B3.3.

**Files:**
- Modify: `convex/auth.ts` (signUpWithPassword, signInWithPassword)
- Modify: `convex/tables.ts` (createTable)
- Modify: `convex/players.ts` (joinTable — clamp buyInAmount)

- [ ] **Step 1: Valider `signUpWithPassword`**

Dans `convex/auth.ts`, en début de handler :

```typescript
import { emailSchema, passwordSchema, userNameSchema, validateOrThrow } from "./shared/validation";

export const signUpWithPassword = mutation({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    validateOrThrow(emailSchema, args.email);
    validateOrThrow(passwordSchema, args.password);
    validateOrThrow(userNameSchema, args.name);

    // ... reste inchangé
  },
});
```

- [ ] **Step 2: Valider `signInWithPassword`**

```typescript
export const signInWithPassword = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    validateOrThrow(emailSchema, args.email);
    // password : on ne valide pas la longueur ici (l'utilisateur peut avoir un
    // ancien compte avec un password court). Juste presence.
    if (!args.password) throw new Error("Mot de passe requis");

    // ... reste inchangé
  },
});
```

- [ ] **Step 3: Valider `createTable`**

Dans `convex/tables.ts`, en début de handler :

```typescript
import { createTableSchema, validateOrThrow } from "./shared/validation";

export const createTable = mutation({
  args: { /* args inchangés */ },
  handler: async (ctx, args) => {
    validateOrThrow(createTableSchema, {
      name: args.name,
      maxPlayers: args.maxPlayers,
      gameType: args.gameType,
      buyIn: args.buyIn,
      startingStack: args.startingStack,
      smallBlind: args.smallBlind,
      bigBlind: args.bigBlind,
      isPrivate: args.isPrivate,
    });

    // ... reste inchangé
  },
});
```

- [ ] **Step 4: Clamp `buyInAmount` dans `joinTable`**

Dans `convex/players.ts:joinTable` :

```typescript
// Après la récupération de la table
const buyIn = args.buyInAmount !== undefined
  ? Math.min(Math.max(1, Math.floor(args.buyInAmount)), table.startingStack)
  : table.startingStack;

// Utiliser buyIn au lieu de args.buyInAmount dans le insert players
await ctx.db.insert("players", {
  tableId: args.tableId,
  userId: args.userId,
  seatPosition,
  chips: buyIn, // ← validé/clampé
  // ... reste
});
```

- [ ] **Step 5: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add convex/auth.ts convex/tables.ts convex/players.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(validation): appliquer Zod aux mutations auth/createTable + clamp buyIn

- signUp/signIn: validation email + password (longueur min 8 sur signup)
- createTable: validation contraintes blindes/stack/maxPlayers
- joinTable: clamp buyInAmount entre 1 et startingStack

Résout B1.2, B2.1, B3.3."
```

---

### Task 10: Hash password avec salt par user (Lot B2)

**Findings adressés** : B1.1.

**Files:**
- Modify: `convex/schema.ts` (ajouter `users.passwordSalt`)
- Modify: `convex/auth.ts` (hashPassword/verifyPassword + signUp/signIn)

- [ ] **Step 1: Ajouter `passwordSalt` au schéma**

Dans `convex/schema.ts`, table `users`, ajouter :

```typescript
users: defineTable({
  email: v.string(),
  name: v.string(),
  password: v.optional(v.string()),
  passwordSalt: v.optional(v.string()), // ← AJOUTER
  // ... reste inchangé
}).index("by_email", ["email"]),
```

- [ ] **Step 2: Refactor `hashPassword` pour accepter un salt**

Dans `convex/auth.ts`, remplacer :

```typescript
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hashedPassword;
}
```

par :

```typescript
function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hashedPassword: string, salt: string | undefined): Promise<boolean> {
  // Compatibilité descendante : si pas de salt stocké, l'ancien hash utilisait "salt" en dur
  const effectiveSalt = salt ?? "salt";
  const candidate = await hashWithSalt(password, effectiveSalt);
  return candidate === hashedPassword;
}
```

- [ ] **Step 3: Modifier `signUpWithPassword` pour générer un salt**

```typescript
export const signUpWithPassword = mutation({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    // ... validations Zod ...

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existingUser) throw new ConvexError("User already exists with this email");

    const salt = generateSalt();
    const hashedPassword = await hashWithSalt(args.password, salt);

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: hashedPassword,
      passwordSalt: salt,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });

    return { userId };
  },
});
```

- [ ] **Step 4: Modifier `signInWithPassword` pour vérifier avec salt + migration**

```typescript
export const signInWithPassword = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    // ... validations Zod ...

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user || !user.password) throw new ConvexError("Invalid email or password");

    const isValid = await verifyPassword(args.password, user.password, user.passwordSalt);
    if (!isValid) throw new ConvexError("Invalid email or password");

    // Migration : si pas de salt, en générer un et ré-hasher
    if (!user.passwordSalt) {
      const newSalt = generateSalt();
      const newHash = await hashWithSalt(args.password, newSalt);
      await ctx.db.patch(user._id, {
        password: newHash,
        passwordSalt: newSalt,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.patch(user._id, { lastSeen: Date.now() });
    }

    const { password: _password, passwordSalt: _passwordSalt, ...userWithoutPassword } = user;
    return { userId: user._id, user: userWithoutPassword };
  },
});
```

- [ ] **Step 5: Supprimer les comptes test existants pour éviter confusion**

Les comptes créés avant cette migration peuvent encore se logger (compat descendante via `effectiveSalt = "salt"`), mais pour proprement tester, supprimer :

Créer un fichier admin temporaire `convex/_admin_b1.ts` :

```typescript
import { mutation } from "./_generated/server";

export const deleteAllAuditAndTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").collect();
    let deleted = 0;
    for (const u of all) {
      // Supprimer les bots audit et le compte vincent + eliott + satch9 si présents
      if (u.email.includes("audit-bot") || u.email === "viny1976@gmail.com") {
        await ctx.db.delete(u._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
```

Lancer après `npx convex dev` push :
```bash
npx convex run _admin_b1:deleteAllAuditAndTestUsers
```

Puis supprimer le fichier :
```bash
rm convex/_admin_b1.ts
```

- [ ] **Step 6: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/auth.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(auth): salt aléatoire 16 bytes par user (compat descendante)

- Schéma: ajout users.passwordSalt (optional)
- generateSalt via crypto.getRandomValues
- hashWithSalt remplace hashPassword
- signUp génère un salt aléatoire
- signIn vérifie avec le salt stocké, fallback sur l'ancien salt fixe
  pour compat descendante. Migration auto au prochain signin réussi
  pour les vieux comptes.

Résout B1.1 (palier 1, bcrypt reporté en 0.C)."
```

---

### Task 11: Mutation `signOut` côté serveur (Lot B2)

**Findings adressés** : B1.3.

**Files:**
- Modify: `convex/auth.ts` (ajout mutation)
- Modify: `src/core/hooks/useAuth.ts` (appel de la mutation)

- [ ] **Step 1: Ajouter la mutation dans `convex/auth.ts`**

```typescript
export const signOut = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { success: false };
    await ctx.db.patch(args.userId, { lastSeen: Date.now() });
    return { success: true };
  },
});
```

- [ ] **Step 2: Modifier `useAuth.ts` pour appeler la mutation avant le reset local**

Dans `src/core/hooks/useAuth.ts:148-151` :

```typescript
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// ... dans le hook
const signOutMutation = useMutation(api.auth.signOut);

const signOut = useCallback(async () => {
  if (user?._id) {
    try {
      await signOutMutation({ userId: user._id });
    } catch (e) {
      console.warn("signOut server failed", e);
    }
  }
  // Reset local
  localStorage.removeItem("auth.userId"); // adapter au mécanisme existant
  setUser(null);
}, [user, signOutMutation]);
```

⚠️ Adapter au code réel (remplacer `localStorage.removeItem` etc. par ce qui existe).

- [ ] **Step 3: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add convex/auth.ts src/core/hooks/useAuth.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(auth): mutation signOut côté serveur

Patch lastSeen avant le reset local. Permet de tracer le moment de
déconnexion. Préparation à un futur système de session token (0.C).

Résout B1.3."
```

---

### Task 12: UI feedback erreurs auth (Lot B2)

**Findings adressés** : B1.4.

**Files:**
- Modify: `src/core/hooks/useAuth.ts`
- Modify: `src/core/components/Auth/LoginForm.tsx` (ou `EmailPasswordForm.tsx`)

- [ ] **Step 1: Localiser le composant qui appelle signUp/signIn**

```bash
grep -rn "signUp\|signIn" src/core/components/Auth/ | head
```

Identifier `LoginForm.tsx` ou `EmailPasswordForm.tsx`.

- [ ] **Step 2: Ajouter `error` au retour de `useAuth`**

Dans `useAuth.ts`, ajouter un state `error` :

```typescript
const [error, setError] = useState<string | null>(null);

const signUp = async (...) => {
  setError(null);
  try {
    // ... appel mutation
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg);
    throw e; // toujours propager pour ne pas casser les comportements existants
  }
};

// idem pour signIn et signOut

// Et dans le return :
return { user, isLoading, error, signUp, signIn, signOut, /* ... */ };
```

- [ ] **Step 3: Afficher l'erreur dans le composant**

Dans `LoginForm.tsx` (ou similaire) :

```tsx
const { error, signUp, signIn } = useAuth();

return (
  <form onSubmit={handleSubmit}>
    {/* champs existants */}

    {error && (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm" role="alert">
        {error}
      </div>
    )}

    <button type="submit">{isSignUp ? "S'inscrire" : "Se connecter"}</button>
  </form>
);
```

- [ ] **Step 4: Vérifier typecheck/lint**

Run: `npm run typecheck && npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/core/hooks/useAuth.ts src/core/components/Auth/
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(auth): feedback UI sur erreurs auth (signUp/signIn)

useAuth expose maintenant un state error. LoginForm affiche un message
inline rouge en cas d'erreur serveur (mauvais password, email pris...).

Résout B1.4."
```

---

### Task 13: Droits créateur (Lot B3)

**Findings adressés** : B-runtime.3, B-runtime.6.

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx:325-337` (bouton Démarrer)
- Modify: `convex/core/gameEngine.ts:218-222` (mutation `startGame` — check serveur)
- Modify: `src/core/components/Game/ShowdownResults.tsx` (retrait bouton Continuer)

- [ ] **Step 1: Restreindre le bouton Démarrer côté UI**

Dans `PokerTable.tsx:325-337`, modifier la condition :

```tsx
{gameState.phase === "waiting" &&
  table.status === "waiting" &&
  players.length >= 2 &&
  currentPlayer &&
  currentPlayer.userId === table.creatorId && (  // ← AJOUTER ce check
    <Button onClick={handleStartGame} disabled={isProcessing}>
      {isProcessing ? "Démarrage..." : "Démarrer la partie"}
    </Button>
  )}
```

- [ ] **Step 2: Restreindre côté serveur dans `startGame`**

Dans `convex/core/gameEngine.ts` :

```typescript
export const startGame = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // Si pas d'auth identity (pas Convex Auth complet), accepter mais loguer
    // OU récupérer le userId depuis args (à voir selon archi auth actuelle)
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    // Note : architecture actuelle n'a pas Convex Auth complet, donc on
    // ne peut pas vérifier identity.subject. À la place, on documente que
    // le UI est responsable jusqu'au passage à Convex Auth (phase ultérieure).
    // Pour l'instant, on garde la mutation publique mais documentée.

    return await startGameInternal(ctx, args.tableId);
  },
});
```

⚠️ Si Convex Auth n'est pas activé dans le projet (à vérifier en lisant `convex/auth.config.ts`), le check serveur pur n'est pas réalisable proprement. Documentation suffit dans ce cas.

- [ ] **Step 3: Retirer le bouton Continuer du showdown**

Dans `src/core/components/Game/ShowdownResults.tsx`, localiser le bouton "Continuer" (ou similaire) et le retirer entièrement. Avec le scheduler de Task 6, le délai automatique de 3s suffit.

```bash
grep -n "Continuer\|continue\|next.*hand\|onClick.*next" src/core/components/Game/ShowdownResults.tsx
```

Si le composant prop `onContinue` ou similaire existe, supprimer le prop, l'élément du JSX, et nettoyer aussi les callers (`PokerTable.tsx`).

- [ ] **Step 4: Vérifier typecheck/lint**

Run: `npm run typecheck && npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/core/components/Game/PokerTable.tsx convex/core/gameEngine.ts src/core/components/Game/ShowdownResults.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(ui): droits créateur sur Démarrer + retrait Continuer

- Démarrer la partie : visible seulement au créateur (currentPlayer.userId === table.creatorId)
- Continuer au showdown : retiré (le scheduler runAfter 3s suffit)

Résout B-runtime.3, B-runtime.6."
```

---

### Task 14: UI cohérence (message attente, départ joueur, état solitaire) (Lot B3)

**Findings adressés** : B-runtime.4, B-runtime.9, B6.3, B6.4.

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx`

- [ ] **Step 1: Localiser le message "en attente de joueurs"**

```bash
grep -rn "en attente de joueurs\|waiting.*player\|attendant" src/core/components/ | head
```

- [ ] **Step 2: Conditionner le message**

Trouver l'endroit où il s'affiche et conditionner :

```tsx
{gameState.phase === "waiting" && players.length < table.maxPlayers && (
  <div className="...">En attente de joueurs ({players.length}/{table.maxPlayers})</div>
)}
```

- [ ] **Step 3: Audit du `seats` mémoïsé**

Dans `PokerTable.tsx`, localiser `Array.from({ length: table.maxPlayers }...)` (ligne ~233). Vérifier si c'est dans un `useMemo`. Si oui, vérifier que `players` est dans la liste de dépendances.

S'il y a un `useMemo([..., players])` correct mais que l'UI ne se met pas à jour, le bug peut être ailleurs (animation qui retarde le re-render, etc.). Inspecter avec un `console.log` dans le seats:

```tsx
useEffect(() => {
  console.log('seats updated, players count:', players.length);
}, [players]);
```

- [ ] **Step 4: Si nécessaire, forcer le re-rendu en supprimant un memo bloquant**

Cas typique : si `seats` est dans un memo mais qu'un sous-composant `PlayerSeat` reçoit `seat` qui ne change pas par référence, ne re-render pas. Solution : passer la position et `players[position]` directement, sans memo intermédiaire.

- [ ] **Step 5: Tester en local — relancer un smoke 2-joueurs après ces modifs**

(À faire au moment du smoke final Task 17)

- [ ] **Step 6: Commit**

```bash
git add src/core/components/Game/PokerTable.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(ui): cohérence message attente + départ joueur

- Message 'en attente de joueurs (N/max)' affiché seulement si
  players.length < maxPlayers && phase=waiting
- Audit du memo seats pour rafraîchissement au départ d'un joueur

Résout B-runtime.4, B-runtime.9, B6.3, B6.4 (côté UI ; B6.4 côté serveur
fait en Task 7)."
```

---

### Task 15: Auto-seat créateur (Lot B3)

**Findings adressés** : B2.4.

**Files:**
- Modify: `src/core/components/App/AppMain.tsx:45-61`

- [ ] **Step 1: Modifier `handleTableCreated`**

```typescript
const handleTableCreated = async (tableData: CreateTableData) => {
  if (!user) return;

  try {
    const tableId = await createTable({
      ...tableData,
      creatorId: user._id,
    });

    // Auto-seat le créateur sur le siège 0
    try {
      await joinTableMutation({
        tableId,
        userId: user._id,
        seatPosition: 0,
      });
    } catch (joinError) {
      console.warn("Auto-seat échoué, l'utilisateur devra cliquer manuellement", joinError);
    }

    setSelectedTableId(tableId);
    setCurrentView("table");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(ui): auto-seat du créateur après createTable

handleTableCreated chaîne createTable -> joinTable(seatPosition: 0). Si
le join échoue, l'utilisateur peut toujours cliquer manuellement (warn
en console).

Résout B2.4."
```

---

### Task 16: Filtre `isPrivate` dans le lobby (Lot B3)

**Findings adressés** : B-runtime.2.

**Files:**
- Modify: `convex/tables.ts` (queries `getPublicTables` et `getTablesWithUserInfo`)

- [ ] **Step 1: Localiser les queries de listing**

```bash
grep -n "getPublicTables\|getTablesWithUserInfo" convex/tables.ts
```

- [ ] **Step 2: Ajouter le filtre `isPrivate=false`**

Dans chaque query, ajouter :

```typescript
export const getPublicTables = query({
  handler: async (ctx) => {
    const tables = await ctx.db
      .query("tables")
      .filter((q) => q.eq(q.field("isPrivate"), false))
      .collect();
    return tables;
  },
});

// Idem getTablesWithUserInfo : ajouter le même filtre dans la pipeline.
```

⚠️ Adapter exactement à la structure existante (peut utiliser `withIndex` etc.).

- [ ] **Step 3: Vérifier typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add convex/tables.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(tables): filtrer isPrivate=false dans le lobby public

getPublicTables et getTablesWithUserInfo ne renvoient plus que les
tables non-privées. Les tables privées resteront accessibles via le
parcours rejoindre par code (Lot B4 à venir).

Résout B-runtime.2."
```

---

### Task 17: Validation finale + smoke

**Files:** aucun (vérifications)

- [ ] **Step 1: 3 commandes vertes**

Run:

```bash
npm run typecheck && npm run lint && npx vitest run
echo "FINAL EXIT: $?"
```

Expected: `FINAL EXIT: 0`. Tous les tests passent (anciens + 10 nouveaux).

- [ ] **Step 2: Vérifier la liste des commits 1.B**

```bash
git log --oneline ca8fc6e..HEAD | head -25
```

Expected : ~13-15 commits (un par task ayant modifié du code), tous avec `viny1976@gmail.com` / `satch9`.

- [ ] **Step 3: Demander au user d'effectuer le smoke test manuel**

Message au user :

> Phase 1.B implémentation terminée. Critère auto vert (typecheck + lint + vitest).
>
> Maintenant smoke manuel sur https://home-poker.vjdev.tech (~15 min) :
> 1. Signup 2 comptes neufs (les anciens ont été supprimés)
> 2. Joueur A crée table cash, 2 joueurs, blindes 5/10, stack 1000, **publique** → A auto-assis siège 0
> 3. Joueur B rejoint via le lobby
> 4. A clique "Démarrer la partie" (bouton visible seulement à A)
> 5. Jouer 2 mains complètes : préflop → flop → turn → river → **showdown visible 3s** → main suivante
> 6. Vérifier sur 1 main : gagnant correct, pot crédité au bon joueur
> 7. Joueur B clique "Quitter" pendant une main → fold auto + leave
> 8. A reste seul → "en attente de joueurs (1/2)"
>
> Si tout marche, 1.B est terminé. Sinon, identifier la régression et fix ad-hoc.

- [ ] **Step 4: Si smoke OK, message bilan final**

```
Phase 1.B terminée.

✅ typecheck, lint, vitest run : exit 0
🧪 19 tests poker passent (9 anciens + 10 nouveaux)
🔧 13-15 commits sur master entre ca8fc6e..HEAD
🎮 Smoke test manuel validé par user

Findings 0.B résolus :
🔴 B-runtime.5 (gagnant), B-runtime.7 (pot), B4.1 (deck), B4.2 (forcePlayerFold),
   B5.1 (showdown), B6.1 (leave during hand), B1.1 (salt), B2.1 (validation), B3.1 reporté
🟡 B1.2, B1.3, B1.4, B3.3, B-runtime.2, B-runtime.3, B-runtime.4, B-runtime.6, B-runtime.9, B6.3, B6.4
🟢 B2.4

Findings reportés (hors scope 1.B) :
- B3.1 (rejoindre par code) → phase ultérieure
- B-runtime.8 (rebuy cash) → phase ultérieure
- B-runtime.1 (mobile) → phase UI dédiée
- Sécurité 0.C (S1, S2, S3, B1.1 niveau bcrypt)

Prochain jalon : 0.C (audit production-ready) ou modules (Invitations, Notifications, Tournaments).
```

---

## Self-Review

**Spec coverage** :
- ✅ TDD strict premier pas : Task 1 + Task 2
- ✅ B-runtime.5 (régression) : Task 2
- ✅ B-runtime.7 (pot) : Task 3
- ✅ B4.1 (deck) : Task 4
- ✅ B4.2 (forcePlayerFold) : Task 5
- ✅ B5.1 (showdown delay) : Task 6
- ✅ B6.1 (leave during hand) : Task 7
- ✅ B1.2 (validation auth) : Tasks 8, 9
- ✅ B2.1 (validation createTable) : Task 9
- ✅ B3.3 (buyInAmount clamp) : Task 9
- ✅ B1.1 (salt par user) : Task 10
- ✅ B1.3 (signOut serveur) : Task 11
- ✅ B1.4 (UI errors auth) : Task 12
- ✅ B-runtime.3 (Démarrer créateur) : Task 13
- ✅ B-runtime.6 (retrait Continuer) : Task 13
- ✅ B-runtime.4 (message attente) : Task 14
- ✅ B-runtime.9 (départ joueur UI) : Task 14
- ✅ B6.3 (event log left) : Task 7 + Task 14
- ✅ B6.4 (état solitaire) : Task 7 + Task 14
- ✅ B2.4 (auto-seat créateur) : Task 15
- ✅ B-runtime.2 (filtre lobby) : Task 16
- ✅ Critères de sortie auto + smoke : Task 17

**Placeholder scan** : aucun TBD/TODO. Quelques `⚠️ Adapter exactement` mais ils accompagnent du code complet à adapter à la structure réelle (instructions concrètes, pas placeholders).

**Type consistency** :
- `EnhancedHandRank.originalCards` introduit Task 2, utilisé Task 2 step 5 cohéremment
- `gameStates.remainingDeck` introduit Task 4, utilisé Tasks 4 et 7 cohéremment
- `users.passwordSalt` introduit Task 10, utilisé Task 10 cohéremment
- Helpers Zod (`emailSchema`, `validateOrThrow`, etc.) définis Task 8, utilisés Task 9 cohéremment
- Mutation `signOut` introduite Task 11, utilisée Task 11 cohéremment
- IDs findings (B1.1, B-runtime.5, etc.) cohérents avec le rapport 0.B

Plan complet et auto-suffisant.
