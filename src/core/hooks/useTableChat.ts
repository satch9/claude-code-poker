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
