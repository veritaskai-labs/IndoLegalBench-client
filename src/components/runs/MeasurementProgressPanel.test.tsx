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
    ...overrides,
  };
}

describe("MeasurementProgressPanel (PBI-12 AC5)", () => {
  it("shows the calls done out of the total, the way the AC spells it", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("240 dari 300")).toBeInTheDocument();
  });

  it("puts the percentage on the bar so a screen reader reads it too", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "80");
  });

  it("shows the failures as a count and a percentage", () => {
    render(<MeasurementProgressPanel progress={progress()} />);

    expect(screen.getByText("12 gagal (5,0%)")).toBeInTheDocument();
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