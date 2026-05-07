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
        aria-label="Journal du chat"
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
