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
