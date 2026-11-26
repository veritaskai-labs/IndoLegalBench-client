import { describe, expect, it } from "vitest";

import { firstReport, reportResult, reportSession } from "@/test/reportFixtures";
import type { MeasurementKind } from "@/types/reports";

import { reportHighlights } from "./reportHighlights";
import { reportSections } from "./reportSections";

type Product = { name: string; det: string | null; llm: string | null; rate?: string | null; kind?: MeasurementKind };

function rowsOf(products: readonly Product[]) {
  return (
    reportSections(
      products.map(({ name, det, llm, rate = "0.00", kind = "automatic" }) =>
        reportSession({
          product_label: name,
          measurement_kind: kind,
          results: [reportResult({ det_score: det, llm_score: llm, failure_rate: rate })],
        }),
      ),
    )[0]?.rows ?? []
  );
}

const byMetric = (products: readonly Product[]) =>
  Object.fromEntries(reportHighlights(rowsOf(products)).map((card) => [card.metric, card]));

// SCRUM-346 A6 (PO approved 25 Nov): three highlight cards above the ranking table, one per number the PRD keeps
// apart (PBI-15 AC6: deterministic and LLM scores are never merged). Built only from rows the report already has.
describe("reportHighlights", () => {
  // Positive: the five-product fixture gives one card per metric, in the table's column order.
  it("gives one card per metric for the first report", () => {
    const cards = reportHighlights(reportSections(firstReport().sessions)[0].rows);
    expect(cards.map((card) => [card.metric, card.title])).toEqual([
      ["deterministic", "Skor deterministik"],
      ["llm", "Skor penilai LLM"],
      ["failureRate", "Tingkat kegagalan"],
    ]);
  });

  it("names the highest score and the runner-up with two decimals and a comma", () => {
    const { deterministic } = byMetric([
      { name: "Veritask", det: "1.00", llm: "1.00" },
      { name: "DeepSeek", det: "0.5", llm: "1.00" },
    ]);
    expect(deterministic.leaders).toEqual(["Veritask"]);
    expect(deterministic.sentence).toBe("Veritask tertinggi dengan 1,00. Berikutnya DeepSeek 0,50.");
  });

  // Edge: a tie has no single winner, so the card says so instead of picking one by row order.
  it.each([
    [["A", "B"], "A dan B seri di 1,00."],
    [["A", "B", "C"], "A, B, dan C seri di 1,00."],
  ])("calls a tie between %j a tie", (names, sentence) => {
    const { llm } = byMetric(names.map((name) => ({ name, det: "0.50", llm: "1.00" })));
    expect(llm.leaders).toEqual(names);
    expect(llm.sentence).toBe(sentence);
  });

  // Edge: the runner-up is the next distinct score, so a tie for second is named together.
  it("names every product tied for second place", () => {
    const { deterministic } = byMetric([
      { name: "A", det: "0.90", llm: null },
      { name: "B", det: "0.70", llm: null },
      { name: "C", det: "0.70", llm: null },
    ]);
    expect(deterministic.sentence).toBe("A tertinggi dengan 0,90. Berikutnya B dan C 0,70.");
  });

  it("says only the leader when one product has a score", () => {
    const { deterministic } = byMetric([{ name: "Solo", det: "0.80", llm: null }]);
    expect(deterministic.sentence).toBe("Solo tertinggi dengan 0,80.");
  });

  // Negative (D1): a product without a score is not a leader and not 0; with no score at all there is no card.
  it("skips empty and broken scores and drops a metric nobody has", () => {
    const cards = byMetric([
      { name: "A", det: null, llm: null },
      { name: "B", det: "", llm: null },
      { name: "C", det: "0.40", llm: null },
    ]);
    expect(cards.deterministic.leaders).toEqual(["C"]);
    expect(cards.llm).toBeUndefined();
  });

  // AC2: a lower failure rate is better, and the rate does not apply to manual products at all.
  it("picks the lowest failure rate among automatic products only", () => {
    const { failureRate } = byMetric([
      { name: "Auto A", det: "0.9", llm: "0.9", rate: "2.50" },
      { name: "Auto B", det: "0.8", llm: "0.8", rate: "1.20" },
      { name: "Manual", det: "0.7", llm: "0.7", rate: "0.00", kind: "manual" },
    ]);
    expect(failureRate.leaders).toEqual(["Auto B"]);
    expect(failureRate.sentence).toBe("Auto B paling rendah dengan 1,20%. Berikutnya Auto A 2,50%.");
  });

  it("says no automatic product failed when every rate is zero", () => {
    const { failureRate } = byMetric([
      { name: "A", det: "1", llm: "1", rate: "0.00" },
      { name: "B", det: "0.5", llm: "1", rate: "0" },
    ]);
    expect(failureRate.leaders).toEqual(["A", "B"]);
    expect(failureRate.sentence).toBe("Tidak ada kegagalan teknis pada 2 produk otomatis (0,00%).");
  });

  it("drops the failure-rate card for a report of manual products only", () => {
    expect(byMetric([{ name: "M", det: "0.7", llm: "0.7", kind: "manual" }]).failureRate).toBeUndefined();
  });

  // Edge: no rows (a report without results) gives no cards rather than empty ones.
  it("gives no cards for no rows", () => {
    expect(reportHighlights([])).toEqual([]);
  });
});
