import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuiteCaseNav } from "./SuiteCaseNav";

describe("SuiteCaseNav", () => {
  // Positive: the CSV import is reachable from "Suite dan kasus" (SCRUM-340 entry point).
  it("links the suites, the case list and the CSV import", () => {
    // Arrange / Act
    render(<SuiteCaseNav current="/suites" />);

    // Assert
    const nav = screen.getByRole("navigation", { name: "Suite dan kasus" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Daftar suite" })).toHaveAttribute("href", "/suites");
    expect(screen.getByRole("link", { name: "Daftar kasus" })).toHaveAttribute("href", "/cases");
    expect(screen.getByRole("link", { name: "Impor CSV" })).toHaveAttribute("href", "/cases/import");
  });

  // Positive / edge: only the current tab is marked.
  it.each([
    ["/suites", "Daftar suite"],
    ["/cases", "Daftar kasus"],
    ["/cases/import", "Impor CSV"],
  ] as const)("marks %s as the current page", (current, name) => {
    // Arrange / Act
    render(<SuiteCaseNav current={current} />);

    // Assert
    const others = screen.getAllByRole("link").filter((link) => link.textContent !== name);
    expect(screen.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    expect(others).toHaveLength(2);
    for (const link of others) expect(link).not.toHaveAttribute("aria-current");
  });
});
