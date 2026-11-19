import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reportSections } from "@/lib/reports/reportSections";
import { firstReport, reportResult, reportSession } from "@/test/reportFixtures";
import type { ReportLanguage, ReportSessionRead } from "@/types/reports";

import { ReportBarChart } from "./ReportBarChart";

function renderChart(language: ReportLanguage = "en", sessions: ReportSessionRead[] = firstReport().sessions) {
  const [section] = reportSections(sessions);
  const { container } = render(<ReportBarChart rows={section.rows} language={language} />);
  return container.firstElementChild as HTMLElement;
}

function bar(chart: HTMLElement, product: string, metric: "det" | "llm") {
  const track = chart.querySelector(`[data-product="${product}"][data-metric="${metric}"]`) as HTMLElement;
  return { fill: track.querySelector<HTMLElement>("[data-bar]"), value: track.textContent };
}

// SCRUM-322 (Fase 0 K4, K7): horizontal bars, two per product (deterministic and LLM judge, never combined,
// AC6), in the same order and colours as the PDF.
describe("ReportBarChart", () => {
  // The table beside it holds the same numbers, so screen readers read them once, from the table.
  it("is hidden from assistive technology", () => {
    expect(renderChart()).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    ["en", "Deterministic score", "LLM judge score"],
    ["id", "Skor deterministik", "Skor penilai LLM"],
  ] as const)("names both bars in the legend in %s", (language, det, llm) => {
    const chart = renderChart(language);
    expect(chart).toHaveTextContent(det);
    expect(chart).toHaveTextContent(llm);
  });

  it("draws the products in rank order", () => {
    const products = [...renderChart().querySelectorAll("[data-metric='det']")].map((track) =>
      track.getAttribute("data-product"),
    );
    expect(products).toEqual(["AiYU", "Gemini", "DeepSeek", "Justisio", "LegalHero"]);
  });

  it("sizes each bar to its score on the 0 to 1 axis, with the PDF colours", () => {
    const chart = renderChart();
    const det = bar(chart, "AiYU", "det");
    const llm = bar(chart, "AiYU", "llm");
    expect(det.fill).toHaveStyle({ width: "91%", backgroundColor: "#3B44C4" });
    expect(llm.fill).toHaveStyle({ width: "87%", backgroundColor: "#147D7A" });
    expect(det.value).toBe("0.91");
  });

  // K7: LegalHero has no LLM score. No bar at all, not a bar of width 0, and a dash instead of a number.
  it("draws no bar for an empty score", () => {
    const llm = bar(renderChart(), "LegalHero", "llm");
    expect(llm.fill).toBeNull();
    expect(llm.value).toBe("–");
  });

  it("writes values and axis labels in the report's language", () => {
    const chart = renderChart("id");
    expect(bar(chart, "AiYU", "det").value).toBe("0,91");
    const ticks = [...chart.querySelectorAll("[data-tick]")].map((tick) => tick.textContent);
    expect(ticks).toEqual(["0,00", "0,25", "0,50", "0,75", "1,00"]);
  });

  // Edge: a score above 1 stretches the axis so the longest bar fills the track instead of overflowing.
  it("stretches the axis for a score above 1", () => {
    const sessions = [reportSession({ product_label: "X", results: [reportResult({ det_score: "1.20", llm_score: "0.60" })] })];
    const chart = renderChart("en", sessions);
    expect(bar(chart, "X", "det").fill).toHaveStyle({ width: "100%" });
    expect(bar(chart, "X", "llm").fill).toHaveStyle({ width: "50%" });
    expect(chart.querySelector("[data-tick]:last-child")).toHaveTextContent("1.20");
  });
});
