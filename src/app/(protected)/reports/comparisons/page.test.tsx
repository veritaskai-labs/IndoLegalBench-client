import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpReportsGateway } from "@/lib/reports/reportsApi";

import SavedReportsPage, { metadata } from "./page";

// reportsApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/reports/reportsApi", () => ({
  httpReportsGateway: { list: vi.fn(), detail: vi.fn(), pdf: vi.fn() },
}));

const list = vi.mocked(httpReportsGateway.list);

beforeEach(() => {
  list.mockReset();
  list.mockResolvedValue([]);
});

// SCRUM-322 (D3 step 10): the saved-report list has its own address, /reports/comparisons (Fase 0 K9).
describe("SavedReportsPage", () => {
  it("names the browser tab after the page", () => {
    expect(metadata.title).toBe("Laporan perbandingan | IndoLegalBench");
  });

  it("shows the saved-report list read from the server", async () => {
    render(<SavedReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Laporan perbandingan" })).toBeInTheDocument();
    expect(await screen.findByText("Belum ada laporan tersimpan")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
  });
});
