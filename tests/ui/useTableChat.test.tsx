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

  it("markRead in one instance updates the unread count in another instance for the same tableId", () => {
    mockMessages = [
      { _id: "m1", userId: "u2", playerName: "Bob", body: "bob1", createdAt: 200 },
    ];

    const a = renderHook(() => useTableChat(tableId));
    const b = renderHook(() => useTableChat(tableId));

    expect(a.result.current.unreadCount).toBe(1);
    expect(b.result.current.unreadCount).toBe(1);

    // Instance B (le ChatPanel) marque comme lu...
    act(() => b.result.current.markRead());

    // ...et l'instance A (le badge du header / drawer button) doit aussi
    // refléter le compteur à 0 sans attendre l'arrivée d'un nouveau message.
    expect(a.result.current.unreadCount).toBe(0);
    expect(b.result.current.unreadCount).toBe(0);
  });
});
