# Chat temps réel — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activer un chat texte temps réel par table, joueurs assis uniquement, volatile (purge en fin de partie), avec rate-limit serveur et badge non-lu.

**Architecture:** Nouvelle table Convex `chatMessages` avec index `(tableId, createdAt)`. Mutations/queries dédiées dans `convex/chat.ts` gardées par auth + check-siège + rate-limit. Hook React `useTableChat` consomme la subscription Convex et calcule le compteur non-lu via `localStorage`. `ChatPanel` réécrit, `TableRightPanel` reçoit `tableId` et affiche un badge sur l'onglet Chat. Purge déclenchée par `internal.chat.purgeTableMessages` aux deux endroits où `tables.status` passe à `"finished"`.

**Tech Stack:** Convex (backend, real-time), `@convex-dev/auth`, `@convex-dev/rate-limiter`, React + TypeScript, Tailwind (tokens dark Sprint 0), Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-07-chat-temps-reel-design.md`.

---

## File structure

**Créés**
- `convex/chat.ts` — `sendMessage`, `listMessages`, `purgeTableMessages`.
- `convex/shared/chatValidation.ts` — fonction pure `validateChatBody(raw): { ok: true; body } | { ok: false; reason }` (testable unitairement).
- `src/core/hooks/useTableChat.ts` — hook React (subscription, envoi, unread count, markRead).
- `tests/chat-validation.test.ts` — tests purs sur `validateChatBody`.
- `tests/ui/useTableChat.test.tsx` — tests hook (unread count, markRead, mapping erreurs).
- `tests/ui/ChatPanel.test.tsx` — tests UI du panel (envoi, désactivé, états vide / non-assis).

**Modifiés**
- `convex/schema.ts` — ajout table `chatMessages`.
- `convex/shared/rateLimit.ts` — ajout limite `chatMessage`.
- `convex/core/gameEngine.ts` — appels purge aux deux locations `status: "finished"` (lignes ~1415 et ~1937).
- `src/core/components/Game/ChatPanel.tsx` — réécrit (consomme `useTableChat`, props `tableId`, `currentUserId`, `isSeated`, `isActive`).
- `src/core/components/Game/TableRightPanel.tsx` — props `tableId`, `currentUserId`, `isSeated` ; badge non-lu sur l'onglet Chat ; transmet l'`isActive` à `ChatPanel`.
- `src/core/components/Game/PokerTable.tsx` — passe `tableId`, `currentUserId`, `isSeated` au `TableRightPanel` (deux montages : drawer mobile + desktop si présent).
- `tests/ui/TableRightPanel.test.tsx` — adapté à la nouvelle API (props supplémentaires, mock `useTableChat`).

---

## Task 1 — Schéma : table `chatMessages`

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1.1: Ajouter la table dans le schéma**

Ajouter dans `convex/schema.ts`, après le bloc `gameActions` (à la fin avant la fermeture `}`):

```ts
  // Chat de table (volatile, purgé à la fin de la partie)
  chatMessages: defineTable({
    tableId: v.id("tables"),
    userId: v.id("users"),
    playerName: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_table", ["tableId", "createdAt"]),
```

- [ ] **Step 1.2: Pousser le schéma sur le déploiement dev**

Run: `npx convex dev --once`
Expected: `✔ Convex functions ready!` sans erreur de schéma. La nouvelle table apparaît dans `_generated/dataModel.d.ts`.

- [ ] **Step 1.3: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(chat): ajoute la table chatMessages au schéma Convex"
```

---

## Task 2 — Rate limiter : entrée `chatMessage`

**Files:**
- Modify: `convex/shared/rateLimit.ts`

- [ ] **Step 2.1: Ajouter la limite**

Dans `convex/shared/rateLimit.ts`, ajouter une entrée dans l'objet de configuration du `RateLimiter` :

```ts
  chatMessage: { kind: "token bucket", rate: 5, period: 10 * SECOND, capacity: 5 },
```

À placer juste après la ligne `playerAction` pour rester groupé avec les actions joueur.

- [ ] **Step 2.2: Vérifier la compilation TypeScript**

Run: `npx tsc -p . --noEmit`
Expected: pas d'erreur.

- [ ] **Step 2.3: Commit**

```bash
git add convex/shared/rateLimit.ts
git commit -m "feat(chat): ajoute la limite chatMessage (5/10s, token bucket)"
```

---

## Task 3 — Validation pure du corps de message (TDD)

**Files:**
- Create: `convex/shared/chatValidation.ts`
- Create: `tests/chat-validation.test.ts`

- [ ] **Step 3.1: Écrire les tests qui échouent**

`tests/chat-validation.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { validateChatBody, MAX_CHAT_LENGTH } from "../convex/shared/chatValidation";

describe("validateChatBody", () => {
  it("trims whitespace and returns the trimmed body", () => {
    const r = validateChatBody("  hello  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.body).toBe("hello");
  });

  it("rejects an empty string", () => {
    expect(validateChatBody("")).toEqual({ ok: false, reason: "EMPTY" });
  });

  it("rejects whitespace-only input", () => {
    expect(validateChatBody("   \n\t ")).toEqual({ ok: false, reason: "EMPTY" });
  });

  it("rejects bodies longer than MAX_CHAT_LENGTH after trim", () => {
    const long = "a".repeat(MAX_CHAT_LENGTH + 1);
    expect(validateChatBody(long)).toEqual({ ok: false, reason: "TOO_LONG" });
  });

  it("accepts bodies of exactly MAX_CHAT_LENGTH", () => {
    const exact = "a".repeat(MAX_CHAT_LENGTH);
    const r = validateChatBody(exact);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.body.length).toBe(MAX_CHAT_LENGTH);
  });

  it("exposes MAX_CHAT_LENGTH = 280", () => {
    expect(MAX_CHAT_LENGTH).toBe(280);
  });
});
```

- [ ] **Step 3.2: Lancer les tests pour confirmer qu'ils échouent**

Run: `npx vitest run tests/chat-validation.test.ts`
Expected: FAIL — module `convex/shared/chatValidation` introuvable.

- [ ] **Step 3.3: Implémenter le module**

Créer `convex/shared/chatValidation.ts` :

```ts
export const MAX_CHAT_LENGTH = 280;

export type ValidateChatBodyResult =
  | { ok: true; body: string }
  | { ok: false; reason: "EMPTY" | "TOO_LONG" };

export function validateChatBody(raw: string): ValidateChatBodyResult {
  const body = raw.trim();
  if (body.length === 0) return { ok: false, reason: "EMPTY" };
  if (body.length > MAX_CHAT_LENGTH) return { ok: false, reason: "TOO_LONG" };
  return { ok: true, body };
}
```

- [ ] **Step 3.4: Lancer les tests pour confirmer qu'ils passent**

Run: `npx vitest run tests/chat-validation.test.ts`
Expected: PASS — 6 tests verts.

- [ ] **Step 3.5: Commit**

```bash
git add convex/shared/chatValidation.ts tests/chat-validation.test.ts
git commit -m "feat(chat): valide pur (trim + bornes) avec tests unitaires"
```

---

## Task 4 — Mutation `sendMessage`

**Files:**
- Create: `convex/chat.ts`

- [ ] **Step 4.1: Créer le fichier avec la mutation**

`convex/chat.ts` :

```ts
import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./shared/auth";
import { rateLimiter } from "./shared/rateLimit";
import { validateChatBody } from "./shared/chatValidation";

async function findSeatedPlayer(
  ctx: { db: any },
  tableId: Id<"tables">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("players")
    .withIndex("by_table", (q: any) => q.eq("tableId", tableId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();
}

export const sendMessage = mutation({
  args: {
    tableId: v.id("tables"),
    body: v.string(),
  },
  handler: async (ctx, { tableId, body }) => {
    const userId = await requireUserId(ctx);

    const seated = await findSeatedPlayer(ctx, tableId, userId);
    if (!seated) throw new ConvexError("NOT_SEATED");

    const validation = validateChatBody(body);
    if (!validation.ok) throw new ConvexError(validation.reason);

    const status = await rateLimiter.limit(ctx, "chatMessage", {
      key: `${userId}:${tableId}`,
    });
    if (!status.ok) throw new ConvexError("RATE_LIMIT");

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("USER_NOT_FOUND");

    const id = await ctx.db.insert("chatMessages", {
      tableId,
      userId,
      playerName: user.name,
      body: validation.body,
      createdAt: Date.now(),
    });

    return id;
  },
});
```

- [ ] **Step 4.2: Vérifier la compilation et le push Convex**

Run: `npx convex dev --once`
Expected: `✔ Convex functions ready!` ; `api.chat.sendMessage` apparaît dans `_generated/api.d.ts`.

- [ ] **Step 4.3: Commit**

```bash
git add convex/chat.ts convex/_generated
git commit -m "feat(chat): mutation sendMessage (auth + siège + rate-limit)"
```

---

## Task 5 — Query `listMessages`

**Files:**
- Modify: `convex/chat.ts`

- [ ] **Step 5.1: Ajouter la query**

À la suite de `sendMessage` dans `convex/chat.ts`, ajouter :

```ts
export const listMessages = query({
  args: {
    tableId: v.id("tables"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, limit }) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (!userId) return [];

    const seated = await findSeatedPlayer(ctx, tableId, userId);
    if (!seated) return [];

    const take = Math.min(Math.max(limit ?? 50, 1), 100);

    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_table", (q) => q.eq("tableId", tableId))
      .order("desc")
      .take(take);

    return rows.reverse();
  },
});
```

- [ ] **Step 5.2: Vérifier le push Convex**

Run: `npx convex dev --once`
Expected: pas d'erreur ; `api.chat.listMessages` exposé.

- [ ] **Step 5.3: Commit**

```bash
git add convex/chat.ts convex/_generated
git commit -m "feat(chat): query listMessages temps réel (siège requis)"
```

---

## Task 6 — Purge interne en fin de partie

**Files:**
- Modify: `convex/chat.ts`

- [ ] **Step 6.1: Ajouter l'internal mutation**

À la suite de `listMessages` dans `convex/chat.ts` :

```ts
export const purgeTableMessages = internalMutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_table", (q) => q.eq("tableId", tableId))
      .collect();

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return rows.length;
  },
});
```

- [ ] **Step 6.2: Vérifier le push Convex**

Run: `npx convex dev --once`
Expected: `internal.chat.purgeTableMessages` disponible.

- [ ] **Step 6.3: Commit**

```bash
git add convex/chat.ts convex/_generated
git commit -m "feat(chat): internal mutation purgeTableMessages"
```

---

## Task 7 — Brancher la purge dans le moteur de jeu

**Files:**
- Modify: `convex/core/gameEngine.ts`

- [ ] **Step 7.1: Vérifier l'import existant `internal`**

Run: `grep -n "from \"../_generated/api\"" convex/core/gameEngine.ts`
Expected: une ligne du type `import { internal } from "../_generated/api";`. Si absente, l'ajouter en tête de fichier après les autres imports `_generated`.

- [ ] **Step 7.2: Ajouter la purge après le premier `status: "finished"` (ligne ~1415)**

Localiser la ligne :

```ts
    await ctx.db.patch(tableId, { status: "finished" });
```

Juste après cette ligne, ajouter :

```ts
    await ctx.runMutation(internal.chat.purgeTableMessages, { tableId });
```

- [ ] **Step 7.3: Ajouter la purge après le second `status: "finished"` (ligne ~1937)**

Localiser le bloc :

```ts
  await ctx.db.patch(tableId, {
    status: "finished",
    modules: {
      ...
    },
  });
```

Juste après la fermeture de ce `await ctx.db.patch(...)`, ajouter :

```ts
  await ctx.runMutation(internal.chat.purgeTableMessages, { tableId });
```

- [ ] **Step 7.4: Vérifier la compilation et le push**

Run: `npx convex dev --once`
Expected: pas d'erreur TypeScript.

- [ ] **Step 7.5: Commit**

```bash
git add convex/core/gameEngine.ts
git commit -m "feat(chat): purge automatique des messages en fin de partie"
```

---

## Task 8 — Hook `useTableChat` (TDD)

**Files:**
- Create: `src/core/hooks/useTableChat.ts`
- Create: `tests/ui/useTableChat.test.tsx`

- [ ] **Step 8.1: Écrire les tests qui échouent**

`tests/ui/useTableChat.test.tsx` :

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableChat } from "../../src/core/hooks/useTableChat";

const sendMutation = vi.fn();
let mockMessages: any = [];
let mockUserId: string | null = "u-self";

vi.mock("convex/react", () => ({
  useQuery: () => mockMessages,
  useMutation: () => sendMutation,
}));

vi.mock("../../src/core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUserId ? { _id: mockUserId, name: "Self" } : null }),
}));

vi.mock("../../src/shared/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

beforeEach(() => {
  localStorage.clear();
  mockMessages = [];
  mockUserId = "u-self";
  sendMutation.mockReset();
});

const tableId = "t1" as any;

describe("useTableChat", () => {
  it("returns messages from the live query", () => {
    mockMessages = [{ _id: "m1", userId: "u2", playerName: "Bob", body: "hi", createdAt: 1 }];
    const { result } = renderHook(() => useTableChat(tableId));
    expect(result.current.messages).toHaveLength(1);
  });

  it("counts unread messages from other users only", () => {
    mockMessages = [
      { _id: "m1", userId: "u-self", playerName: "Self", body: "self", createdAt: 100 },
      { _id: "m2", userId: "u2", playerName: "Bob", body: "bob1", createdAt: 200 },
      { _id: "m3", userId: "u3", playerName: "Cara", body: "cara1", createdAt: 300 },
    ];
    const { result } = renderHook(() => useTableChat(tableId));
    expect(result.current.unreadCount).toBe(2);
  });

  it("markRead resets the unread counter", () => {
    mockMessages = [
      { _id: "m1", userId: "u2", playerName: "Bob", body: "bob1", createdAt: 200 },
    ];
    const { result, rerender } = renderHook(() => useTableChat(tableId));
    expect(result.current.unreadCount).toBe(1);
    act(() => result.current.markRead());
    rerender();
    expect(result.current.unreadCount).toBe(0);
  });

  it("send calls the mutation with the table id and body", async () => {
    sendMutation.mockResolvedValueOnce("mid");
    const { result } = renderHook(() => useTableChat(tableId));
    await act(async () => {
      await result.current.send("hello");
    });
    expect(sendMutation).toHaveBeenCalledWith({ tableId, body: "hello" });
  });

  it("returns an empty messages list when query is loading", () => {
    mockMessages = undefined;
    const { result } = renderHook(() => useTableChat(tableId));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
```

- [ ] **Step 8.2: Lancer les tests pour confirmer qu'ils échouent**

Run: `npx vitest run tests/ui/useTableChat.test.tsx`
Expected: FAIL — `useTableChat` introuvable.

- [ ] **Step 8.3: Implémenter le hook**

`src/core/hooks/useTableChat.ts` :

```ts
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "./useAuth";
import { useToast } from "../../shared/ui";

const STORAGE_KEY = (tableId: string) => `chat:lastRead:${tableId}`;

function readLastRead(tableId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tableId));
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeLastRead(tableId: string, ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY(tableId), String(ts));
  } catch {
    /* ignore quota / private mode */
  }
}

export interface ChatMessageView {
  _id: string;
  userId: string;
  playerName: string;
  body: string;
  createdAt: number;
}

export function useTableChat(tableId: Id<"tables"> | null) {
  const messagesRaw = useQuery(
    api.chat.listMessages,
    tableId ? { tableId } : "skip",
  ) as ChatMessageView[] | undefined;

  const sendMutation = useMutation(api.chat.sendMessage);
  const { user } = useAuth();
  const toast = useToast();

  const [lastReadBump, setLastReadBump] = useState(0);
  const [sending, setSending] = useState(false);

  const messages = messagesRaw ?? [];
  const isLoading = messagesRaw === undefined;

  const unreadCount = useMemo(() => {
    if (!tableId) return 0;
    const lastRead = readLastRead(String(tableId));
    void lastReadBump;
    return messages.filter(
      (m) => m.createdAt > lastRead && m.userId !== user?._id,
    ).length;
  }, [messages, tableId, user?._id, lastReadBump]);

  const markRead = useCallback(() => {
    if (!tableId) return;
    writeLastRead(String(tableId), Date.now());
    setLastReadBump((n) => n + 1);
  }, [tableId]);

  const send = useCallback(
    async (body: string) => {
      if (!tableId) return;
      setSending(true);
      try {
        await sendMutation({ tableId, body });
      } catch (e: any) {
        const data = e?.data ?? e?.message ?? "";
        const code = String(data);
        if (code.includes("RATE_LIMIT")) {
          toast.error("Tu écris trop vite. Patiente quelques secondes.");
        } else if (code.includes("TOO_LONG")) {
          toast.error("Message trop long (280 caractères max).");
        } else if (code.includes("EMPTY")) {
          toast.error("Le message est vide.");
        } else if (code.includes("NOT_SEATED")) {
          toast.error("Tu dois être assis pour écrire.");
        } else {
          toast.error("Échec de l'envoi du message.");
        }
        throw e;
      } finally {
        setSending(false);
      }
    },
    [tableId, sendMutation, toast],
  );

  return { messages, isLoading, unreadCount, markRead, send, sending };
}
```

- [ ] **Step 8.4: Lancer les tests pour confirmer qu'ils passent**

Run: `npx vitest run tests/ui/useTableChat.test.tsx`
Expected: PASS — 5 tests verts.

- [ ] **Step 8.5: Commit**

```bash
git add src/core/hooks/useTableChat.ts tests/ui/useTableChat.test.tsx
git commit -m "feat(chat): hook useTableChat (subscription + unread + send)"
```

---

## Task 9 — Refonte `ChatPanel` (TDD)

**Files:**
- Modify: `src/core/components/Game/ChatPanel.tsx`
- Create: `tests/ui/ChatPanel.test.tsx`

- [ ] **Step 9.1: Écrire les tests qui échouent**

`tests/ui/ChatPanel.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "../../src/core/components/Game/ChatPanel";

const sendFn = vi.fn();
let mockReturn: any = {
  messages: [],
  isLoading: false,
  unreadCount: 0,
  markRead: vi.fn(),
  send: sendFn,
  sending: false,
};

vi.mock("../../src/core/hooks/useTableChat", () => ({
  useTableChat: () => mockReturn,
}));

beforeEach(() => {
  sendFn.mockReset();
  mockReturn = {
    messages: [],
    isLoading: false,
    unreadCount: 0,
    markRead: vi.fn(),
    send: sendFn,
    sending: false,
  };
});

const tableId = "t1" as any;

describe("ChatPanel", () => {
  it("renders the empty state when no messages and seated", () => {
    render(<ChatPanel tableId={tableId} currentUserId={"u1" as any} isSeated isActive />);
    expect(screen.getByText(/soyez le premier/i)).toBeInTheDocument();
  });

  it("renders the not-seated state when isSeated is false", () => {
    render(<ChatPanel tableId={tableId} currentUserId={"u1" as any} isSeated={false} isActive />);
    expect(screen.getByText(/assis/i)).toBeInTheDocument();
  });

  it("renders messages when present", () => {
    mockReturn.messages = [
      { _id: "m1", userId: "u2", playerName: "Bob", body: "hello", createdAt: Date.now() },
    ];
    render(<ChatPanel tableId={tableId} currentUserId={"u1" as any} isSeated isActive />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("calls send on Enter key", async () => {
    sendFn.mockResolvedValueOnce(undefined);
    render(<ChatPanel tableId={tableId} currentUserId={"u1" as any} isSeated isActive />);
    const input = screen.getByLabelText(/message/i);
    await userEvent.type(input, "hi{Enter}");
    expect(sendFn).toHaveBeenCalledWith("hi");
  });

  it("disables the input while sending", () => {
    mockReturn.sending = true;
    render(<ChatPanel tableId={tableId} currentUserId={"u1" as any} isSeated isActive />);
    expect(screen.getByLabelText(/message/i)).toBeDisabled();
  });

  it("calls markRead when activated", () => {
    const markRead = vi.fn();
    mockReturn.markRead = markRead;
    render(<ChatPanel tableId={tableId} currentUserId={"u1" as any} isSeated isActive />);
    expect(markRead).toHaveBeenCalled();
  });
});
```

- [ ] **Step 9.2: Lancer les tests pour confirmer qu'ils échouent**

Run: `npx vitest run tests/ui/ChatPanel.test.tsx`
Expected: FAIL — props non supportées (le ChatPanel actuel n'a pas de props).

- [ ] **Step 9.3: Réécrire `ChatPanel`**

Remplacer **tout** le contenu de `src/core/components/Game/ChatPanel.tsx` par :

```tsx
import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useTableChat } from "../../hooks/useTableChat";
import { cn } from "../../../shared/utils/cn";

interface ChatPanelProps {
  tableId: Id<"tables">;
  currentUserId: Id<"users"> | null;
  isSeated: boolean;
  isActive: boolean;
}

const MAX = 280;

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  tableId,
  currentUserId,
  isSeated,
  isActive,
}) => {
  const { messages, isLoading, send, sending, markRead } = useTableChat(tableId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (isActive) markRead();
  }, [isActive, markRead, messages.length]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  if (!isSeated) {
    return (
      <div className="text-sm text-text-muted space-y-3 p-2">
        <div className="flex justify-center">
          <MessageCircle size={32} aria-hidden />
        </div>
        <p className="text-center">
          Tu dois être assis à la table pour participer au chat.
        </p>
      </div>
    );
  }

  const onSubmit = async () => {
    const value = draft;
    if (!value.trim() || sending) return;
    setDraft("");
    try {
      await send(value);
    } catch {
      setDraft(value);
    }
  };

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    stickToBottomRef.current = distance < 24;
  };

  return (
    <div className="flex flex-col h-full text-sm">
      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Messages du chat"
        className="flex-1 overflow-y-auto px-2 py-2 space-y-2"
      >
        {isLoading && (
          <div className="text-text-muted text-center py-4">Chargement…</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-text-muted text-center py-6 space-y-2">
            <div className="flex justify-center">
              <MessageCircle size={28} aria-hidden />
            </div>
            <p>Soyez le premier à écrire.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.userId === currentUserId;
          return (
            <div key={m._id} className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    mine ? "text-accent" : "text-text-primary",
                  )}
                >
                  {m.playerName}
                </span>
                <span className="text-[10px] text-text-muted">
                  {formatTime(m.createdAt)}
                </span>
              </div>
              <p className="text-text-primary break-words whitespace-pre-wrap">
                {m.body}
              </p>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        className="flex items-end gap-2 border-t border-border-default px-2 py-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSubmit();
            }
          }}
          disabled={sending}
          placeholder="Écris un message…"
          className={cn(
            "flex-1 min-h-tap rounded-md bg-bg-elevated border border-border-default text-text-primary px-3 py-2 outline-none",
            "focus:border-accent disabled:opacity-50",
          )}
          aria-label="Message"
          maxLength={MAX}
        />
        <span
          aria-hidden
          className="text-[10px] text-text-muted tabular-nums w-10 text-right"
        >
          {draft.length}/{MAX}
        </span>
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          aria-label="Envoyer"
          className={cn(
            "min-h-tap min-w-tap inline-flex items-center justify-center rounded-md bg-accent text-white px-3",
            "hover:bg-accent-hover disabled:opacity-50",
          )}
        >
          <Send size={16} aria-hidden />
        </button>
      </form>
    </div>
  );
};
```

- [ ] **Step 9.4: Lancer les tests pour confirmer qu'ils passent**

Run: `npx vitest run tests/ui/ChatPanel.test.tsx`
Expected: PASS — 6 tests verts.

- [ ] **Step 9.5: Commit**

```bash
git add src/core/components/Game/ChatPanel.tsx tests/ui/ChatPanel.test.tsx
git commit -m "feat(chat): refonte ChatPanel temps réel (envoi, états, a11y)"
```

---

## Task 10 — `TableRightPanel` : props `tableId` + badge non-lu

**Files:**
- Modify: `src/core/components/Game/TableRightPanel.tsx`
- Modify: `tests/ui/TableRightPanel.test.tsx`

- [ ] **Step 10.1: Mettre à jour le test existant et ajouter un test badge**

Remplacer le contenu de `tests/ui/TableRightPanel.test.tsx` par :

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableRightPanel } from '../../src/core/components/Game/TableRightPanel';

let mockReturn: any = {
  messages: [],
  isLoading: false,
  unreadCount: 0,
  markRead: vi.fn(),
  send: vi.fn(),
  sending: false,
};

vi.mock('../../src/core/hooks/useTableChat', () => ({
  useTableChat: () => mockReturn,
}));

const players = [
  { userId: 'u1', name: 'Alice', chips: 1500, isFolded: false, isAllIn: false, isCurrent: true },
];

const baseProps = {
  actions: [],
  players,
  tableId: 't1' as any,
  currentUserId: 'u1' as any,
  isSeated: true,
};

beforeEach(() => {
  mockReturn = {
    messages: [],
    isLoading: false,
    unreadCount: 0,
    markRead: vi.fn(),
    send: vi.fn(),
    sending: false,
  };
});

describe('TableRightPanel', () => {
  it('renders three tab buttons', () => {
    render(<TableRightPanel {...baseProps} />);
    expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /historique/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /joueurs/i })).toBeInTheDocument();
  });

  it('opens on the players tab by default', () => {
    render(<TableRightPanel {...baseProps} />);
    expect(screen.getByRole('tab', { name: /joueurs/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('switches to chat tab on click', async () => {
    render(<TableRightPanel {...baseProps} />);
    await userEvent.click(screen.getByRole('tab', { name: /chat/i }));
    expect(screen.getByRole('tab', { name: /chat/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to historique tab on click', async () => {
    render(<TableRightPanel {...baseProps} />);
    await userEvent.click(screen.getByRole('tab', { name: /historique/i }));
    expect(screen.getByRole('tab', { name: /historique/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an unread badge on the chat tab when unreadCount > 0 and tab not active', () => {
    mockReturn.unreadCount = 3;
    render(<TableRightPanel {...baseProps} />);
    const badge = screen.getByLabelText(/3 messages? non lus/i);
    expect(badge).toBeInTheDocument();
  });

  it('hides the badge when chat tab is active', async () => {
    mockReturn.unreadCount = 3;
    render(<TableRightPanel {...baseProps} />);
    await userEvent.click(screen.getByRole('tab', { name: /chat/i }));
    expect(screen.queryByLabelText(/messages? non lus/i)).toBeNull();
  });
});
```

- [ ] **Step 10.2: Lancer les tests pour confirmer qu'ils échouent**

Run: `npx vitest run tests/ui/TableRightPanel.test.tsx`
Expected: FAIL — props inconnues, badge inexistant.

- [ ] **Step 10.3: Mettre à jour `TableRightPanel`**

Remplacer le contenu de `src/core/components/Game/TableRightPanel.tsx` par :

```tsx
import React, { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { ActionFeed } from './ActionFeed';
import { ChatPanel } from './ChatPanel';
import { PlayersListPanel, type PlayerSummary } from './PlayersListPanel';
import { useTableChat } from '../../hooks/useTableChat';
import { Id } from '../../../../convex/_generated/dataModel';

type TabId = 'chat' | 'historique' | 'joueurs';

export interface TableRightPanelProps {
  actions: unknown[];
  players: PlayerSummary[];
  tableId: Id<'tables'>;
  currentUserId: Id<'users'> | null;
  isSeated: boolean;
  className?: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'joueurs', label: 'Joueurs' },
  { id: 'historique', label: 'Historique' },
  { id: 'chat', label: 'Chat' },
];

export const TableRightPanel: React.FC<TableRightPanelProps> = ({
  actions,
  players,
  tableId,
  currentUserId,
  isSeated,
  className,
}) => {
  const [active, setActive] = useState<TabId>('joueurs');
  const { unreadCount } = useTableChat(tableId);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div role="tablist" aria-label="Panneau de la table" className="flex border-b border-border-default -mx-4 px-4">
        {TABS.map((t) => {
          const isActive = active === t.id;
          const showBadge = t.id === 'chat' && !isActive && unreadCount > 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex-1 min-h-tap py-2 text-sm font-medium transition-colors relative inline-flex items-center justify-center gap-1.5',
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <span>{t.label}</span>
              {showBadge && (
                <span
                  aria-label={`${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`}
                  className="inline-flex items-center justify-center text-[10px] font-bold bg-accent text-white rounded-full min-w-[18px] h-[18px] px-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-2 pt-3">
        {active === 'joueurs' && <PlayersListPanel players={players} />}
        {active === 'historique' && <ActionFeed actions={actions as any} />}
        {active === 'chat' && (
          <ChatPanel
            tableId={tableId}
            currentUserId={currentUserId}
            isSeated={isSeated}
            isActive
          />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 10.4: Lancer les tests pour confirmer qu'ils passent**

Run: `npx vitest run tests/ui/TableRightPanel.test.tsx`
Expected: PASS — 6 tests verts.

- [ ] **Step 10.5: Commit**

```bash
git add src/core/components/Game/TableRightPanel.tsx tests/ui/TableRightPanel.test.tsx
git commit -m "feat(chat): TableRightPanel reçoit tableId + badge non-lu"
```

---

## Task 11 — `PokerTable` : transmettre `tableId` / `currentUserId` / `isSeated`

**Files:**
- Modify: `src/core/components/Game/PokerTable.tsx`

- [ ] **Step 11.1: Identifier les sources des trois props**

Run: `grep -n "authUser\|currentPlayer\|playersForPanel\|TableRightPanel" src/core/components/Game/PokerTable.tsx`
Attendu : `authUser` (utilisateur courant), `currentPlayer` (siège du joueur courant si assis), et la ligne `<TableRightPanel ...>`.

Note : `isSeated = !!currentPlayer`. `currentUserId = authUser?._id ?? null`.

- [ ] **Step 11.2: Mettre à jour le montage de `TableRightPanel`**

Localiser le bloc (ligne ~984) :

```tsx
          <TableRightPanel
            actions={actionHistory as unknown[] ?? []}
            players={playersForPanel}
          />
```

Le remplacer par :

```tsx
          <TableRightPanel
            actions={actionHistory as unknown[] ?? []}
            players={playersForPanel}
            tableId={table._id}
            currentUserId={authUser?._id ?? null}
            isSeated={!!currentPlayer}
          />
```

Si une seconde occurrence de `<TableRightPanel ...>` existe (montage desktop), appliquer le même changement.

Run: `grep -n "<TableRightPanel" src/core/components/Game/PokerTable.tsx`
Vérifier que toutes les occurrences ont les nouvelles props.

- [ ] **Step 11.3: Vérifier la compilation**

Run: `npx tsc -p . --noEmit`
Expected: pas d'erreur.

- [ ] **Step 11.4: Lancer la suite UI**

Run: `npx vitest run tests/ui`
Expected: tous les tests UI passent (incluant `TableRightPanel`, `ChatPanel`, `useTableChat`).

- [ ] **Step 11.5: Commit**

```bash
git add src/core/components/Game/PokerTable.tsx
git commit -m "feat(chat): PokerTable propage tableId/currentUserId/isSeated"
```

---

## Task 12 — Build de production + smoke test manuel

**Files:** aucun

- [ ] **Step 12.1: Build prod**

Run: `npm run build`
Expected: build réussi, pas d'erreur TS, bundle `PokerTable` mis à jour (le chat n'ouvre pas un nouveau chunk).

- [ ] **Step 12.2: Smoke test manuel**

Run: `npm run dev` dans un terminal et `npx convex dev` dans un autre.

Checklist :
- [ ] Connecté en tant qu'utilisateur A, rejoindre une table et prendre un siège.
- [ ] Ouvrir l'onglet Chat : l'état vide s'affiche correctement.
- [ ] Envoyer un message → apparaît dans la liste.
- [ ] En navigation privée, connecter un utilisateur B et le faire asseoir à la même table.
- [ ] B envoie un message → A le voit en temps réel.
- [ ] Côté A, basculer sur l'onglet Joueurs ; B envoie 2 messages → le badge `2` apparaît sur Chat.
- [ ] Cliquer sur Chat → badge disparaît.
- [ ] Tester `RATE_LIMIT` : envoyer 6 messages rapidement → toast "Tu écris trop vite".
- [ ] Tester `TOO_LONG` : impossible via `maxLength`, mais coller >280 chars → tronqué côté client.
- [ ] Spectateur (utilisateur C, non assis) : onglet Chat affiche "Tu dois être assis…".
- [ ] Terminer une partie de tournoi → vérifier dans le dashboard Convex que `chatMessages` est vide pour cette table.

Si tout passe : `git status` propre, prêt à pousser.

---

## Self-review

**Spec coverage**
- Schéma `chatMessages` → Task 1 ✓
- `sendMessage` (auth + siège + rate-limit + validation) → Tasks 2, 3, 4 ✓
- `listMessages` (siège, limite 50, ordre) → Task 5 ✓
- `purgeTableMessages` + branchement → Tasks 6, 7 ✓
- Hook `useTableChat` (subscription, unread, markRead, send, mapping erreurs) → Task 8 ✓
- Refonte `ChatPanel` (états, auto-scroll, a11y, désactivation) → Task 9 ✓
- Badge non-lu sur l'onglet → Task 10 ✓
- Propagation depuis `PokerTable` → Task 11 ✓
- Build + smoke → Task 12 ✓
- Hors scope (édition, mentions, mute, DM, persistance longue) → respecté, rien ajouté.

**Type consistency**
- `tableId: Id<"tables">` partout, `userId: Id<"users">` partout.
- `ChatMessageView` exporté depuis le hook, utilisé tacitement par `ChatPanel` (champs alignés sur l'insert serveur : `_id`, `userId`, `playerName`, `body`, `createdAt`).
- `useTableChat` accepte `Id<"tables"> | null` (pour gérer le cas chargement) et passe `"skip"` à Convex si null.
- `TableRightPanel` exige `tableId: Id<"tables">` (non-null) — le parent garantit qu'il n'est monté qu'après chargement de la table.

**Placeholders / red flags** : aucun "TBD", "TODO" ou "similar to". Tout code visible dans les steps.
