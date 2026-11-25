import { fireEvent, render, screen } from "@testing-library/react";
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

  // A click (touch screens have no hover) toggles it, and Escape closes it without moving focus.
  it("toggles on click and closes on Escape", () => {
    renderTip();
    const button = screen.getByRole("button", { name: "Penjelasan Penanda" });
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(button);
    fireEvent.click(button);
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
});
