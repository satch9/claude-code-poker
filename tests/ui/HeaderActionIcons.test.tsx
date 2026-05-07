import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeaderActionIcons } from "../../src/core/components/Game/HeaderActionIcons";

const noop = vi.fn();

describe("HeaderActionIcons — badge chat", () => {
  it("affiche un badge avec le compteur quand unreadChat > 0", () => {
    render(
      <HeaderActionIcons
        onTogglePanel={noop}
        onToggleSettings={noop}
        onToggleInvite={noop}
        showInvite={false}
        unreadChat={3}
      />,
    );

    expect(screen.getByLabelText(/3 messages? non lus/i)).toBeInTheDocument();
  });

  it("n'affiche pas de badge quand unreadChat vaut 0", () => {
    render(
      <HeaderActionIcons
        onTogglePanel={noop}
        onToggleSettings={noop}
        onToggleInvite={noop}
        showInvite={false}
        unreadChat={0}
      />,
    );

    expect(screen.queryByLabelText(/messages? non lus/i)).toBeNull();
  });

  it("affiche 9+ quand unreadChat dépasse 9", () => {
    render(
      <HeaderActionIcons
        onTogglePanel={noop}
        onToggleSettings={noop}
        onToggleInvite={noop}
        showInvite={false}
        unreadChat={42}
      />,
    );

    const badge = screen.getByLabelText(/42 messages? non lus/i);
    expect(badge).toHaveTextContent("9+");
  });
});
