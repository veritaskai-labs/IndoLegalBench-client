import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reportSections } from "@/lib/reports/reportSections";
import { firstReport, reportResult, reportSession } from "@/test/reportFixtures";

import { ReportScoreCharts } from "./ReportScoreCharts";

const rowsOf = (sessions = firstReport().sessions) => reportSections(sessions)[0].rows;

function charts(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>("[data-chart]")].map((chart) => ({
    title: chart.querySelector("h3")?.textContent,
    bars: [...chart.querySelectorAll<HTMLElement>("[data-product]")].map((bar) => [
      bar.dataset.product,
      bar.dataset.top,
      bar.querySelector("[data-value]")?.textContent,
    ]),
  }));
}

// SCRUM-346 A6 (finding N13): one chart per score, sorted from the highest, top product in dark blue. The table
// next to it has the same numbers, so the charts are hidden from screen readers like the old chart (K4).
describe("ReportScoreCharts", () => {
  it("draws one sorted chart per score", () => {
    const { container } = render(<ReportScoreCharts rows={rowsOf()} language="id" />);
    const [det, llm] = charts(container);
    expect(det.title).toBe("Skor deterministik");
    expect(det.bars.map(([product]) => product)).toEqual(["AiYU", "Justisio", "Gemini", "DeepSeek", "LegalHero"]);
    expect(det.bars[0]).toEqual(["AiYU", "true", "0,91"]);
    expect(det.bars[1][1]).toBe("false");
    expect(llm.title).toBe("Skor penilai LLM");
    // LegalHero has no LLM score, so it has no bar (D1, K7).
    expect(llm.bars.map(([product]) => product)).toEqual(["Gemini", "AiYU", "DeepSeek", "Justisio"]);
  });

  it("sizes each bar to its score and is hidden from screen readers", () => {
    const { container } = render(<ReportScoreCharts rows={rowsOf()} language="id" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    const fill = container.querySelector<HTMLElement>('[data-product="AiYU"] [data-fill]');
    expect(fill?.style.width).toBe("91%");
    expect(container).toHaveTextContent("Biru tua menandai skor tertinggi; produk yang seri berwarna sama.");
  });

  it("writes the values in the report's language", () => {
    const { container } = render(<ReportScoreCharts rows={rowsOf()} language="en" />);
    expect(charts(container)[0].bars[0][2]).toBe("0.91");
  });

  // Edge: a score nobody has gets no chart; no score at all gets nothing.
  it("leaves out a chart without scores and renders nothing without any", () => {
    const onlyDet = [reportSession({ product_label: "A", results: [reportResult({ llm_score: null, rank: null })] })];
    const { container, rerender } = render(<ReportScoreCharts rows={rowsOf(onlyDet)} language="id" />);
    expect(charts(container).map((chart) => chart.title)).toEqual(["Skor deterministik"]);

    const none = [reportSession({ product_label: "A", results: [reportResult({ det_score: null, llm_score: null })] })];
    rerender(<ReportScoreCharts rows={rowsOf(none)} language="id" />);
    expect(container).toBeEmptyDOMElement();
  });
});
