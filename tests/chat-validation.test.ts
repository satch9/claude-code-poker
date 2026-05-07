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
