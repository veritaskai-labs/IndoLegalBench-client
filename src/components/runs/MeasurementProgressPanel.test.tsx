import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MeasurementProgress } from "@/types/measurement";
import { MeasurementProgressPanel } from "./MeasurementProgressPanel";

function progress(overrides: Partial<MeasurementProgress> = {}): MeasurementProgress {
  return {
    completed_calls: 240,
    total_calls: 300,
    percent_complete: "80.0",
    failed_calls: 12,
    percent_failed: "5.0",
    remaining_seconds: 300,
    running_cost_idr: "120000.00",
    remaining_budget_idr: "380000.00",
    started_at: "2026-11-04T03:00:00Z",
    updated_at: "2026-11-04T03:40:00Z",
    completed_cases: 7,
    total_cases: 20,
    percent_cases_complete: 35,
    ...overrides,
  };
}

describe("MeasurementProgressPanel (PBI-12 AC5)", () => {
  // K3: two units in one panel, so each number carries its label and denominator.
  it("labels the cases done with the denominator and a whole percentage (SCRUM-266 K3)", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("Kasus selesai")).toBeInTheDocument();
    expect(screen.getByText("7 dari 20 (35%)")).toBeInTheDocument();
  });

  it("draws the bar from the same case percentage so a screen reader reads it too", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByRole("progressbar", { name: "Persen kasus selesai" })).toHaveAttribute("value", "35");
  });

  // The call count is not dropped, only moved from the title to the facts.
  it("keeps the calls done out of the total as a fact", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("Panggilan selesai")).toBeInTheDocument();
    expect(screen.getByText("240 dari 300")).toBeInTheDocument();
  });

  it("shows 0% with an empty bar before any case is done", () => {
    render(<MeasurementProgressPanel progress={progress({ completed_cases: 0, percent_cases_complete: 0 })} />);

    expect(screen.getByText("0 dari 20 (0%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  it("shows 100% with a full bar once every case is done", () => {
    render(<MeasurementProgressPanel progress={progress({ completed_cases: 20, percent_cases_complete: 100 })} />);

    expect(screen.getByText("20 dari 20 (100%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
  });

  // A queued session has no snapshot yet, so there are no cases and no calls.
  it("says there are no cases yet instead of 0 dari 0", () => {
    render(
      <MeasurementProgressPanel
        progress={progress({ completed_cases: 0, total_cases: 0, percent_cases_complete: 0, completed_calls: 0, total_calls: 0 })}
      />,
    );

    expect(screen.getByText("Belum ada kasus")).toBeInTheDocument();
    expect(screen.getByText("Belum ada panggilan")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  it("keeps the bar inside 0-100 if the server sends a broken percentage", () => {
    render(<MeasurementProgressPanel progress={progress({ percent_cases_complete: 140 })} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
    expect(screen.getByText("7 dari 20 (100%)")).toBeInTheDocument();
  });

  // K3: failures stay per call (AC4 counts every attempt) and say out of how many completed calls.
  it("labels the failed calls with their denominator and percentage", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("Panggilan gagal")).toBeInTheDocument();
    expect(screen.getByText("12 dari 240 (5,0%)")).toBeInTheDocument();
  });

  it("shows the estimated time left in words", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("sekitar 5 menit")).toBeInTheDocument();
  });

  it("shows the running cost against the budget left this month", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("Rp 120.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 380.000")).toBeInTheDocument();
  });

  // The server stops an automatic measurement once the cost reaches the product budget.
  it("warns when there is no budget left", () => {
    render(<MeasurementProgressPanel progress={progress({ remaining_budget_idr: "0.00" })} />);

    expect(screen.getByText(/anggaran bulan ini sudah habis/i)).toBeInTheDocument();
  });

  it("says a queued session has not started", () => {
    render(<MeasurementProgressPanel progress={progress({ started_at: null })} />);

    expect(screen.getByText("Belum mulai")).toBeInTheDocument();
  });
});