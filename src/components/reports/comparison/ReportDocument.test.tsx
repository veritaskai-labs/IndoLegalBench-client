import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { devTestReport, firstReport } from "@/test/reportFixtures";

import { ReportDocument } from "./ReportDocument";

// SCRUM-322: the report body as the PDF lays it out (pdf.py render): logo and title, info line, dev banner,
// one section per score split with its table and bar chart, case versions and the contact line. It speaks the
// report's language (Fase 0 K3) and says so with a lang attribute for screen readers (WCAG 3.1.2). SCRUM-363 took
// the language out of the detail, so the body is English like every report the builder makes, unless told.
describe("ReportDocument", () => {
  // Positive (SCRUM-346 N7, PO 25 Nov): Indonesian by default, the language the builder now gives every new report.
  it("is Indonesian when no language is given", () => {
    render(<ReportDocument report={firstReport()} />);
    expect(screen.getByRole("article")).toHaveAttribute("lang", "id");
  });

  // Edge: an English report (made before the switch, or the preview) still reads fully in English.
  it("still speaks English when told", () => {
    render(<ReportDocument report={firstReport()} language="en" />);
    expect(screen.getByRole("article")).toHaveAttribute("lang", "en");
  });

  // Positive: the language stays a parameter, ready for PBI-26.
  it("speaks the language it is given", () => {
    render(<ReportDocument report={devTestReport()} language="id" />);
    expect(screen.getByRole("article")).toHaveAttribute("lang", "id");
  });

  // The title is typed by a person, so an English report keeps its Indonesian title (PBI-26 AC3).
  it("shows the logo, the title as typed and the PDF info line", () => {
    render(<ReportDocument report={firstReport()} language="en" />);
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
    render(<ReportDocument report={firstReport({ product_label_mode: "code" })} language="id" />);
    expect(screen.getAllByText("Disamarkan")).toHaveLength(firstReport().sessions.length);
  });

  // AC7 / D9: a test report, as Viewer and Kontributor receive it, has no dev banner and one section.
  it("shows one Test cases section without a dev banner for a test report", () => {
    render(<ReportDocument report={firstReport()} language="en" />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Test cases"]);
    expect(screen.getByRole("table", { name: "Test cases" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("shows the dev banner and three sections for a Dev + Test report", () => {
    render(<ReportDocument report={devTestReport()} language="id" />);
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
    expect(screen.getByText("Tidak ada hasil untuk laporan ini.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lists the case versions behind the numbers, folded by default", () => {
    render(<ReportDocument report={firstReport()} />);
    const summary = screen.getByText("Versi kasus (42)");
    const details = summary.closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("ILB-001 v1, ILB-002 v1, ILB-003 v1, ILB-004 v2");
  });

  it("leaves out the case versions when the report lists none", () => {
    render(<ReportDocument report={firstReport({ case_basis: [] })} />);
    expect(screen.queryByText(/Versi kasus/)).toBeNull();
  });

  // PBI-16 AC3-4: readers who cannot open case contents are told where to ask.
  it.each([
    ["en", "To get the case contents, email indolegalbench@veritask.ai."],
    ["id", "Untuk mendapatkan isi kasus, kirim email ke indolegalbench@veritask.ai."],
  ] as const)("ends with the contact line in the report's language (%s)", (language, line) => {
    render(<ReportDocument report={devTestReport()} language={language} />);
    expect(screen.getByText(line)).toBeInTheDocument();
  });

  // SCRUM-346 A5 (PO kept it on 25 Nov): a folded "how to read this report" panel next to the title, with the same
  // explanations as the column info buttons plus the dev and test rule (PBI-15), which has no column of its own.
  it("offers a folded guide to reading the report", () => {
    render(<ReportDocument report={firstReport()} />);
    const summary = screen.getByText("Cara membaca laporan ini");
    const details = summary.closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    expect([...details.querySelectorAll("dt")].map((term) => term.textContent)).toEqual([
      "Peringkat",
      "Skor deterministik",
      "Skor penilai LLM",
      "Kasus dinilai",
      "Tingkat kegagalan",
      "Penanda",
      "Skor dev dan test",
    ]);
  });

  // SCRUM-346 A6: each section opens with its highlight cards and ends with one sorted chart per score.
  it("puts highlight cards and per-score charts in every section", () => {
    const { container } = render(<ReportDocument report={devTestReport()} />);
    expect(screen.getByRole("list", { name: "Sorotan Kasus test" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Sorotan Kasus dev" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-chart]")).toHaveLength(6);
  });
});
