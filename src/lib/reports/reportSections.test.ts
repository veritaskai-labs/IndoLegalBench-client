import { describe, expect, it } from "vitest";

import { devTestReport, firstReport, reportResult, reportSession } from "@/test/reportFixtures";

import { reportSections } from "./reportSections";

const labelsOf = (rows: { session: { product_label: string } }[]) => rows.map((row) => row.session.product_label);

// SCRUM-322: the report shows one section per score split the server actually sent, test then dev then combined,
// and orders each section by the server's frozen rank (D1). The client never ranks; it only orders, with the same
// key as pdf.py so the web and the PDF list products in the same order.
describe("reportSections: which sections appear", () => {
  // AC7 / D9: Viewer and Kontributor only ever receive test results, so they see one section.
  it("shows only the test section for a test report", () => {
    expect(reportSections(firstReport().sessions).map((section) => section.split)).toEqual(["test"]);
  });

  it("shows test, dev, then combined for a Dev + Test report", () => {
    expect(reportSections(devTestReport().sessions).map((section) => section.split)).toEqual([
      "test",
      "dev",
      "combined",
    ]);
  });

  it("keeps the test, dev, combined order even when the server lists the results the other way round", () => {
    const sessions = [
      reportSession({
        results: [reportResult({ score_split: "combined" }), reportResult({ score_split: "test" })],
      }),
    ];
    expect(reportSections(sessions).map((section) => section.split)).toEqual(["test", "combined"]);
  });

  // Edge: the PDF prints "no results" in this case; the page decides what to show, the list is just empty.
  it.each([
    ["no sessions", []],
    ["sessions without results", [reportSession({ results: [] })]],
  ])("returns no sections for %s", (_, sessions) => {
    expect(reportSections(sessions)).toEqual([]);
  });

  it("leaves a product out of only the section it has no result for", () => {
    const sessions = [
      reportSession({ product_label: "AiYU", results: [reportResult(), reportResult({ score_split: "dev" })] }),
      reportSession({ product_label: "Gemini", results: [reportResult({ rank: 2 })] }),
    ];
    const [test, dev] = reportSections(sessions);
    expect(labelsOf(test.rows)).toEqual(["AiYU", "Gemini"]);
    expect(labelsOf(dev.rows)).toEqual(["AiYU"]);
  });

  it("pairs each row with the result of its own split", () => {
    const [, dev] = reportSections(devTestReport().sessions);
    expect(dev.rows.every((row) => row.result.score_split === "dev")).toBe(true);
  });
});

describe("reportSections: row order (D1 rank, same key as the PDF)", () => {
  it("orders the first report by rank and puts the product without a rank last", () => {
    // The fixture sends Justisio, LegalHero, AiYU, DeepSeek, Gemini; LegalHero has no LLM score, so no rank.
    const [test] = reportSections(firstReport().sessions);
    expect(labelsOf(test.rows)).toEqual(["AiYU", "Gemini", "DeepSeek", "Justisio", "LegalHero"]);
  });

  // The server breaks ties (LLM score, then deterministic). If two rows still share a rank, keep the server order.
  it("keeps the server order for rows that share a rank", () => {
    const sessions = [
      reportSession({ product_label: "B", results: [reportResult({ rank: 2 })] }),
      reportSession({ product_label: "A", results: [reportResult({ rank: 2 })] }),
      reportSession({ product_label: "C", results: [reportResult({ rank: 1 })] }),
    ];
    expect(labelsOf(reportSections(sessions)[0].rows)).toEqual(["C", "B", "A"]);
  });

  it("keeps the server order among several rows without a rank", () => {
    const sessions = [
      reportSession({ product_label: "Y", results: [reportResult({ rank: null })] }),
      reportSession({ product_label: "X", results: [reportResult({ rank: 1 })] }),
      reportSession({ product_label: "Z", results: [reportResult({ rank: null })] }),
    ];
    expect(labelsOf(reportSections(sessions)[0].rows)).toEqual(["X", "Y", "Z"]);
  });

  // Rank 10 must come after rank 9: numbers, not text, decide the order.
  it("compares ranks as numbers", () => {
    const sessions = [10, 9, 1].map((rank) =>
      reportSession({ product_label: `P${rank}`, results: [reportResult({ rank })] }),
    );
    expect(labelsOf(reportSections(sessions)[0].rows)).toEqual(["P1", "P9", "P10"]);
  });

  it("does not reorder the sessions it was given", () => {
    const sessions = firstReport().sessions;
    const before = sessions.map((session) => session.product_label);
    reportSections(sessions);
    expect(sessions.map((session) => session.product_label)).toEqual(before);
  });
});
