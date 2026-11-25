import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { trendPoint } from "@/test/trendFixtures";

import { TrendChart } from "./TrendChart";

function drawn(container: HTMLElement) {
  return {
    segments: [...container.querySelectorAll("line[data-segment]")],
    points: [...container.querySelectorAll("circle[data-point]")],
    breaks: [...container.querySelectorAll("[data-break='true']")],
    markers: [...container.querySelectorAll("[data-marker]")],
  };
}

const THREE = [
  trendPoint({ month: "2026-09-01", value: "0.80" }),
  trendPoint({ month: "2026-10-01", value: "0.85", breaks: ["RUBRIC_VERSION"] }),
  trendPoint({ month: "2026-11-01", value: "0.90", markers: ["REPETITIONS_DIFFER"] }),
];

describe("TrendChart", () => {
  // Positive
  it("draws one point per month with a score and one line between each connected pair (AC3)", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={THREE} metric="total" />);

    // Assert
    const { segments, points } = drawn(container);
    expect(points).toHaveLength(3);
    expect(segments).toHaveLength(2);
  });

  // Positive
  it("draws the line into a point with a break reason dashed and the others solid (AC5)", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={THREE} metric="total" />);

    // Assert
    const { segments } = drawn(container);
    expect(segments.map((s) => s.getAttribute("data-dashed"))).toEqual(["true", "false"]);
    expect(segments[0]).toHaveAttribute("stroke-dasharray");
    expect(segments[1]).not.toHaveAttribute("stroke-dasharray");
  });

  // Positive
  it("marks the point that has a break and the point that has a marker (AC5)", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={THREE} metric="total" />);

    // Assert
    const { breaks, markers } = drawn(container);
    expect(breaks).toHaveLength(1);
    expect(markers).toHaveLength(1);
  });

  // Positive
  it("labels the months and the score axis in Indonesian", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={THREE} metric="total" />);

    // Assert
    const text = container.textContent ?? "";
    expect(text).toContain("Sep 2026");
    expect(text).toContain("Nov 2026");
    expect(text).toContain("0,00");
    expect(text).toContain("1,00");
  });

  // Negative
  it("draws nothing for a month without a score and does not join across it (AC11)", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-09-01", value: "0.80" }),
      trendPoint({ month: "2026-10-01", value: null }),
      trendPoint({ month: "2026-11-01", value: "0.90" }),
    ];

    // Act
    const { container } = render(<TrendChart points={points} metric="llm" />);

    // Assert
    const { segments, points: circles } = drawn(container);
    expect(circles).toHaveLength(2);
    expect(segments).toHaveLength(0);
  });

  // Negative
  it("has no target line: the only lines are the trend segments and the axis grid (AC7)", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={THREE} metric="total" />);

    // Assert
    expect(container.querySelector("[data-target]")).toBeNull();
    expect(container.textContent).not.toMatch(/target|OKR|KR3c/i);
  });

  // Edge case
  it("draws a lone point without any line", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={[THREE[0]]} metric="total" />);

    // Assert
    const { segments, points } = drawn(container);
    expect(points).toHaveLength(1);
    expect(segments).toHaveLength(0);
  });

  // Edge case
  it("is hidden from screen readers, because the table next to it has the same numbers", () => {
    // Arrange / Act
    const { container } = render(<TrendChart points={THREE} metric="total" />);

    // Assert
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
