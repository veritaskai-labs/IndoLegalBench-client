import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reportSections } from "@/lib/reports/reportSections";
import { firstReport } from "@/test/reportFixtures";

import { ReportHighlightCards } from "./ReportHighlightCards";

const rows = () => reportSections(firstReport().sessions)[0].rows;

/** The cards only: each card has its own nested list of leaders. */
const cardsOf = (name: string) => [...screen.getByRole("list", { name }).children] as HTMLElement[];

// SCRUM-346 A6 (PO approved 25 Nov): three cards above the table, each naming the best product for one number.
describe("ReportHighlightCards", () => {
  it("lists one card per number with its title, sentence and leader", () => {
    render(<ReportHighlightCards rows={rows()} label="Sorotan Kasus test" />);
    const cards = cardsOf("Sorotan Kasus test");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByRole("heading", { level: 3, name: "Skor deterministik" })).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("AiYU tertinggi dengan 0,91. Berikutnya Justisio 0,86.");
    expect(within(cards[2]).getByRole("heading", { level: 3, name: "Tingkat kegagalan" })).toBeInTheDocument();
    expect(cards[2]).toHaveTextContent("Gemini paling rendah dengan 0,00%.");
  });

  it("shows every tied leader as a badge", () => {
    render(<ReportHighlightCards rows={rows()} label="Sorotan" />);
    const llm = cardsOf("Sorotan")[1];
    expect(within(llm).getByRole("list", { name: "Produk teratas" })).toHaveTextContent("Gemini");
  });

  // Edge: no numbers, no cards; an empty list would only add noise for screen readers.
  it("renders nothing without rows", () => {
    const { container } = render(<ReportHighlightCards rows={[]} label="Sorotan" />);
    expect(container).toBeEmptyDOMElement();
  });
});
