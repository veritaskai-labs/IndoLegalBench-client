import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("defaults to the gray tone", () => {
    render(<Badge>Draf</Badge>);

    expect(screen.getByText("Draf")).toHaveClass("bg-surface", "text-ink-soft");
  });

  it.each([
    ["blue", "bg-accent-wash", "text-accent-ink"],
    ["amber", "bg-warning-wash", "text-warning-ink"],
    ["green", "bg-success-wash", "text-success-ink"],
  ] as const)("maps the %s tone to its prototype colours", (tone, wash, ink) => {
    render(<Badge tone={tone}>Status</Badge>);

    expect(screen.getByText("Status")).toHaveClass(wash, ink);
  });

  it("shows a decorative dot only when asked", () => {
    const { container, rerender } = render(<Badge>Tanpa titik</Badge>);
    expect(container.querySelector("[data-dot]")).toBeNull();

    rerender(<Badge dot>Dengan titik</Badge>);
    expect(container.querySelector("[data-dot]")).toHaveAttribute("aria-hidden", "true");
  });
});
