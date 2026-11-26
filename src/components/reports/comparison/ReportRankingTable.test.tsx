import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reportSections } from "@/lib/reports/reportSections";
import { firstReport, reportResult, reportSession } from "@/test/reportFixtures";
import type { ProductLabelMode, ReportLanguage } from "@/types/reports";

import { ReportRankingTable, type ScoreHref } from "./ReportRankingTable";

function renderTable(
  language: ReportLanguage = "id",
  sessions = firstReport().sessions,
  labelMode: ProductLabelMode = "real_name",
  scoreHref?: ScoreHref,
) {
  const [section] = reportSections(sessions);
  render(
    <ReportRankingTable
      rows={section.rows}
      language={language}
      labelMode={labelMode}
      caption="Kasus test"
      scoreHref={scoreHref}
    />,
  );
  return screen.getByRole("table", { name: "Kasus test" });
}

/** Column names as shown, without the hidden explanation text of the info buttons. */
function headerLabels(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole("columnheader")
    .map((cell) => cell.querySelector("[data-column-label]")?.textContent ?? "");
}

function rowOf(table: HTMLElement, product: string) {
  return within(table).getByRole("rowheader", { name: new RegExp(`^${product}`) }).closest("tr") as HTMLElement;
}

const cellTexts = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent);

const CORE_ID = [
  "Peringkat",
  "Produk",
  "Skor deterministik",
  "Skor penilai LLM",
  "Kasus dinilai",
  "Tingkat kegagalan",
  "Penanda",
];

// SCRUM-346 A1/A6 (PO approved 25 Nov): the core columns the PRD always shows (PBI-15: cases graded, model
// version, both scores apart), with Kasus dasar and Percobaan folded behind "Tampilkan kolom lengkap" (the
// comparison basis is also in the line under the title). Kind and model version sit under the product name.
describe("ReportRankingTable", () => {
  it("shows the core columns and folds the basis and attempts columns", () => {
    expect(headerLabels(renderTable())).toEqual(CORE_ID);
  });

  it("opens the full columns and folds them again", () => {
    const table = renderTable();
    const toggle = screen.getByRole("button", { name: "Tampilkan kolom lengkap" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(headerLabels(table)).toEqual([
      "Peringkat",
      "Produk",
      "Skor deterministik",
      "Skor penilai LLM",
      "Kasus dinilai",
      "Kasus dasar",
      "Tingkat kegagalan",
      "Percobaan",
      "Penanda",
    ]);
    const fold = screen.getByRole("button", { name: "Ringkas kolom" });
    expect(fold).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(fold);
    expect(headerLabels(table)).toEqual(CORE_ID);
  });

  // The report body keeps its language parameter (preview, PBI-26); the toggle is app chrome and stays Indonesian.
  it("names the columns in English for an English report", () => {
    expect(headerLabels(renderTable("en"))).toEqual([
      "Rank",
      "Product",
      "Deterministic score",
      "LLM judge score",
      "Cases graded",
      "Failure rate",
      "Markers",
    ]);
    expect(screen.getByRole("button", { name: "Tampilkan kolom lengkap" })).toBeInTheDocument();
  });

  it("lists products in rank order with the product as the row header", () => {
    const names = within(renderTable())
      .getAllByRole("rowheader")
      .map((cell) => cell.querySelector("[data-product]")?.textContent);
    expect(names).toEqual(["AiYU", "Gemini", "DeepSeek", "Justisio", "LegalHero"]);
  });

  it("writes one ranked automatic product with its kind and model version under the name", () => {
    const row = rowOf(renderTable(), "AiYU");
    expect(within(row).getByRole("rowheader")).toHaveTextContent("AiYUOtomatis · v2.1");
    expect(cellTexts(row)).toEqual(["1", "0,91", "0,87", "50", "1,20%", ""]);
  });

  it("writes the folded numbers once the full columns are open", () => {
    const table = renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan kolom lengkap" }));
    expect(cellTexts(rowOf(table, "AiYU"))).toEqual(["1", "0,91", "0,87", "50", "42", "1,20%", "3", ""]);
  });

  // AC9 and K6: a version hidden by code mode reads "Disamarkan", unlike a version that was never recorded.
  it("shows the model version of a code-mode report as hidden", () => {
    const session = reportSession({ product_label: "Produk A", results: [reportResult({ product_model_version: null })] });
    const row = rowOf(renderTable("id", [session], "code"), "Produk A");
    expect(within(row).getByRole("rowheader")).toHaveTextContent("Produk AOtomatis · Disamarkan");
  });

  // D1 and K7: no LLM score means no rank; AC2: the failure rate does not apply to a manual product. A version that
  // was never recorded is left out instead of printing a dash under the name.
  it("writes the manual product without a rank, LLM score, failure rate or version", () => {
    const row = rowOf(renderTable(), "LegalHero");
    expect(within(row).getByRole("rowheader")).toHaveTextContent(/^LegalHeroManual$/);
    expect(cellTexts(row).slice(0, 5)).toEqual(["–", "0,78", "–", "42", "Tidak berlaku"]);
  });

  // H4 (finding N8): markers are badges like everywhere else, instead of text joined by ";".
  const markerBadges = (table: HTMLElement, product: string) =>
    within(within(rowOf(table, product)).getAllByRole("cell").at(-1) as HTMLElement)
      .getAllByText(/./)
      .map((badge) => badge.textContent);

  it("shows each marker as its own badge", () => {
    expect(markerBadges(renderTable(), "LegalHero")).toEqual(["Jumlah percobaan berbeda", "Menolak menjawab (2)"]);
  });

  // AC4: the trial badge comes first, before the D2 markers, same order as the PDF.
  it("puts the trial badge before the other markers", () => {
    const trial = reportSession({ product_label: "T", is_trial: true, markers: [{ code: "model_version_differs" }] });
    expect(markerBadges(renderTable("id", [trial]), "T")).toEqual(["Uji Coba", "Versi model berbeda"]);
  });

  // PO comment 25 Nov: a blue info icon next to each column name explains it on hover or keyboard focus, instead
  // of a row of column groups above the table. The text is the same as the "Cara membaca" panel (A5).
  it("explains six columns with an info button and a tooltip", () => {
    renderTable();
    const buttons = screen.getAllByRole("button", { name: /^Penjelasan / });
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Penjelasan Peringkat",
      "Penjelasan Skor deterministik",
      "Penjelasan Skor penilai LLM",
      "Penjelasan Kasus dinilai",
      "Penjelasan Tingkat kegagalan",
      "Penjelasan Penanda",
    ]);
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(buttons[1]);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/^Skor jalur rujukan peraturan dan pasal/);
  });

  // Security: names come from the server and from people typing them; React must print them as text.
  it("prints a product name with markup as plain text", () => {
    const sessions = [reportSession({ product_label: "<img src=x onerror=alert(1)>", results: [reportResult()] })];
    const table = renderTable("id", sessions);
    expect(within(table).getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(table.querySelector("img")).toBeNull();
  });

  // K6 / AC5: on a phone the table scrolls sideways inside its own labelled region, rank and product stay put.
  it("wraps the table in a scroll region named after the section", () => {
    renderTable();
    expect(screen.getByRole("region", { name: "Kasus test" }).tagName).toBe("SECTION");
  });

  // PBI-16 AC1 (SCRUM-328): every score opens the cases behind it; the link carries the number's result id.
  it("links each score to the cases behind it when a drill-down href is given", () => {
    const session = reportSession({ product_label: "AiYU", results: [reportResult({ id: "res-9" })] });
    renderTable("id", [session], "real_name", (resultId) => `/drill/${resultId}`);

    expect(screen.getByRole("link", { name: "0,91, telusuri kasus di balik skor deterministik AiYU" })).toHaveAttribute(
      "href",
      "/drill/res-9",
    );
    expect(screen.getByRole("link", { name: "0,87, telusuri kasus di balik skor penilai LLM AiYU" })).toHaveTextContent("0,87");
  });

  // Finding N2 (A2): the drill-down is also an explicit action per row, not only a blue number.
  it("adds a Lihat kasus action per product when a drill-down href is given", () => {
    const session = reportSession({ product_label: "AiYU", results: [reportResult({ id: "res-9" })] });
    const table = renderTable("id", [session], "real_name", (resultId) => `/drill/${resultId}`);

    expect(within(table).getAllByRole("columnheader").at(-1)).toHaveTextContent("Kasus di balik angka");
    expect(screen.getByRole("link", { name: "Lihat kasus AiYU" })).toHaveAttribute("href", "/drill/res-9");
  });

  // Positive (WCAG 2.5.3 Label in Name, review #104): the link name starts with the number on screen.
  it("keeps the visible number in the link name and marks the hint as Indonesian", () => {
    const session = reportSession({ product_label: "AiYU", results: [reportResult({ id: "res-9" })] });
    renderTable("en", [session], "real_name", (resultId) => `/drill/${resultId}`);

    const [link] = screen.getAllByRole("link");
    expect(link).not.toHaveAttribute("aria-label");
    expect(link.firstChild?.textContent).toBe("0.91");
    expect(within(link).getByText(/telusuri kasus di balik/)).toHaveAttribute("lang", "id");
  });

  // Edge: a dash is not a number, so an empty score is never a link (D1); the row action stays.
  it("does not link an empty score", () => {
    const session = reportSession({ product_label: "AiYU", results: [reportResult({ llm_score: null, rank: null })] });
    renderTable("id", [session], "real_name", () => "/x");

    expect(screen.getAllByRole("link", { name: /telusuri/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Lihat kasus AiYU" })).toBeInTheDocument();
  });

  // Negative: without a drill-down href (the development preview), scores stay text and there is no action column.
  it("keeps scores as text and has no action column without a drill-down href", () => {
    const table = renderTable();

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(within(table).queryByText("Kasus di balik angka")).toBeNull();
  });
});
