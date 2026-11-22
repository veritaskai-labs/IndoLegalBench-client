import { describe, expect, it } from "vitest";

import { trendPoint } from "@/test/trendFixtures";

import { buildPlot, monthLabel, type PlotSize } from "./trendChart";

// Inner area is 530 wide (x from 50 to 580) and 240 high (y from 20 to 260).
const SIZE: PlotSize = { width: 600, height: 300, padding: { top: 20, right: 20, bottom: 40, left: 50 } };

describe("buildPlot positions", () => {
  // Positive
  it("puts the first month at the left edge and the last at the right edge", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-09-01" }), trendPoint({ month: "2026-10-01" })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.points.map((p) => p.x)).toEqual([50, 580]);
  });

  // Positive
  it("spaces points by calendar month, so a month without a session leaves a visible gap (AC4)", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-09-01" }),
      trendPoint({ month: "2026-11-01" }),
      trendPoint({ month: "2026-12-01" }),
    ];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.points.map((p) => Math.round(p.x))).toEqual([50, 403, 580]);
  });

  // Positive
  it("keeps the spacing across a year boundary", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-12-01" }), trendPoint({ month: "2027-01-01" })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.points.map((p) => p.x)).toEqual([50, 580]);
  });

  // Edge case
  it("centres a single point instead of dividing by zero", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-09-01", value: "0.50" })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.points[0].x).toBe(315);
    expect(plot.segments).toEqual([]);
  });

  // Edge case
  it("returns an empty plot with the axis for a product with no points", () => {
    // Arrange / Act
    const plot = buildPlot([], SIZE);

    // Assert
    expect(plot.points).toEqual([]);
    expect(plot.segments).toEqual([]);
    expect(plot.yTicks).toHaveLength(5);
  });
});

describe("buildPlot scale", () => {
  // Positive
  it("maps 0 to the bottom, 1 to the top and the rest in between", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-09-01", value: "0.00" }),
      trendPoint({ month: "2026-10-01", value: "0.50" }),
      trendPoint({ month: "2026-11-01", value: "1.00" }),
    ];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.scale).toBe(1);
    expect(plot.points.map((p) => p.y)).toEqual([260, 140, 20]);
  });

  // Positive
  it("draws five axis labels from 0 at the bottom up to the scale at the top", () => {
    // Arrange / Act
    const plot = buildPlot([trendPoint()], SIZE);

    // Assert
    expect(plot.yTicks.map((t) => t.label)).toEqual(["0.00", "0.25", "0.50", "0.75", "1.00"]);
    expect(plot.yTicks[0].y).toBe(260);
    expect(plot.yTicks[4].y).toBe(20);
  });

  // Edge case
  it("stretches the axis when the server sends a score above 1, as the bar chart does", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-09-01", value: "1.50" })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.scale).toBe(1.5);
    expect(plot.points[0].y).toBe(20);
    expect(plot.yTicks[4].label).toBe("1.50");
  });
});

describe("buildPlot points without a score (AC11)", () => {
  // Negative
  it("gives a point with no score no height, instead of drawing it as 0", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-09-01", value: null })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.points[0].y).toBeNull();
  });

  // Edge case
  it("treats a score that is not a plain decimal as missing", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-09-01", value: "abc" })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.points[0].y).toBeNull();
  });
});

describe("buildPlot segments (AC5)", () => {
  // Positive
  it("joins connected points with a solid line", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-09-01" }), trendPoint({ month: "2026-10-01" })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.segments).toHaveLength(1);
    expect(plot.segments[0].dashed).toBe(false);
    expect(plot.segments[0].from).toBe(plot.points[0]);
    expect(plot.segments[0].to).toBe(plot.points[1]);
  });

  // Positive
  it("draws the line into a point that has a break reason as dashed, and goes solid again after it", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-09-01" }),
      trendPoint({ month: "2026-10-01", breaks: ["RUBRIC_VERSION"] }),
      trendPoint({ month: "2026-11-01" }),
    ];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.segments.map((s) => s.dashed)).toEqual([true, false]);
  });

  // Negative
  it("does not join across a point that has no score", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-09-01", value: "0.80" }),
      trendPoint({ month: "2026-10-01", value: null }),
      trendPoint({ month: "2026-11-01", value: "0.90" }),
    ];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.segments).toEqual([]);
  });

  // Negative
  it("draws no line at all when no point has a score", () => {
    // Arrange
    const points = [trendPoint({ value: null }), trendPoint({ month: "2026-10-01", value: null })];

    // Act
    const plot = buildPlot(points, SIZE);

    // Assert
    expect(plot.segments).toEqual([]);
  });
});

describe("monthLabel", () => {
  // Positive
  it.each([
    ["2026-01-01", "Jan 2026"],
    ["2026-09-01", "Sep 2026"],
    ["2026-12-01", "Des 2026"],
  ])("writes %s as a short Indonesian month and year", (month, label) => {
    expect(monthLabel(month)).toBe(label);
  });
});
