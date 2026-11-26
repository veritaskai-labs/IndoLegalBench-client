import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { InfoTip } from "./InfoTip";

// PO comment 25 Nov (SCRUM-346): a blue info icon that explains a term on hover. Keyboard users get the same
// text on focus, and Escape closes it (WCAG 1.4.13 Content on Hover or Focus: dismissible).
describe("InfoTip", () => {
  const renderTip = () => render(<InfoTip label="Penanda" text="Uji coba: sesi uji coba." />);

  it("is a named button described by its explanation, closed at first", () => {
    renderTip();
    const button = screen.getByRole("button", { name: "Penjelasan Penanda" });
    expect(button).toHaveAccessibleDescription("Uji coba: sesi uji coba.");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it.each([
    ["hover", fireEvent.mouseEnter, fireEvent.mouseLeave],
    ["focus", fireEvent.focus, fireEvent.blur],
  ] as const)("opens on %s and closes when it ends", (_name, open, close) => {
    renderTip();
    const button = screen.getByRole("button", { name: "Penjelasan Penanda" });
    open(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Uji coba: sesi uji coba.");
    close(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  // A click opens it (touch screens have no hover) and a second click keeps it open; Escape closes it without
  // moving focus. Review #125: a toggling click undid the open from the events a real click sends first.
  it("opens on click, stays open on a second click and closes on Escape", () => {
    renderTip();
    const button = screen.getByRole("button", { name: "Penjelasan Penanda" });
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  // Negative: other keys leave it open.
  it("stays open on other keys", () => {
    renderTip();
    const button = screen.getByRole("button", { name: "Penjelasan Penanda" });
    fireEvent.focus(button);
    fireEvent.keyDown(button, { key: "Tab" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  // Review #125 (Rafa): a real click or tap sends mouseenter and focus before click, so a toggling click closed
  // the tooltip again and a phone tap showed nothing. Reproduction tests from the review, with real pointer events.
  type Act = (user: ReturnType<typeof userEvent.setup>, button: HTMLElement) => Promise<void>;
  const ACTS: ReadonlyArray<readonly [string, Act]> = [
    ["a mouse click", (user, button) => user.click(button)],
    ["a touch tap", (user, button) => user.pointer([{ keys: "[TouchA]", target: button }])],
  ];

  it.each(ACTS)("stays open after %s", async (_name, act) => {
    const user = userEvent.setup();
    renderTip();
    await act(user, screen.getByRole("button", { name: "Penjelasan Penanda" }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  // WCAG 1.4.13 hoverable: moving the pointer from the icon onto the text keeps it open.
  it("stays open when the pointer moves onto the tooltip text", async () => {
    const user = userEvent.setup();
    renderTip();
    await user.hover(screen.getByRole("button", { name: "Penjelasan Penanda" }));
    await user.hover(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  // Leaving the icon and its text together still closes it.
  it("closes when the pointer leaves the icon and its text", async () => {
    const user = userEvent.setup();
    renderTip();
    await user.hover(screen.getByRole("button", { name: "Penjelasan Penanda" }));
    await user.unhover(screen.getByRole("tooltip"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
