import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { devTestReport, firstReport } from "@/test/reportFixtures";

import { ReportDocument } from "./ReportDocument";

// SCRUM-322: the report body as the PDF lays it out (pdf.py render): logo and title, info line, dev banner,
// one section per score split with its table and bar chart, case versions and the contact line. It speaks the
// report's language (Fase 0 K3) and says so with a lang attribute for screen readers (WCAG 3.1.2).
describe("ReportDocument", () => {
  it.each([
    ["en", firstReport()],
    ["id", devTestReport()],
  ] as const)("marks the whole body with lang=%s", (language, report) => {
    render(<ReportDocument report={report} />);
    expect(screen.getByRole("article")).toHaveAttribute("lang", language);
  });

  // The title is typed by a person, so an English report keeps its Indonesian title (PBI-26 AC3).
  it("shows the logo, the title as typed and the PDF info line", () => {
    render(<ReportDocument report={firstReport()} />);
    const body = screen.getByRole("article");
    // AC8: the official Veritask logo, the same asset the server PDF uses.
    expect(within(body).getByRole("img", { name: "Veritask" })).toHaveAttribute(
      "src",
      expect.stringContaining("veritask-logo.png"),
    );
    expect(within(body).getByRole("heading", { level: 1, name: "Perbandingan 5 produk, Oktober 2026" })).toBeInTheDocument();
    expect(
      within(body).getByText(
        "Created 19 November 2026 · Rubric v3 · Judge model: model-penilai-a · Cases used for comparison: 42",
      ),
    ).toBeInTheDocument();
  });

  it("hides the model versions of a code-mode report", () => {
    render(<ReportDocument report={firstReport({ product_label_mode: "code", language: "id" })} />);
    expect(screen.getAllByText("Disamarkan")).toHaveLength(firstReport().sessions.length);
  });

  // AC7 / D9: a test report, as Viewer and Kontributor receive it, has no dev banner and one section.
  it("shows one Test cases section without a dev banner for a test report", () => {
    render(<ReportDocument report={firstReport()} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Test cases"]);
    expect(screen.getByRole("table", { name: "Test cases" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("shows the dev banner and three sections for a Dev + Test report", () => {
    render(<ReportDocument report={devTestReport()} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Laporan berisi skor dev, hanya untuk internal dan tidak dapat diterbitkan.",
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Kasus test",
      "Kasus dev",
      "Gabungan dev + test",
    ]);
    expect(screen.getAllByRole("table")).toHaveLength(3);
  });

  // Edge: like the PDF, a report with no result rows says so instead of drawing empty tables.
  it("says the report has no results when no section has rows", () => {
    render(<ReportDocument report={firstReport({ sessions: [] })} />);
    expect(screen.getByText("This report has no results.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lists the case versions behind the numbers, folded by default", () => {
    render(<ReportDocument report={firstReport()} />);
    const summary = screen.getByText("Case versions (42)");
    const details = summary.closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("ILB-001 v1, ILB-002 v1, ILB-003 v1, ILB-004 v2");
  });

  it("leaves out the case versions when the report lists none", () => {
    render(<ReportDocument report={firstReport({ case_basis: [] })} />);
    expect(screen.queryByText(/Case versions/)).toBeNull();
  });

  // PBI-16 AC3-4: readers who cannot open case contents are told where to ask.
  it.each([
    [firstReport(), "To get the case contents, email indolegalbench@veritask.ai."],
    [devTestReport(), "Untuk mendapatkan isi kasus, kirim email ke indolegalbench@veritask.ai."],
  ])("ends with the contact line in the report's language", (report, line) => {
    render(<ReportDocument report={report} />);
    expect(screen.getByText(line)).toBeInTheDocument();
  });
});
