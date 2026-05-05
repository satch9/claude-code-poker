# Module Invitations V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre au créateur d'une table de partager un lien (URL + QR) que les invités cliquent/scannent pour atterrir directement à la table sans saisie manuelle.

**Architecture:** Lien `?join=CODE` lu au montage de l'app, stocké en localStorage en attendant l'auth, déclenche un auto-join une fois l'user connecté. Modale `InviteDialog` accessible via le badge code du header de table, avec QR (`qrcode.react`), lien copiable et bouton partager natif.

**Tech Stack:** React 18, Convex 1.15, TypeScript 5.2, Tailwind 3, `qrcode.react` (~10KB).

**Spec source:** `docs/superpowers/specs/2026-05-05-module-invitations-design.md`
**Branche:** `master`
**User git:** `viny1976@gmail.com` / `satch9`

---

## File Structure

| Fichier | Action |
|---|---|
| `package.json` | Modifier — ajout `qrcode.react` (Task 1) |
| `src/core/components/Game/InviteDialog.tsx` | Create (Task 2) |
| `src/core/components/Game/PokerTable.tsx` | Modifier — badge code → ouvre InviteDialog (Task 3) |
| `src/core/hooks/usePendingJoin.ts` | Create — hook gérant le pendingJoinCode (Task 4) |
| `src/core/components/App/AppMain.tsx` | Modifier — useEffect montage + auto-join (Task 5) |

---

### Task 1: Installer `qrcode.react`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Installer la dépendance**

```bash
npm install qrcode.react
```

Expected: ajout de `qrcode.react@^4.x` dans `package.json` `dependencies`.

- [ ] **Step 2: Vérifier l'import**

```bash
node -e "console.log(Object.keys(require('qrcode.react')))" 2>&1
```

Expected: liste contenant au moins `QRCodeSVG`. Si erreur ESM/CJS, on importera via `import { QRCodeSVG } from 'qrcode.react'` (le bundle Vite gère).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "chore(deps): ajouter qrcode.react pour le module invitations"
```

---

### Task 2: Composant `InviteDialog`

**Files:**
- Create: `src/core/components/Game/InviteDialog.tsx`

- [ ] **Step 1: Créer le fichier**

```tsx
import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../UI/Button";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { cn } from "@/shared/utils/cn";

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
  isOpen,
  onClose,
  inviteCode,
}) => {
  const { isMobile } = useBreakpoint();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${baseUrl}/?join=${inviteCode}`;

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyFeedback("Lien copié !");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Échec de la copie");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleShare = async () => {
    if (!canShare) return;
    try {
      await navigator.share({
        title: "Rejoins ma table de poker !",
        text: `Code : ${inviteCode}`,
        url: inviteUrl,
      });
    } catch {
      // L'utilisateur a annulé ou erreur — silencieux
    }
  };

  const qrSize = isMobile ? 160 : 200;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Inviter des joueurs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* QR code */}
        <div className="flex justify-center mb-4 p-3 bg-white border border-gray-200 rounded-xl">
          <QRCodeSVG value={inviteUrl} size={qrSize} level="M" includeMargin={false} />
        </div>

        {/* Code lisible */}
        <div className="text-center mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Code</div>
          <div className="text-2xl font-mono font-bold tracking-widest text-gray-900">
            {inviteCode}
          </div>
        </div>

        {/* Lien + copie */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lien</div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 bg-gray-50"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title="Copier le lien"
            >
              📋
            </Button>
          </div>
          {copyFeedback && (
            <div className="text-xs text-green-600 mt-1">{copyFeedback}</div>
          )}
        </div>

        {/* Partager natif */}
        {canShare && (
          <Button variant="primary" onClick={handleShare} className="w-full">
            📲 Partager
          </Button>
        )}

        <div className={cn("text-xs text-gray-500 text-center mt-3")}>
          Donne ce lien ou ce code aux personnes que tu veux inviter.
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0. Si erreur d'import sur `QRCodeSVG`, vérifier la version installée :
```bash
node -e "const m=require('qrcode.react'); console.log(Object.keys(m))"
```
Si la version installée n'expose que `QRCode` (default export), adapter l'import : `import QRCode from "qrcode.react"` puis `<QRCode value={inviteUrl} size={qrSize} />`.

- [ ] **Step 3: Commit**

```bash
git add src/core/components/Game/InviteDialog.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(ui): composant InviteDialog avec QR + lien copiable + partage

Modale qui s'ouvre depuis le badge code de la table. Affiche le QR
(via qrcode.react), le code en gros, le lien copiable, et un bouton
'Partager' natif (Web Share API) sur les navigateurs qui le supportent.

Le lien est généré via window.location.origin + ?join=CODE."
```

---

### Task 3: Brancher le badge code → InviteDialog

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx`

- [ ] **Step 1: Importer InviteDialog**

Ajouter en haut du fichier (après les autres imports `./` du dossier Game) :

```tsx
import { InviteDialog } from "./InviteDialog";
```

- [ ] **Step 2: Ajouter le state**

Dans le composant `PokerTable`, après les autres `useState` (vers ligne 31-33), ajouter :

```tsx
const [showInviteDialog, setShowInviteDialog] = useState(false);
```

- [ ] **Step 3: Modifier le badge code mobile (header mobile portrait)**

Localiser le badge code dans le rendu mobile portrait (autour de la ligne 344-361 du PokerTable.tsx) :

```tsx
{table.inviteCode && (
  <button
    onClick={() => {
      navigator.clipboard?.writeText(table.inviteCode!);
    }}
    title="Cliquer pour copier le code d'invitation"
    className="px-2 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-xs font-mono tracking-widest"
  >
    📋 {table.inviteCode}
  </button>
)}
```

Remplacer par :

```tsx
{table.inviteCode && (
  <button
    onClick={() => setShowInviteDialog(true)}
    title="Inviter des joueurs"
    className="px-2 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-xs font-mono tracking-widest"
  >
    📤 {table.inviteCode}
  </button>
)}
```

- [ ] **Step 4: Modifier le badge code desktop**

Localiser le badge code dans le rendu desktop (autour de la ligne 520-530 du PokerTable.tsx) :

```tsx
{table.inviteCode && (
  <button
    onClick={() => {
      navigator.clipboard?.writeText(table.inviteCode!);
    }}
    title="Cliquer pour copier le code d'invitation"
    className="mt-1 inline-flex items-center gap-1 px-3 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-sm font-mono tracking-widest text-white transition-colors"
  >
    📋 Code: {table.inviteCode}
  </button>
)}
```

Remplacer par :

```tsx
{table.inviteCode && (
  <button
    onClick={() => setShowInviteDialog(true)}
    title="Inviter des joueurs"
    className="mt-1 inline-flex items-center gap-1 px-3 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-sm font-mono tracking-widest text-white transition-colors"
  >
    📤 Inviter ({table.inviteCode})
  </button>
)}
```

- [ ] **Step 5: Ajouter le rendu de la modale**

Le composant `PokerTable` a 2 rendus différents (mobile portrait + desktop oval). Ajouter le rendu de la modale dans les **deux**. Localisation Mobile : juste après le `<RebuyDialog>` mobile (autour de ligne 488). Localisation Desktop : à la fin du return desktop, juste avant la fermeture finale.

Pour le mobile (après la modale RebuyDialog mobile) :

```tsx
{showInviteDialog && table.inviteCode && (
  <InviteDialog
    isOpen={showInviteDialog}
    onClose={() => setShowInviteDialog(false)}
    inviteCode={table.inviteCode}
  />
)}
```

Pour le desktop, idem juste avant la fermeture du composant (chercher la dernière `</div>` du return desktop).

⚠️ Adapter aux structures existantes — lire ~50 lignes autour des points d'insertion pour ne pas casser l'imbrication JSX.

- [ ] **Step 6: Vérifier typecheck/lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/core/components/Game/PokerTable.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(ui): badge code ouvre InviteDialog (au lieu de copier directement)

Le badge dans le header (mobile + desktop) ouvre maintenant la modale
InviteDialog qui contient QR + lien + bouton partager. La copie du
code/lien se fait depuis la modale.

Texte du badge mis à jour: 'Inviter (CODE)' au lieu de 'Code: CODE'."
```

---

### Task 4: Hook `usePendingJoin`

**Files:**
- Create: `src/core/hooks/usePendingJoin.ts`

- [ ] **Step 1: Créer le hook**

```typescript
// usePendingJoin: gère le code d'invitation en attente entre l'arrivée
// sur l'URL ?join=CODE et l'auto-join post-auth.
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "pendingJoinCode";

export const usePendingJoin = () => {
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  // Au montage : lire l'URL et localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Lire la query string
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("join");

    if (codeFromUrl) {
      const sanitized = codeFromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (sanitized.length === 6) {
        // Stocker en localStorage pour survivre au signup
        localStorage.setItem(STORAGE_KEY, sanitized);
        setPendingCode(sanitized);

        // Nettoyer l'URL pour éviter de re-déclencher au refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("join");
        window.history.replaceState({}, "", url.toString());
        return;
      }
    }

    // 2. Sinon, lire localStorage (cas où l'user était déjà là avant signup)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPendingCode(stored);
    }
  }, []);

  const clearPending = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setPendingCode(null);
  }, []);

  return { pendingCode, clearPending };
};
```

- [ ] **Step 2: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/core/hooks/usePendingJoin.ts
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(hooks): usePendingJoin pour gérer ?join=CODE entre URL et auth

Au montage, lit window.location.search pour extraire ?join=CODE,
sanitize (6 chars A-Z0-9), stocke en localStorage, nettoie l'URL via
history.replaceState.

Expose pendingCode et clearPending() pour le consommer (AppMain)."
```

---

### Task 5: Auto-join dans AppMain

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

- [ ] **Step 1: Lire la structure actuelle de AppMain**

```bash
sed -n '1,50p' src/core/components/App/AppMain.tsx
```

Identifier où sont les hooks `useAuth`, `useTableActions`, `joinTableMutation`, et le state `currentView`/`selectedTableId`.

- [ ] **Step 2: Ajouter l'import du hook**

```tsx
import { usePendingJoin } from "../../hooks/usePendingJoin";
import { useQuery } from "convex/react"; // si pas déjà importé
```

- [ ] **Step 3: Brancher le hook dans le composant**

Dans `AppContent`, après les autres hooks (vers ligne 17-23), ajouter :

```tsx
const { pendingCode, clearPending } = usePendingJoin();

// Lookup de la table associée au code en attente
const pendingTable = useQuery(
  api.tables.getTableByInviteCode,
  pendingCode ? { code: pendingCode } : "skip"
);
```

- [ ] **Step 4: Ajouter l'effet d'auto-join**

Après les hooks et avant les `if (isLoading)` / `if (!user)`, ajouter :

```tsx
// Auto-join quand user authentifié + table résolue
React.useEffect(() => {
  if (!user || !pendingCode || pendingTable === undefined) return;

  if (pendingTable === null) {
    // Code invalide (ou table supprimée) — clear et continue
    console.warn("Invalid invite code:", pendingCode);
    clearPending();
    return;
  }

  // Table trouvée. Naviguer + tenter l'auto-join (idempotent).
  setSelectedTableId(pendingTable._id);
  setCurrentView("table");

  // Tenter de s'asseoir sur un siège libre. Si déjà assis,
  // joinTable jettera "User already in table" → on l'ignore silencieusement.
  joinTableMutation({
    tableId: pendingTable._id,
    userId: user._id,
  })
    .catch((err) => {
      const msg = err?.message ?? String(err);
      if (msg.includes("User already in table")) {
        // OK, l'utilisateur est déjà à la table — on garde la navigation
        return;
      }
      if (msg.includes("Table is full")) {
        alert("La table est complète, impossible de rejoindre.");
        setCurrentView("lobby");
        setSelectedTableId(null);
        return;
      }
      console.error("Auto-join failed:", err);
    })
    .finally(() => {
      clearPending();
    });
}, [user, pendingCode, pendingTable, joinTableMutation, clearPending]);
```

- [ ] **Step 5: Vérifier typecheck**

Run: `npm run typecheck`
Expected: exit 0. Si erreur sur `React.useEffect`, ajouter `useEffect` à l'import React :
```tsx
import React, { useEffect, useState } from "react";
```
et utiliser `useEffect(...)` au lieu de `React.useEffect(...)`.

- [ ] **Step 6: Vérifier le build**

```bash
npm run build 2>&1 | tail -5
```

Expected: build successful.

- [ ] **Step 7: Commit**

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email=viny1976@gmail.com -c user.name=satch9 commit -m "feat(app): auto-join post-auth quand un pendingJoinCode est en attente

AppMain consomme usePendingJoin + getTableByInviteCode et déclenche
un useEffect qui:
1. Si table résolue et user connecté: setSelectedTableId + setCurrentView('table')
2. Tente joinTable (silencieux si 'User already in table')
3. Affiche un alert si 'Table is full'
4. clearPending dans finally

Le flow complet:
- Lena clique le lien partagé par Bea → ?join=ABC123
- usePendingJoin sauve ABC123, nettoie l'URL
- Si pas connectée: LoginForm s'affiche, après signup le hook re-déclenche
- Si connectée: useEffect se déclenche immédiatement
- Lena arrive à la table de Bea, assise sur le siège libre"
```

---

### Task 6: Build prod + déploiement

**Files:** aucun (vérification + déploiement)

- [ ] **Step 1: Vérifier les 3 commandes**

```bash
npm run typecheck && npm run lint && npx vitest run
echo "FINAL EXIT: $?"
```

Expected: `FINAL EXIT: 0`.

- [ ] **Step 2: Build prod**

```bash
npm run build 2>&1 | tail -5
```

Expected: nouveau bundle dans `dist/assets/`.

- [ ] **Step 3: Vérifier que nginx sert bien le nouveau bundle**

```bash
curl -sI https://home-poker.vjdev.tech | head -3
```

Expected: HTTP/2 200.

```bash
curl -s https://home-poker.vjdev.tech | grep -oE 'index-[a-zA-Z0-9_-]+\.js' | head -1
```

Doit afficher le hash du bundle qu'on vient de build (vérifier en comparant à la sortie de `ls dist/assets/index-*.js`).

- [ ] **Step 4: Lister les commits du sprint**

```bash
git log --oneline ac327c3..HEAD | head -10
```

Expected : 5 commits techniques (Tasks 1-5).

- [ ] **Step 5: Pas de commit (vérifications uniquement)**

---

### Task 7: Smoke utilisateur (gate)

**Files:** aucun

- [ ] **Step 1: Demander au user d'effectuer le smoke**

Message au user :

> Module Invitations V1 implémenté + déployé. Smoke à toi (~5 min) :
>
> 1. Bea (PC) crée une table publique. Clique le bouton **"Inviter (CODE)"** dans le header → modale avec QR + lien.
> 2. Bea **copie le lien** (bouton 📋) et l'envoie à Lena (autre fenêtre / mobile / WhatsApp).
> 3. **Cas A** — Lena est déjà connectée dans son onglet : elle clique le lien → arrive directement sur la table, assise au siège libre.
> 4. **Cas B** — Lena fermée / déconnectée : clique le lien → écran login → signup → arrive directement sur la table.
> 5. **Bonus mobile** : Bea peut aussi scanner le QR depuis son téléphone (autre compte).
>
> Si tout marche → Module Invitations V1 OK, on enchaîne sur Étape 3 (audit prod).

- [ ] **Step 2: Attendre validation**

(Pas de commit ici — gate utilisateur.)

---

## Self-Review

**Spec coverage** :
- ✅ Modale `InviteDialog` avec QR + lien + bouton partager → Task 2
- ✅ Lib `qrcode.react` ajoutée → Task 1
- ✅ Badge code → ouvre modale au lieu de copier directement → Task 3
- ✅ Hook `usePendingJoin` → Task 4
- ✅ Auto-join post-auth dans AppMain → Task 5
- ✅ Build + déploiement → Task 6
- ✅ Smoke utilisateur → Task 7
- ✅ URL via `window.location.origin` (pas hard-coded) → Task 2 step 1
- ✅ Idempotence join (User already in table catché silencieusement) → Task 5 step 4
- ✅ Cas Table is full → alert + retour lobby → Task 5 step 4
- ✅ Code invalide → clear pending + warn console → Task 5 step 4
- ✅ Hors-scope respecté : pas d'email, pas de tracking individuel des invitations, pas d'expiration

**Placeholder scan** : aucun TBD/TODO. Toutes les commandes et code complets. Quelques `⚠️ Adapter aux structures existantes` accompagnés d'instructions concrètes (lire ~50 lignes autour, etc.).

**Type consistency** :
- `pendingCode: string | null` introduit Task 4 et utilisé Task 5
- `clearPending: () => void` introduit Task 4 et utilisé Task 5
- `inviteCode: string` consommé par `InviteDialog` (Task 2) et passé depuis PokerTable (Task 3) : tous deux utilisent `table.inviteCode` du schema
- `getTableByInviteCode` retourne `{ _id, name, status, maxPlayers, gameType, smallBlind, bigBlind, currentPlayers } | null` (défini en Étape 1) — cohérent avec l'usage Task 5
- `joinTableMutation({ tableId, userId, seatPosition? })` — signature existante de Étape 1, Task 5 ne passe pas `seatPosition` ce qui laisse `joinTable` choisir un siège libre (comportement par défaut)

Plan complet et auto-suffisant.
