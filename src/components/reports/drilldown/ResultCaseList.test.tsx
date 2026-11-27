import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { forgetResultCases } from "@/hooks/useReportDrilldown";
import { ApiError } from "@/lib/apiClient";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import { HIDDEN_DRILLDOWN } from "@/lib/reports/drilldownRules";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { caseScore, firstReport, reportResult, reportSession, resultCases } from "@/test/reportFixtures";
import type { SortState } from "@/lib/ui/tableModel";
import type { ReportDetail } from "@/types/reports";

import { ResultCaseList } from "./ResultCaseList";

// The last loaded case list is remembered for the case detail (SCRUM-378); every test starts without it.
afterEach(forgetResultCases);

function fakeGateway(cases: DrilldownGateway["cases"]): DrilldownGateway {
  return { cases, caseDetail: vi.fn(), evidence: vi.fn(), evidenceFile: vi.fn() };
}

/** The report the number belongs to; by default it never answers, like a slow network. */
function fakeReports(detail: ReportsGateway["detail"] = vi.fn().mockReturnValue(new Promise(() => {}))): ReportsGateway {
  return { detail, list: vi.fn(), pdf: vi.fn(), eligibleSessions: vi.fn(), create: vi.fn(), validate: vi.fn() };
}

function renderList(
  cases: DrilldownGateway["cases"],
  reports: ReportsGateway = fakeReports(),
  sort: SortState | null = null,
  onSortChange?: (sort: SortState) => void,
) {
  render(
    <ResultCaseList
      reportId="r-1"
      resultId="res-1"
      sort={sort}
      onSortChange={onSortChange}
      gateway={fakeGateway(cases)}
      reportsGateway={reports}
    />,
  );
}

/**
 * The row of one case: DataTable cells are all plain cells, so the row is found by its case code (the first
 * match; an open case repeats the code inside its "Buka jawaban" link name).
 */
function rowOf(code: string) {
  return screen.getAllByText(code)[0].closest("tr") as HTMLElement;
}

/** Report r-1 with AiYU (res-1, the number opened) and DeepSeek (res-2) on test cases, plus dev-only numbers. */
function reportWithTwoProducts(): ReportDetail {
  return firstReport({
    id: "r-1",
    title: "Perbandingan November",
    sessions: [
      reportSession({ product_label: "AiYU", results: [reportResult({ id: "res-1" })] }),
      reportSession({
        product_label: "DeepSeek",
        results: [reportResult({ id: "res-2", rank: 2 }), reportResult({ id: "res-9", score_split: "dev" })],
      }),
      // Edge: a product with only a dev number has nothing to switch to from a test number.
      reportSession({ product_label: "Gemini", results: [reportResult({ id: "res-7", score_split: "dev" })] }),
    ],
  });
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

  // Edge (review #104): the two report links in the trail have different names, so a screen reader can tell them apart.
  it("names the report itself differently from the reports menu", () => {
    renderList(vi.fn().mockReturnValue(new Promise(() => {})));

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports");
    expect(within(breadcrumb).getByRole("link", { name: "Detail laporan" })).toHaveAttribute("href", "/reports/comparisons/r-1");
  });

  // Positive: case code, version, split and both scores per case; the header names the number it came from.
  it("lists the cases behind the number with their version and scores", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    // Review #125: the table keeps the name it had before DataTable (sr-only caption).
    await screen.findByRole("table", { name: "Kasus di balik angka AiYU" });
    expect(screen.getByRole("heading", { level: 1, name: "Kasus di balik angka AiYU" })).toBeInTheDocument();
    expect(screen.getByText("Kasus test · Manual · Rubrik v3 · 2 kasus")).toBeInTheDocument();
    // SCRUM-346 A2 (finding N6): the "Isi kasus: Dapat dibuka" column became an action that opens the answer.
    expect(within(rowOf("ILB-001")).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "ILB-001",
      "v2",
      "Test",
      "0,80",
      "0,75",
      "Buka jawaban ILB-001 ›",
    ]);
  });

  // Positive and negative: only cases the server marks content_visible link to their content (AC3).
  it("links only the cases this role may open, and explains how to ask for the rest", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    expect(await screen.findByRole("link", { name: "ILB-001" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-1",
    );
    expect(screen.getByRole("link", { name: "Buka jawaban ILB-001" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-1",
    );
    expect(screen.queryByRole("link", { name: "ILB-002" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buka jawaban ILB-002" })).not.toBeInTheDocument();
    expect(within(rowOf("ILB-002")).getAllByRole("cell").at(-1)).toHaveTextContent("Tertutup");
    expect(screen.getByRole("note")).toHaveTextContent("indolegalbench@veritask.ai");
  });

  // Negative (review #104): Developer AI opens dev cases but not test cases, so the note must not name the roles
  // that may open them; it follows the server's CASE_CONTENT_FORBIDDEN message.
  it("explains closed cases without naming which roles may open them", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Isi kasus yang tertutup tidak dapat dibuka dengan peran Anda.");
    expect(note).not.toHaveTextContent(/Admin|Kontributor/);
  });

  // Edge: an empty score reads as a dash, not 0 (D1).
  it("shows an empty score as a dash", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()));

    await screen.findByRole("table");
    expect(within(rowOf("ILB-002")).getAllByRole("cell")[3]).toHaveTextContent("–");
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

  // SCRUM-346 A2 / AC4: the platform's one sort and paging pattern (DataTable from SCRUM-343), so the list stays
  // usable once PBI-4 migrates the old cases.
  it("sorts by a score and pages long lists", async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      caseScore({ case_id: `c-${index}`, case_code: `ILB-${String(index + 1).padStart(3, "0")}`, det_score: `0.${index + 10}` }),
    );
    renderList(vi.fn().mockResolvedValue(resultCases({ cases: many })));

    await screen.findByRole("table");
    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skor deterministik" }));
    fireEvent.click(screen.getByRole("button", { name: "Skor deterministik" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("ILB-012");
    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();
  });

  // SCRUM-346 A2 (finding N4): the trail names the report, so the reader knows which report the number is from.
  it("names the report in the trail once it is loaded", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()), fakeReports(vi.fn().mockResolvedValue(reportWithTwoProducts())));

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(await within(breadcrumb).findByRole("link", { name: "Perbandingan November" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1",
    );
  });

  // SCRUM-346 A2: switch to the same number of another product without going back to the report. Only numbers of
  // the same score split are offered; the one on screen is marked as the current page.
  it("offers the same number of the other products in the report", async () => {
    renderList(vi.fn().mockResolvedValue(resultCases()), fakeReports(vi.fn().mockResolvedValue(reportWithTwoProducts())));

    const products = await screen.findByRole("navigation", { name: "Produk di laporan ini" });
    const links = within(products).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("aria-current")])).toEqual([
      ["AiYU", "/reports/comparisons/r-1/results/res-1", "page"],
      ["DeepSeek", "/reports/comparisons/r-1/results/res-2", null],
    ]);
  });

  // Negative: the report is only context; if it fails or has one product, the list still works without it.
  it.each([
    ["fails", () => vi.fn().mockRejectedValue(new ApiError(500, "ANY"))],
    [
      "has one product",
      () =>
        vi.fn().mockResolvedValue(
          firstReport({ sessions: [reportSession({ product_label: "AiYU", results: [reportResult({ id: "res-1" })] })] }),
        ),
    ],
  ])("keeps the list and the plain trail when the report %s", async (_case, makeDetail) => {
    const detail = makeDetail();
    renderList(vi.fn().mockResolvedValue(resultCases()), fakeReports(detail));

    await screen.findByRole("table");
    expect(detail).toHaveBeenCalledWith("r-1");
    expect(screen.queryByRole("navigation", { name: "Produk di laporan ini" })).toBeNull();
  });

  // Positif, SCRUM-378: the sort picked here reaches the page, and every link carries it, so "Kasus berikutnya" and
  // the other products follow the same order.
  it("hands the picked sort to the page and keeps the sort from the address in its links", async () => {
    const onSortChange = vi.fn();
    const sort = { key: "llm_score", direction: "desc" } as const;
    renderList(vi.fn().mockResolvedValue(resultCases()), fakeReports(vi.fn().mockResolvedValue(reportWithTwoProducts())), sort, onSortChange);

    const products = await screen.findByRole("navigation", { name: "Produk di laporan ini" });
    expect(within(products).getByRole("link", { name: "DeepSeek" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-2?urut=llm_score-desc",
    );
    expect(screen.getByRole("link", { name: /Buka jawaban/ })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-1?urut=llm_score-desc",
    );
    fireEvent.click(within(screen.getByRole("columnheader", { name: /Kode kasus/ })).getByRole("button"));
    expect(onSortChange).toHaveBeenCalledWith({ key: "case_code", direction: "asc" });
  });
});
