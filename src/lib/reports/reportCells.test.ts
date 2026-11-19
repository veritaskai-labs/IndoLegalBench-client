import { describe, expect, it } from "vitest";

import { firstReport } from "@/test/reportFixtures";

import { failureRateText, formatReportDate, modelVersionText, rankText, reportInfoLine } from "./reportCells";

// SCRUM-322: the text of each table cell and of the report header, written the same way as the server PDF
// (pdf.py) so a reader sees the same values on the web and in the downloaded file.

describe("rankText (D1)", () => {
  it.each([
    [1, "1"],
    [10, "10"],
  ])("shows rank %s as %s", (rank, shown) => {
    expect(rankText(rank)).toBe(shown);
  });

  // D1: a product with an empty score has no rank; the cell shows a dash, never 0.
  it("shows a dash for a product without a rank", () => {
    expect(rankText(null)).toBe("–");
  });
});

describe("failureRateText (PBI-15 AC2)", () => {
  it.each([
    ["1.20", "en", "1.20%"],
    ["1.20", "id", "1,20%"],
    ["0.00", "en", "0.00%"],
    ["100", "id", "100,00%"],
  ] as const)("shows %s in %s as %s", (rate, language, shown) => {
    expect(failureRateText("automatic", rate, language)).toBe(shown);
  });

  // AC2: the failure rate does not apply to a manual product, whatever the server sends.
  it.each([
    [null, "en", "Not applicable"],
    [null, "id", "Tidak berlaku"],
    ["5.00", "en", "Not applicable"],
  ] as const)("says 'not applicable' for a manual product with rate %j in %s", (rate, language, shown) => {
    expect(failureRateText("manual", rate, language)).toBe(shown);
  });

  // Negative: an automatic product with no rate, or a malformed one, is a dash without a percent sign.
  it.each([null, "", "1,20"])("shows a bare dash for the automatic rate %j", (rate) => {
    expect(failureRateText("automatic", rate, "en")).toBe("–");
  });
});

describe("modelVersionText", () => {
  it("shows the product model version as written", () => {
    expect(modelVersionText("v2.1")).toBe("v2.1");
  });

  it.each([null, ""])("shows a dash for the empty version %j", (version) => {
    expect(modelVersionText(version)).toBe("–");
  });
});

describe("formatReportDate (WIB, like the PDF header)", () => {
  it.each([
    ["en", "19 November 2026"],
    ["id", "19 November 2026"],
  ] as const)("writes the creation day with the full month name in %s", (language, shown) => {
    expect(formatReportDate("2026-11-19T03:15:00Z", language)).toBe(shown);
  });

  // Boundary: 30 Nov 16:59 UTC is still 23:59 WIB on the 30th; one hour later it is already 1 December in WIB.
  it.each([
    ["2026-11-30T16:59:00Z", "id", "30 November 2026"],
    ["2026-11-30T17:00:00Z", "id", "1 Desember 2026"],
    ["2026-11-30T17:00:00Z", "en", "1 December 2026"],
    ["2026-12-31T17:30:00Z", "en", "1 January 2027"],
  ] as const)("reads %s as the WIB day in %s: %s", (iso, language, shown) => {
    expect(formatReportDate(iso, language)).toBe(shown);
  });

  // Negative: text that is not a date is shown as it came, like formatWibDate.
  it("returns text that is not a date unchanged", () => {
    expect(formatReportDate("bukan tanggal", "en")).toBe("bukan tanggal");
  });
});

describe("reportInfoLine (PDF header line)", () => {
  it("lists creation date, rubric, judge model and case basis in English", () => {
    expect(reportInfoLine(firstReport(), "en")).toBe(
      "Created 19 November 2026 · Rubric v3 · Judge model: model-penilai-a · Cases used for comparison: 42",
    );
  });

  it("lists the same facts in Indonesian", () => {
    expect(reportInfoLine(firstReport(), "id")).toBe(
      "Dibuat 19 November 2026 · Rubrik v3 · Model penilai: model-penilai-a · Jumlah kasus dasar perbandingan: 42",
    );
  });

  // Like pdf.py: a missing rubric version or judge model is left out instead of printing "v" or an empty name.
  it.each([
    ["rubric", { rubric_version_no: null }, "Created 19 November 2026 · Judge model: model-penilai-a · Cases used for comparison: 42"],
    ["judge model", { judge_model_name: null }, "Created 19 November 2026 · Rubric v3 · Cases used for comparison: 42"],
    ["empty judge model", { judge_model_name: "" }, "Created 19 November 2026 · Rubric v3 · Cases used for comparison: 42"],
  ])("leaves out a missing %s", (_, overrides, shown) => {
    expect(reportInfoLine(firstReport(overrides), "en")).toBe(shown);
  });

  // Edge: AC1 always shows the case count, even when it is 0.
  it("always shows the case basis count, also when it is 0", () => {
    expect(reportInfoLine(firstReport({ case_basis_count: 0 }), "en")).toContain("Cases used for comparison: 0");
  });
});
