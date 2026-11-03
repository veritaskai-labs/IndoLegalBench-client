import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeasurementSummaryCard } from "./MeasurementSummaryCard";
import type { SummaryResponse } from "@/types/measurement";

describe("MeasurementSummaryCard", () => {
  const mockSummary: SummaryResponse = {
    case_count: 20,
    total_calls: 60,
    case_filter: "both",
    repeat_count: 3,
    estimated_cost_idr: "120000.00",
    remaining_budget_idr: "500000.00",
  };

  it("renders empty state placeholder when no summary is provided", () => {
    render(<MeasurementSummaryCard summary={null} />);
    expect(screen.getByTestId("summary-empty")).toBeInTheDocument();
    expect(
      screen.getByText(/Pilih suite dan produk AI, lalu tinjau ringkasan/i),
    ).toBeInTheDocument();
  });

  it("renders loading indicator when isLoading is true", () => {
    render(<MeasurementSummaryCard summary={null} isLoading={true} />);
    expect(screen.getByTestId("summary-loading")).toBeInTheDocument();
  });

  it("renders summary details correctly when summary is ready", () => {
    render(<MeasurementSummaryCard summary={mockSummary} />);
    expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3x")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("Semua (Dev & Test)")).toBeInTheDocument();
    expect(screen.getByText("Rp 120.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 500.000")).toBeInTheDocument();
  });

  it("renders budget exceeded alert when budgetExceeded is provided", () => {
    render(
      <MeasurementSummaryCard
        summary={null}
        budgetExceeded={{
          productName: "Gemini 1.5 Flash",
          remainingBudgetIdr: "30000.00",
          estimatedCostIdr: "150000.00",
          message: "Perkiraan biaya melebihi sisa anggaran",
        }}
      />,
    );

    expect(screen.getByTestId("summary-budget-exceeded")).toBeInTheDocument();
    expect(screen.getByText(/Anggaran Produk Tidak Mencukupi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Perkiraan biaya melebihi sisa anggaran produk Gemini 1.5 Flash/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Rp 30.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 150.000")).toBeInTheDocument();
  });

  it("renders budget exceeded fallback message when productName is null", () => {
    render(
      <MeasurementSummaryCard
        summary={null}
        budgetExceeded={{
          productName: null,
          remainingBudgetIdr: null,
          estimatedCostIdr: null,
          message: "Anggaran bulanan tidak mencukupi untuk pengukuran ini.",
        }}
      />,
    );

    expect(screen.getByTestId("summary-budget-exceeded")).toBeInTheDocument();
    expect(
      screen.getByText("Anggaran bulanan tidak mencukupi untuk pengukuran ini."),
    ).toBeInTheDocument();
  });

  it("falls back to raw case_filter when not in CASE_FILTER_LABEL", () => {
    const unknownFilterSummary = {
      ...mockSummary,
      case_filter: "unknown_split",
    } as unknown as SummaryResponse;

    render(<MeasurementSummaryCard summary={unknownFilterSummary} />);
    expect(screen.getByText("unknown_split")).toBeInTheDocument();
  });

  it("renders general error message when errorMessage is provided", () => {
    render(
      <MeasurementSummaryCard
        summary={null}
        errorMessage="Tidak ada kasus yang memenuhi syarat."
      />,
    );

    expect(screen.getByTestId("summary-error")).toBeInTheDocument();
    expect(
      screen.getByText("Tidak ada kasus yang memenuhi syarat."),
    ).toBeInTheDocument();
  });
});
