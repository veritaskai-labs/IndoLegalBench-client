import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CaseTabs } from "./CaseTabs";

describe("CaseTabs", () => {
  // Positive
  it("marks only the active tab as selected", () => {
    // Arrange / Act
    render(<CaseTabs active="history" onChange={vi.fn()} />);

    // Assert
    expect(screen.getByRole("tab", { name: "Riwayat versi" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Editor" })).toHaveAttribute("aria-selected", "false");
  });

  it("reports the tab the user clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CaseTabs active="editor" onChange={onChange} />);

    // Act
    await user.click(screen.getByRole("tab", { name: "Riwayat versi" }));

    // Assert
    expect(onChange).toHaveBeenCalledWith("history");
  });

  it("points each tab at its panel for screen readers", () => {
    // Arrange / Act
    render(<CaseTabs active="editor" onChange={vi.fn()} />);

    // Assert
    expect(screen.getByRole("tab", { name: "Editor" })).toHaveAttribute("aria-controls", "case-panel-editor");
    expect(screen.getByRole("tab", { name: "Riwayat versi" })).toHaveAttribute("aria-controls", "case-panel-history");
  });

  // Edge: clicking the tab that is already open still reports it, the page decides what to do.
  it("reports a click on the active tab as well", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CaseTabs active="editor" onChange={onChange} />);

    // Act
    await user.click(screen.getByRole("tab", { name: "Editor" }));

    // Assert
    expect(onChange).toHaveBeenCalledWith("editor");
  });
});
