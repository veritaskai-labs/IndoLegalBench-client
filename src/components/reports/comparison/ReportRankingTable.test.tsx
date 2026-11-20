import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reportSections } from "@/lib/reports/reportSections";
import { firstReport, reportResult, reportSession } from "@/test/reportFixtures";
import type { ProductLabelMode, ReportLanguage } from "@/types/reports";

import { ReportRankingTable } from "./ReportRankingTable";

function renderTable(
  language: ReportLanguage = "en",
  sessions = firstReport().sessions,
  labelMode: ProductLabelMode = "real_name",
) {
  const [section] = reportSections(sessions);
  render(<ReportRankingTable rows={section.rows} language={language} labelMode={labelMode} caption="Test cases" />);
  return screen.getByRole("table", { name: "Test cases" });
}

function rowOf(table: HTMLElement, product: string) {
  return within(table).getByRole("rowheader", { name: product }).closest("tr") as HTMLElement;
}

// SCRUM-322 (Fase 0 K6): the same eleven columns as the PDF, in the report's language.
describe("ReportRankingTable", () => {
  it("shows the eleven PDF columns in English", () => {
    const table = renderTable("en");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Rank",
      "Product",
      "Type",
      "Deterministic score",
      "LLM judge score",
      "Cases graded",
      "Basis cases",
      "Failure rate",
      "Attempts",
      "Model version",
      "Markers",
    ]);
  });

  it("shows the columns in Indonesian for an Indonesian report", () => {
    const table = renderTable("id");
    expect(within(table).getByRole("columnheader", { name: "Skor penilai LLM" })).toBeInTheDocument();
  });

  it("lists products in rank order with the product as the row header", () => {
    const table = renderTable();
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "AiYU",
      "Gemini",
      "DeepSeek",
      "Justisio",
      "LegalHero",
    ]);
  });

  it("writes one ranked automatic product like the PDF row", () => {
    const cells = within(rowOf(renderTable("en"), "AiYU")).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["1", "Automatic", "0.91", "0.87", "50", "42", "1.20%", "3", "v2.1", ""]);
  });

  // AC9 and K6: a version hidden by code mode reads like the PDF, unlike a version that was never recorded.
  it.each([
    ["en", "Hidden"],
    ["id", "Disamarkan"],
  ] as const)("shows the model version of a code-mode report as hidden in %s", (language, shown) => {
    const session = reportSession({ product_label: "Produk A", results: [reportResult({ product_model_version: null })] });
    const cells = within(rowOf(renderTable(language, [session], "code"), "Produk A")).getAllByRole("cell");
    expect(cells[8]).toHaveTextContent(shown);
  });

  // D1 and K7: no LLM score means no rank; AC2: the failure rate does not apply to a manual product.
  it("writes the manual product without a rank, LLM score or failure rate", () => {
    const cells = within(rowOf(renderTable("en"), "LegalHero")).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual([
      "–",
      "Manual",
      "0.78",
      "–",
      "42",
      "42",
      "Not applicable",
      "1",
      "–",
      "Different number of attempts; Refused to answer (2)",
    ]);
  });

  it("uses the Indonesian number format and labels for an Indonesian report", () => {
    const cells = within(rowOf(renderTable("id"), "Gemini")).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["2", "Otomatis", "0,84", "0,88", "50", "42", "0,00%", "3", "2.5", "Uji Coba"]);
  });

  // Security: names come from the server and from people typing them; React must print them as text.
  it("prints a product name with markup as plain text", () => {
    const sessions = [reportSession({ product_label: "<img src=x onerror=alert(1)>", results: [reportResult()] })];
    const table = renderTable("en", sessions);
    expect(within(table).getByRole("rowheader", { name: "<img src=x onerror=alert(1)>" })).toBeInTheDocument();
    expect(table.querySelector("img")).toBeNull();
  });

  // K6: on a phone the table scrolls sideways inside its own labelled region (a section, Sonar S6819).
  it("wraps the table in a scroll region named after the section", () => {
    renderTable();
    expect(screen.getByRole("region", { name: "Test cases" }).tagName).toBe("SECTION");
  });

  // PBI-16 AC1 (SCRUM-328): every score opens the cases behind it; the link carries the number's result id.
  it("links each score to the cases behind it when a drill-down href is given", () => {
    const session = reportSession({ product_label: "AiYU", results: [reportResult({ id: "res-9" })] });
    const [section] = reportSections([session]);

    render(
      <ReportRankingTable
        rows={section.rows}
        language="en"
        labelMode="real_name"
        caption="Test cases"
        scoreHref={(resultId) => `/drill/${resultId}`}
      />,
    );

    expect(screen.getByRole("link", { name: "Telusuri kasus di balik skor deterministik AiYU" })).toHaveAttribute(
      "href",
      "/drill/res-9",
    );
    expect(screen.getByRole("link", { name: "Telusuri kasus di balik skor penilai LLM AiYU" })).toHaveTextContent("0.87");
  });

  // Edge: a dash is not a number, so an empty score is never a link (D1).
  it("does not link an empty score", () => {
    const session = reportSession({ product_label: "AiYU", results: [reportResult({ llm_score: null, rank: null })] });
    const [section] = reportSections([session]);

    render(
      <ReportRankingTable rows={section.rows} language="en" labelMode="real_name" caption="Test cases" scoreHref={() => "/x"} />,
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  // Negative: without a drill-down href (the development preview), scores stay plain text.
  it("keeps scores as text without a drill-down href", () => {
    renderTable("en");

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
