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
