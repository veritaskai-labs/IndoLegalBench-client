import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { trendPoint } from "@/test/trendFixtures";

import { TrendTable } from "./TrendTable";

describe("TrendTable", () => {
  // Positive
  it("lists each month with its session, score and shared case count, in Indonesian number format", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-09-01", label: "Sesi September", value: "0.80", case_count: 40 }),
      trendPoint({ month: "2026-10-01", label: "Sesi Oktober", value: "0.85", case_count: 38 }),
    ];

    // Act
    render(<TrendTable points={points} caption="Skor total per bulan" />);

    // Assert
    expect(screen.getByRole("table", { name: "Skor total per bulan" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent);
    expect(first.slice(0, 4)).toEqual(["Sep 2026", "Sesi September", "0,80", "40"]);
    expect(within(rows[1]).getByText("0,85")).toBeInTheDocument();
  });

  // Positive
  it("writes the break reasons and markers of a month in plain language (AC5)", () => {
    // Arrange
    const points = [
      trendPoint({ month: "2026-10-01", breaks: ["RUBRIC_VERSION"], markers: ["REPETITIONS_DIFFER"] }),
    ];

    // Act
    render(<TrendTable points={points} caption="Skor total per bulan" />);

    // Assert
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("Versi rubrik penilaian berbeda")).toBeInTheDocument();
    expect(within(row).getByText("Jumlah percobaan berbeda")).toBeInTheDocument();
  });

  // Negative
  it("shows a dash for a month without a score instead of 0", () => {
    // Arrange
    const points = [trendPoint({ month: "2026-10-01", value: null, case_count: 0 })];

    // Act
    render(<TrendTable points={points} caption="Skor total per bulan" />);

    // Assert
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("–");
    expect(cells[2]).not.toHaveTextContent("0,00");
  });

  // Edge case
  it("leaves the notes cell as a dash for a connected, unmarked month", () => {
    // Arrange / Act
    render(<TrendTable points={[trendPoint()]} caption="Skor total per bulan" />);

    // Assert
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[4]).toHaveTextContent("–");
  });
});
