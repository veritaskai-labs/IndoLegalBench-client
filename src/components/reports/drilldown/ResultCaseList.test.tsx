import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import { HIDDEN_DRILLDOWN } from "@/lib/reports/drilldownRules";
import { caseScore, resultCases } from "@/test/reportFixtures";

import { ResultCaseList } from "./ResultCaseList";

function fakeGateway(cases: DrilldownGateway["cases"]): DrilldownGateway {
  return { cases, caseDetail: vi.fn(), evidence: vi.fn(), evidenceFile: vi.fn() };
}

function renderList(cases: DrilldownGateway["cases"]) {
  render(<ResultCaseList reportId="r-1" resultId="res-1" gateway={fakeGateway(cases)} />);
}

// SCRUM-328 (PBI-16 AC1, D6 steps 1–3): one report number opens to its basis cases, versions and scores.
describe("ResultCaseList", () => {
  it("sits under the report it came from and waits for the cases", () => {
    renderList(vi.fn().mockReturnValue(new Promise(() => {})));

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/reports",
      "/reports/comparisons",
      "/reports/comparisons/r-1",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat kasus…");
  });

  // Positive: case code, version, split and both scores per case; the header names the number it came from.
  it("lists the cases behind the number with their version and scores", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    const table = await screen.findByRole("table", { name: "Kasus di balik angka AiYU" });
    expect(screen.getByRole("heading", { level: 1, name: "Kasus di balik angka AiYU" })).toBeInTheDocument();
    expect(screen.getByText("Kasus test · Manual · Rubrik v3 · 2 kasus")).toBeInTheDocument();
    const first = within(table).getByRole("rowheader", { name: "ILB-001" }).closest("tr") as HTMLElement;
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "v2",
      "Test",
      "0,80",
      "0,75",
      "Dapat dibuka",
    ]);
  });

  // Positive and negative: only cases the server marks content_visible link to their content (AC3).
  it("links only the cases this role may open, and explains how to ask for the rest", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    expect(await screen.findByRole("link", { name: "ILB-001" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-1",
    );
    expect(screen.queryByRole("link", { name: "ILB-002" })).not.toBeInTheDocument();
    expect(screen.getByText("Tertutup")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("indolegalbench@veritask.ai");
  });

  // Edge: an empty score reads as a dash, not 0 (D1).
  it("shows an empty score as a dash", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    const row = (await screen.findByRole("rowheader", { name: "ILB-002" })).closest("tr") as HTMLElement;
    expect(within(row).getAllByRole("cell")[2]).toHaveTextContent("–");
  });

  // Edge: no contact note when every case can be opened.
  it("leaves out the contact note when every case is open", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases({ cases: [caseScore()] })));

    await screen.findByRole("table");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("shows an empty state when no case forms the number", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases({ cases: [] })));

    expect(await screen.findByText("Tidak ada kasus di balik angka ini")).toBeInTheDocument();
  });

  // Negative: someone else's report reads like a missing one, and retrying cannot help (D9).
  it("offers no retry for a hidden number", async () => {
    renderList(vi.fn().mockRejectedValue(new ApiError(404, "REPORT_RESULT_NOT_FOUND")));

    expect(await screen.findByText(HIDDEN_DRILLDOWN)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
  });

  it("offers a retry when the server fails", async () => {
    const cases = vi.fn().mockRejectedValueOnce(new ApiError(500, "ANY")).mockResolvedValueOnce(resultCases());
    renderList(cases);

    (await screen.findByRole("button", { name: "Coba lagi" })).click();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(cases).toHaveBeenCalledTimes(2);
  });
});
