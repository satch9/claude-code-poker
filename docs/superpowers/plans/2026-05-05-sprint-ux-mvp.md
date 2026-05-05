# Sprint UX MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'app jouable en famille — rebuy cash, code d'invitation, mobile portrait.

**Architecture:** 10 tasks séquentielles. Ordre risque-croissant : Rebuy backend+UI (Tasks 1-3), Join code backend+UI (Tasks 4-6), Mobile responsive heads-up (Tasks 7-9), validation finale (Task 10).

**Tech Stack:** Convex 1.15, React 18, TypeScript 5.2, Tailwind 3, Zod, vitest 3.

**Spec source:** `docs/superpowers/specs/2026-05-05-sprint-ux-mvp-design.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure

| Fichier | Action |
|---|---|
| `convex/players.ts` | Modifier — ajout mutation `rebuy` (Task 1) |
| `convex/shared/validation.ts` | Modifier — ajout schéma `rebuySchema` (Task 1) |
| `convex/tables.ts` | Modifier — toujours générer `inviteCode` (Task 4) + ajout query `getTableByInviteCode` (Task 5) |
| `src/core/components/Game/RebuyDialog.tsx` | Create — modale rebuy (Task 2) |
| `src/core/components/Game/PokerTable.tsx` | Modifier — bouton Recharger + RebuyDialog + responsive mobile (Tasks 3, 8) |
| `src/core/components/Lobby/JoinByCodeForm.tsx` | Create — formulaire saisie code (Task 6) |
| `src/core/components/Lobby/Lobby.tsx` | Modifier — intégrer JoinByCodeForm (Task 6) |
| `src/core/hooks/useResponsiveClasses.ts` | Modifier — classes mobile portrait (Task 8) |

---

### Task 1: Mutation `rebuy` (Lot Rebuy)

**Findings adressés** : B-runtime.8 (backend).

**Files:**
- Modify: `convex/shared/validation.ts`
- Modify: `convex/players.ts`

- [ ] **Step 1: Ajouter le schéma Zod**

Ajouter dans `convex/shared/validation.ts`, juste après `buyInAmountSchema` :

```typescript
export const rebuyAmountSchema = z.number().int().positive();
```

- [ ] **Step 2: Ajouter la mutation dans `convex/players.ts`**

À la fin du fichier (après `getActivePlayers` ou similaire), ajouter :

```typescript
import { rebuyAmountSchema, validateOrThrow } from "./shared/validation";

export const rebuy = mutation({
  args: {
    tableId: v.id("tables"),
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    validateOrThrow(rebuyAmountSchema, args.amount);

    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    if (table.gameType !== "cash") {
      throw new Error("Rebuy n'est disponible qu'en cash game");
    }

    if (args.amount > table.startingStack) {
      throw new Error(`Le montant ne peut pas dépasser ${table.startingStack}`);
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!player) throw new Error("Joueur non trouvé à la table");

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .first();

    const phase = gameState?.phase ?? "waiting";
    const allowedBetweenHands = phase === "waiting" || phase === "showdown";
    const allowedAsFolded = player.isFolded === true;

    if (!allowedBetweenHands && !allowedAsFolded) {
      throw new Error("Recharge possible seulement entre les mains");
    }

    // Décision spec: remplace le stack (pas additif)
    await ctx.db.patch(player._id, { chips: args.amount });

    // Log dans le feed
    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("gameActions", {
      tableId: args.tableId,
      playerId: player._id,
      playerName: user?.name ?? "Joueur",
      action: "rebuy",
      amount: args.amount,
      message: `${user?.name ?? "Joueur"} se recave pour ${args.amount} jetons`,
      isSystem: true,
      timestamp: Date.now(),
    });

    return { success: true, chips: args.amount };
  },
});
```

- [ ] **Step 3: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add convex/shared/validation.ts convex/players.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(players): mutation rebuy pour cash game

Permet à un joueur de recharger sa stack entre 2 mains en cash game.
Validation Zod du montant, check gameType=cash, check phase autorisée
(waiting/showdown ou joueur folded). Remplace le stack (pas additif)
selon la décision du spec.

Résout B-runtime.8 backend."
```

---

### Task 2: Composant `RebuyDialog` (Lot Rebuy)

**Files:**
- Create: `src/core/components/Game/RebuyDialog.tsx`

- [ ] **Step 1: Créer le fichier**

```tsx
import React, { useState } from "react";
import { Button } from "../UI/Button";
import { cn } from "@/shared/utils/cn";

interface RebuyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
  startingStack: number;
  currentChips: number;
}

export const RebuyDialog: React.FC<RebuyDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  startingStack,
  currentChips,
}) => {
  const [amount, setAmount] = useState(startingStack);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError(null);
    if (amount <= 0 || amount > startingStack) {
      setError(`Montant entre 1 et ${startingStack}`);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(amount);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Recharger des jetons</h2>
        <p className="text-sm text-gray-600 mb-4">
          Stack actuelle : {currentChips} jetons. Choisis le montant à recharger
          (max {startingStack}).
        </p>

        <input
          type="number"
          min={1}
          max={startingStack}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-poker-green-500"
        />

        <input
          type="range"
          min={1}
          max={startingStack}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          className="w-full mb-4"
        />

        {error && (
          <div className={cn(
            "mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
          )}>
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "..." : `Recharger ${amount}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0. Si import `Button` fail, vérifier le path exact dans `src/core/components/UI/Button.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/core/components/Game/RebuyDialog.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(ui): composant RebuyDialog pour recharger en cash game

Modale simple avec input numérique + slider. Validation côté UI,
erreur affichée inline. Le parent gère l'appel à la mutation."
```

---

### Task 3: Bouton "Recharger" dans PokerTable

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx`

- [ ] **Step 1: Ajouter l'import et le hook**

En haut de `PokerTable.tsx`, après les imports existants :

```tsx
import { RebuyDialog } from "./RebuyDialog";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
```

(Vérifier que `useMutation`/`api`/`useAuth` ne sont pas déjà importés ; si oui, ne pas les ré-importer.)

Dans le composant `PokerTable`, après les autres `useState`, ajouter :

```tsx
const [showRebuyDialog, setShowRebuyDialog] = useState(false);
const rebuyMutation = useMutation(api.players.rebuy);
const { user: authUser } = useAuth();
```

- [ ] **Step 2: Ajouter la condition d'affichage du bouton**

Dans le JSX, après le bouton "Quitter la table" (ligne 339 et/ou 743), ajouter :

```tsx
{table.gameType === "cash" &&
  currentPlayer &&
  currentPlayer.chips < table.bigBlind &&
  (gameState.phase === "waiting" || gameState.phase === "showdown" || currentPlayer.isFolded) && (
    <Button variant="primary" onClick={() => setShowRebuyDialog(true)}>
      Recharger
    </Button>
  )}
```

- [ ] **Step 3: Ajouter la modale en fin de JSX**

Juste avant la fermeture du composant principal `PokerTable` (avant `);` final), ajouter :

```tsx
{showRebuyDialog && currentPlayer && authUser && (
  <RebuyDialog
    isOpen={showRebuyDialog}
    onClose={() => setShowRebuyDialog(false)}
    startingStack={table.startingStack}
    currentChips={currentPlayer.chips}
    onConfirm={async (amount) => {
      await rebuyMutation({
        tableId: table._id,
        userId: authUser._id,
        amount,
      });
    }}
  />
)}
```

- [ ] **Step 4: Vérifier typecheck**

Run: `npm run typecheck && npm run lint`
Expected: exit 0 sur les deux.

- [ ] **Step 5: Commit**

```bash
git add src/core/components/Game/PokerTable.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(ui): bouton Recharger dans PokerTable

Visible uniquement quand:
- gameType === cash
- joueur a < bigBlind jetons (peut plus payer la BB)
- phase ∈ waiting/showdown OU joueur folded

Au clic: ouvre RebuyDialog qui appelle la mutation rebuy.

Résout B-runtime.8 frontend."
```

---

### Task 4: Toujours générer `inviteCode` dans createTable

**Findings adressés** : B2.3 (latent depuis 1.B).

**Files:**
- Modify: `convex/tables.ts`

- [ ] **Step 1: Modifier la génération du code**

Lire `convex/tables.ts` autour de la ligne 30 :

```typescript
let inviteCode: string | undefined;

if (args.isPrivate) {
  // Generate a 6-character invite code
  inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

Remplacer par (génération inconditionnelle) :

```typescript
// Génération inconditionnelle d'un code (6 chars A-Z0-9) pour permettre
// le partage par code même pour les tables publiques.
const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0. Si erreur sur `inviteCode` undefined, c'est que la variable est utilisée ailleurs avec ce typing — vérifier.

- [ ] **Step 3: Commit**

```bash
git add convex/tables.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(tables): toujours générer inviteCode (publique + privée)

Le code permet le partage par lien/saisie même pour les tables
publiques. Conforme à la décision B2.3 du spec 1.B (la modif n'avait
pas été appliquée).

Pré-requis pour le parcours rejoindre par code."
```

---

### Task 5: Query `getTableByInviteCode`

**Findings adressés** : B3.1 (backend).

**Files:**
- Modify: `convex/tables.ts`

- [ ] **Step 1: Ajouter la query**

À la fin de `convex/tables.ts`, ajouter :

```typescript
export const getTableByInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.toUpperCase().trim();
    if (code.length !== 6) return null;

    const table = await ctx.db
      .query("tables")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();

    if (!table) return null;

    // Compter les joueurs pour donner du contexte au frontend
    const players = await ctx.db
      .query("players")
      .withIndex("by_table", (q) => q.eq("tableId", table._id))
      .collect();

    return {
      _id: table._id,
      name: table.name,
      status: table.status,
      maxPlayers: table.maxPlayers,
      gameType: table.gameType,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      currentPlayers: players.length,
    };
  },
});
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add convex/tables.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(tables): query getTableByInviteCode

Lookup d'une table par son inviteCode (6 chars uppercase). Retourne
les infos publiques de la table + nombre de joueurs actuels, ou null
si introuvable.

Backend pour B3.1 (rejoindre par code)."
```

---

### Task 6: Composant `JoinByCodeForm` + intégration Lobby

**Findings adressés** : B3.1 (frontend).

**Files:**
- Create: `src/core/components/Lobby/JoinByCodeForm.tsx`
- Modify: `src/core/components/Lobby/Lobby.tsx`

- [ ] **Step 1: Créer `JoinByCodeForm.tsx`**

```tsx
import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "../UI/Button";
import { Id } from "../../../../convex/_generated/dataModel";

interface JoinByCodeFormProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

export const JoinByCodeForm: React.FC<JoinByCodeFormProps> = ({ onJoinTable }) => {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const ready = sanitized.length === 6;

  // Lookup table par code seulement quand le code est complet et que l'user a soumis
  const table = useQuery(
    api.tables.getTableByInviteCode,
    ready && submitted ? { code: sanitized } : "skip"
  );

  // Quand la query revient OK, on déclenche le join automatiquement
  React.useEffect(() => {
    if (submitted && table === null) {
      // Code valide format mais pas trouvé en DB
      // (la query retourne null pour "non trouvé")
    }
    if (submitted && table && table._id) {
      onJoinTable(table._id);
      setSubmitted(false);
      setCode("");
    }
  }, [submitted, table, onJoinTable]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) setSubmitted(true);
  };

  const showNotFound = submitted && table === null;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-2">
        Rejoindre par code
      </h3>
      <div className="flex gap-2 items-stretch">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABC123"
          value={sanitized}
          onChange={(e) => {
            setCode(e.target.value);
            setSubmitted(false);
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg uppercase tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-poker-green-500"
          maxLength={6}
        />
        <Button type="submit" variant="primary" disabled={!ready}>
          Rejoindre
        </Button>
      </div>
      {showNotFound && (
        <div className="mt-2 text-sm text-red-700">
          Code invalide ou table introuvable.
        </div>
      )}
    </form>
  );
};
```

- [ ] **Step 2: Intégrer dans `Lobby.tsx`**

Modifier `src/core/components/Lobby/Lobby.tsx` :

Ajouter l'import :
```tsx
import { JoinByCodeForm } from "./JoinByCodeForm";
```

Modifier le `<main>` pour insérer le formulaire avant `<TableList>` :

```tsx
<main className="container mx-auto px-4 py-8">
  <div className="max-w-5xl mx-auto">
    <JoinByCodeForm onJoinTable={onJoinTable} />
    <TableList
      tables={tables || []}
      onJoinTable={onJoinTable}
      onCreateTable={onCreateTable}
      loading={loading}
    />
  </div>
</main>
```

- [ ] **Step 3: Vérifier typecheck/lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/core/components/Lobby/JoinByCodeForm.tsx src/core/components/Lobby/Lobby.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(ui): JoinByCodeForm dans le lobby

Formulaire de saisie du code à 6 chars (uppercase auto, sanitize
[A-Z0-9]). Lookup via getTableByInviteCode au submit. Sur succès,
déclenche onJoinTable. Affiche erreur si code introuvable.

Résout B3.1 frontend."
```

---

### Task 7: Diagnostic mobile

**Files:** aucun (lecture seule)

- [ ] **Step 1: Lire les hooks responsive**

```bash
cat src/core/hooks/useResponsiveClasses.ts
cat src/core/hooks/useBreakpoint.ts
cat src/core/hooks/useResponsiveClasses.ts | head -80
```

Identifier comment `pokerTableContainer`, `pokerTableFelt`, `tableContainer` sont définis pour mobile vs desktop.

- [ ] **Step 2: Lire les classes mobile dans PokerTable.tsx**

```bash
grep -n "isMobile\|isIOS\|sm:\|md:\|lg:" src/core/components/Game/PokerTable.tsx | head -25
```

Noter les blocs conditionnels mobile.

- [ ] **Step 3: Confirmer la structure du layout actuel**

Lire `src/core/components/Game/PokerTable.tsx` lignes 308-400 environ pour comprendre la hiérarchie : container → main flex → sidebar + center → table felt → seats absolus.

- [ ] **Step 4: Identifier les problèmes**

Le finding statique B-runtime.1 + le smoke utilisateur indiquent que sur mobile portrait, "tout est collé en haut". Hypothèses probables :
- Le container utilise `min-h-screen` mais le contenu n'utilise pas de flex pour répartir verticalement
- Les seats absolus utilisent un `getSeatPosition` calculé en pixels qui ne fonctionne pas à largeurs réduites
- Pas de viewport meta correct (improbable car LandscapeWarning existe)

Noter les findings pour Task 8.

(Pas de commit ici — c'est de la lecture pour préparer Task 8.)

---

### Task 8: Layout mobile portrait heads-up

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx`
- Modify: `src/core/hooks/useResponsiveClasses.ts` (si nécessaire)

⚠️ **Risque R1 du spec** : ne pas casser le layout desktop. Toutes les modifs sont dans des conditions `isMobile` ou `<sm` Tailwind ; ne jamais toucher aux classes utilisées sans condition.

- [ ] **Step 1: Repérer les composants seats actuels**

Dans `PokerTable.tsx`, le rendu des sièges utilise `Array.from({ length: table.maxPlayers })` puis pour chaque seat, un `getSeatPosition(position, maxPlayers)` qui retourne `{ angle, x, y }` ou similaire utilisé en CSS absolute.

Confirmer la structure :

```bash
grep -n "getSeatPosition\|absolute.*seat\|seat\.\(angle\|geom\)" src/core/components/Game/PokerTable.tsx | head -10
```

- [ ] **Step 2: Ajouter un layout mobile portrait dédié pour heads-up**

Ajouter dans `PokerTable.tsx`, juste avant le `return (` final, une condition early :

```tsx
// Mobile portrait heads-up: layout vertical simplifié
if (isMobile && table.maxPlayers === 2) {
  // Détecter portrait via window.innerHeight > window.innerWidth (sécurisé en SSR)
  const isPortrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
  if (isPortrait) {
    const opponent = players.find((p) => p.userId !== currentPlayer?.userId);
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-poker-green-800 to-poker-green-900 text-white">
        <LandscapeWarning />

        {/* Header */}
        <header className="px-3 py-2 border-b border-poker-green-700 flex justify-between items-center">
          <div className="text-sm">
            <div className="font-bold truncate max-w-[160px]">{table.name}</div>
            <div className="text-xs text-poker-green-200">
              {table.smallBlind}/{table.bigBlind}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onLeaveTable}>
            Quitter
          </Button>
        </header>

        {/* Adversaire */}
        <section className="flex-1 flex flex-col items-center justify-start py-4 gap-2">
          {opponent ? (
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium">{opponent.user?.name ?? "Adversaire"}</div>
              <div className="text-xs text-poker-green-200">{opponent.chips} jetons</div>
              <div className="flex gap-1 mt-2">
                {/* Cartes hidden de l'adversaire */}
                <div className="w-12 h-16 bg-indigo-900 border border-indigo-700 rounded-lg" />
                <div className="w-12 h-16 bg-indigo-900 border border-indigo-700 rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="text-poker-green-200 text-sm">En attente d'un joueur…</div>
          )}
        </section>

        {/* Centre: pot + community cards */}
        <section className="flex flex-col items-center justify-center py-3 gap-2 border-y border-poker-green-700/50">
          <div className="text-xs text-poker-green-200">Pot</div>
          <div className="text-2xl font-bold">{gameState.pot}</div>
          <CommunityCards cards={gameState.communityCards.map(c => c) as any} />
        </section>

        {/* Joueur courant */}
        <section className="flex-1 flex flex-col items-center justify-end py-4 gap-2">
          {currentPlayer && (
            <>
              <div className="text-sm font-medium">{currentPlayer.user?.name ?? "Vous"}</div>
              <div className="text-xs text-poker-green-200">{currentPlayer.chips} jetons</div>
              {/* Cartes du joueur */}
              <div className="flex gap-1 mt-2">
                {currentPlayer.cards?.map((cardStr: string, i: number) => (
                  <div
                    key={i}
                    className="w-14 h-20 bg-white text-black border border-gray-300 rounded-lg flex items-center justify-center font-bold"
                  >
                    {cardStr}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Actions en bas */}
        <footer className="border-t border-poker-green-700 p-3">
          {gameState.phase === "waiting" &&
            players.length >= 2 &&
            currentPlayer &&
            currentPlayer.userId === table.creatorId && (
              <Button onClick={handleStartGame} variant="primary" className="w-full">
                Démarrer la partie
              </Button>
            )}

          {isMyTurn && (
            <BettingControls
              availableActions={availableActions ?? []}
              currentBet={gameState.currentBet}
              playerBet={currentPlayer?.currentBet ?? 0}
              playerChips={currentPlayer?.chips ?? 0}
              minRaise={table.bigBlind}
              bigBlind={table.bigBlind}
              onAction={handlePlayerAction}
              isProcessing={isProcessing}
            />
          )}

          {/* Bouton Recharger en mobile aussi */}
          {table.gameType === "cash" &&
            currentPlayer &&
            currentPlayer.chips < table.bigBlind &&
            (gameState.phase === "waiting" ||
              gameState.phase === "showdown" ||
              currentPlayer.isFolded) && (
              <Button
                variant="primary"
                onClick={() => setShowRebuyDialog(true)}
                className="w-full mt-2"
              >
                Recharger
              </Button>
            )}
        </footer>

        {/* Modale Rebuy partagée */}
        {showRebuyDialog && currentPlayer && authUser && (
          <RebuyDialog
            isOpen={showRebuyDialog}
            onClose={() => setShowRebuyDialog(false)}
            startingStack={table.startingStack}
            currentChips={currentPlayer.chips}
            onConfirm={async (amount) => {
              await rebuyMutation({
                tableId: table._id,
                userId: authUser._id,
                amount,
              });
            }}
          />
        )}
      </div>
    );
  }
}
```

⚠️ Adapter exactement aux signatures de `BettingControls`, `CommunityCards`, et autres composants existants. Lire leurs interfaces avant si nécessaire :

```bash
grep -n "interface.*Props" src/core/components/Game/BettingControls.tsx src/core/components/Game/CommunityCards.tsx
```

- [ ] **Step 3: Vérifier que le rendu desktop n'est pas affecté**

Run: `npm run dev` (background), ouvrir `http://localhost:5173` en desktop, vérifier que la table ressemble à avant. Tuer le dev server.

Alternative non-interactive : `npm run build` pour s'assurer que le bundle se construit.

```bash
npm run typecheck && npm run lint && npm run build 2>&1 | tail -10
```

Expected: build successful, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/core/components/Game/PokerTable.tsx src/core/hooks/useResponsiveClasses.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "fix(ui): layout mobile portrait pour heads-up

Sur mobile en mode portrait avec table 2 joueurs, on rend un layout
vertical simplifié (header / adversaire / centre pot+community /
joueur+cartes / actions en bas). Pas de tapis oval qui ne tient pas
sur l'écran.

Le layout desktop reste intact (condition isMobile && maxPlayers===2 &&
isPortrait).

Résout B-runtime.1 pour le MVP heads-up. Multi-joueurs mobile reste
hors-scope."
```

---

### Task 9: Validation visuelle mobile

**Files:** aucun (vérification)

- [ ] **Step 1: Lancer le dev server**

```bash
npm run dev 2>&1 &
```

Le serveur démarre sur localhost:5173 (ou port affiché).

- [ ] **Step 2: Ouvrir devtools mobile dans Chrome**

Instruction au user (si l'agent ne peut pas piloter le navigateur) :
1. Ouvrir `http://localhost:5173` (ou l'URL du dev server)
2. F12 → toggle device toolbar (Ctrl+Shift+M)
3. Choisir "iPhone 12 Pro"
4. Refresh
5. Login + créer table publique 2 joueurs
6. Vérifier :
   - Header visible
   - Sièges visibles (top + bottom layout)
   - Cartes lisibles
   - Pas de scroll inattendu
   - Bouton "Démarrer la partie" accessible
   - LandscapeWarning n'apparaît PAS si on est portrait + maxPlayers===2 (le layout adapté gère)
7. Toggle vers "iPhone 12 Pro" en paysage → layout desktop oval doit revenir

Si problèmes, retourner Task 8 step 2 pour ajuster les classes/structure.

- [ ] **Step 3: Tuer le dev server**

```bash
pkill -f "vite" || true
```

Pas de commit ici (vérification uniquement).

---

### Task 10: Validation finale + smoke

**Files:** aucun

- [ ] **Step 1: Vérifier les 3 commandes critiques**

```bash
npm run typecheck && npm run lint && npx vitest run
echo "FINAL EXIT: $?"
```

Expected: `FINAL EXIT: 0`. 19 tests poker passent toujours.

- [ ] **Step 2: Lister les commits du sprint**

```bash
git log --oneline 66c0044..HEAD | head -15
```

Expected : ~6-8 commits depuis le commit du spec (`66c0044`).

- [ ] **Step 3: Build final**

```bash
npm run build 2>&1 | tail -5
```

Expected: build successful. `dist/` à jour pour déploiement nginx.

- [ ] **Step 4: Demander au user le smoke manuel**

Message au user :

> Sprint UX MVP terminé. Critère auto vert. Smoke manuel sur https://home-poker.vjdev.tech (~10-15 min) :
>
> 1. Bea crée table cash, **publique**, blindes 5/10, stack 1000 → Bea voit le code d'invitation
> 2. Lena, **depuis son téléphone en portrait** : Login → utilise "Rejoindre par code" → entre le code de Bea
> 3. Lena arrive sur la table → layout mobile correct (header, adversaire, pot, ses cartes, actions)
> 4. Une main est jouée jusqu'au showdown
> 5. Lena (sur tel) ou Bea (sur PC) all-in et perd → bouton "Recharger" apparaît entre les mains → recharge 500 jetons
> 6. La main suivante démarre normalement
>
> Si tout marche, l'étape 1 est terminée. Sinon on debug.

- [ ] **Step 5: Pas de commit**

(Sauf si tu veux marquer la fin du sprint avec un commit cosmétique vide — non requis.)

---

## Self-Review

**Spec coverage** :
- ✅ Fix 1 Join code backend → Tasks 4, 5
- ✅ Fix 1 Join code frontend → Task 6
- ✅ Fix 2 Mobile → Tasks 7, 8, 9
- ✅ Fix 3 Rebuy backend → Task 1
- ✅ Fix 3 Rebuy frontend → Tasks 2, 3
- ✅ Critères de sortie auto → Task 10 step 1
- ✅ Critères de sortie smoke → Task 10 step 4
- ✅ Ordre risque-croissant respecté (Rebuy → Join code → Mobile)
- ✅ Hors-scope respecté (multi-joueurs mobile, QR code, email, rebuy tournoi)

**Placeholder scan** : aucun TBD/TODO. Toutes les commandes et code complets. Quelques `⚠️ Adapter aux signatures` accompagnés d'instructions concrètes pour vérifier.

**Type consistency** :
- `rebuy(tableId, userId, amount)` cohérent Tasks 1, 3, 8
- `getTableByInviteCode(code)` retourne `{_id, name, status, maxPlayers, ...} | null` cohérent Tasks 5, 6
- `RebuyDialog` props cohérents Tasks 2, 3, 8
- `JoinByCodeForm` props cohérents Tasks 6
- Variables d'état (`showRebuyDialog`, `rebuyMutation`, `authUser`) introduites Task 3 et réutilisées Task 8

Plan complet et auto-suffisant.
