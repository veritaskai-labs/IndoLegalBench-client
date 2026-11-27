import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { caseScore } from "@/test/reportFixtures";

import {
  caseNeighbours,
  canCompareProducts,
  canOpenEvidence,
  canRetryDrilldown,
  CONTENT_REQUEST_TEXT,
  drilldownErrorMessage,
  HIDDEN_DRILLDOWN,
  parseCaseSort,
  resultCaseHref,
  resultCasesHref,
} from "./drilldownRules";

describe("drill-down links (D6 steps 1 and 4)", () => {
  it("builds the case list and case pages under the saved report", () => {
    expect(resultCasesHref("r-1", "res-1")).toBe("/reports/comparisons/r-1/results/res-1");
    expect(resultCaseHref("r-1", "res-1", "c-1")).toBe("/reports/comparisons/r-1/results/res-1/cases/c-1");
  });

  // Edge: ids are encoded so a value cannot change the route.
  it("encodes ids", () => {
    expect(resultCaseHref("r/1", "res?1", "c#1")).toBe("/reports/comparisons/r%2F1/results/res%3F1/cases/c%231");
  });

  // Positif, SCRUM-378: the sort picked on the list travels with both links, so the order survives the trip.
  it("keeps the sort of the case list in both links", () => {
    const sort = { key: "llm_score", direction: "desc" } as const;

    expect(resultCasesHref("r-1", "res-1", sort)).toBe("/reports/comparisons/r-1/results/res-1?urut=llm_score-desc");
    expect(resultCaseHref("r-1", "res-1", "c-1", sort)).toBe(
      "/reports/comparisons/r-1/results/res-1/cases/c-1?urut=llm_score-desc",
    );
    expect(resultCaseHref("r-1", "res-1", "c-1", null)).toBe("/reports/comparisons/r-1/results/res-1/cases/c-1");
  });
});

// SCRUM-378: the sort of the case list in the address (?urut=<column>-<asc|desc>).
describe("parseCaseSort", () => {
  // Positif: every sortable column of the case list, both ways.
  it.each([
    ["case_code-asc", { key: "case_code", direction: "asc" }],
    ["det_score-desc", { key: "det_score", direction: "desc" }],
    ["llm_score-asc", { key: "llm_score", direction: "asc" }],
  ])("reads %s", (value, sort) => {
    expect(parseCaseSort(value)).toEqual(sort);
  });

  // Negatif and Edge: a missing, typed-by-hand or unknown value falls back to the server order.
  it.each([null, undefined, "", "split_tag-asc", "llm_score", "llm_score-up", "llm_score-desc-x", "-desc"])(
    "reads %s as the server order",
    (value) => {
      expect(parseCaseSort(value)).toBeNull();
    },
  );
});

// SCRUM-378 (A2 of SCRUM-346): "Kasus sebelumnya" and "Kasus berikutnya" follow the case list.
describe("caseNeighbours", () => {
  const cases = [
    caseScore({ case_id: "c-1", case_code: "ILB-001", llm_score: "0.50" }),
    caseScore({ case_id: "c-2", case_code: "ILB-002", llm_score: "0.90", content_visible: false }),
    caseScore({ case_id: "c-3", case_code: "ILB-003", llm_score: "0.70" }),
    caseScore({ case_id: "c-4", case_code: "ILB-004", llm_score: null }),
  ];
  const ids = (found: ReturnType<typeof caseNeighbours>) => [found?.previous?.case_id ?? null, found?.next?.case_id ?? null];

  // Positif: in the server order, a closed case is skipped because it cannot be opened (AC3).
  it("steps through the openable cases in the server order", () => {
    const found = caseNeighbours(cases, "c-3", null);

    expect(found).toMatchObject({ position: 2, total: 3 });
    expect(ids(found)).toEqual(["c-1", "c-4"]);
  });

  // Positif: the same order as a sorted list, with an empty score last, like the table.
  it("follows the sort picked on the list", () => {
    const found = caseNeighbours(cases, "c-1", { key: "llm_score", direction: "desc" });

    expect(found).toMatchObject({ position: 2, total: 3 });
    expect(ids(found)).toEqual(["c-3", "c-4"]);
  });

  // Edge: the first case has no previous one and the last case has no next one.
  it("has no previous case at the start and no next case at the end", () => {
    expect(ids(caseNeighbours(cases, "c-1", null))).toEqual([null, "c-3"]);
    expect(ids(caseNeighbours(cases, "c-4", null))).toEqual(["c-3", null]);
  });

  // Edge: a number with a single openable case has nowhere to go.
  it("has neither neighbour for a single case", () => {
    expect(caseNeighbours([cases[0]], "c-1", null)).toEqual({ position: 1, total: 1, previous: null, next: null });
  });

  // Negatif: a closed case or a case that is not in the list has no position.
  it("gives no position for a case that is closed or not in the list", () => {
    expect(caseNeighbours(cases, "c-2", null)).toBeNull();
    expect(caseNeighbours(cases, "c-404", null)).toBeNull();
  });
});

describe("drilldownErrorMessage", () => {
  // Positive: the server's 403 message already names the contact email (AC3), so it is shown as is.
  it("shows the server message for case content the role may not open", () => {
    const error = new ApiError(403, "CASE_CONTENT_FORBIDDEN", "Untuk mendapatkan isi kasus, kirim email ke indolegalbench@veritask.ai.");

    expect(drilldownErrorMessage(error)).toBe(error.serverMessage);
  });

  // Edge: a 403 without a server message still tells the reader how to ask for the content.
  it("falls back to the contact text when the server sends no message", () => {
    expect(drilldownErrorMessage(new ApiError(403, "CASE_CONTENT_FORBIDDEN"))).toBe(CONTENT_REQUEST_TEXT);
    expect(CONTENT_REQUEST_TEXT).toContain("indolegalbench@veritask.ai");
  });

  // Negative: someone else's report, a number from another report, and a mistyped id read the same (D9).
  it.each([
    [403, "FORBIDDEN"],
    [404, "REPORT_RESULT_NOT_FOUND"],
    [404, "REPORT_NOT_FOUND"],
    [422, "VALIDATION_ERROR"],
  ])("hides a %s %s behind one message", (status, code) => {
    expect(drilldownErrorMessage(new ApiError(status, code))).toBe(HIDDEN_DRILLDOWN);
  });

  it.each([new ApiError(500, "ANY"), new TypeError("Failed to fetch")])("asks to retry other failures", (error) => {
    expect(canRetryDrilldown(drilldownErrorMessage(error))).toBe(true);
  });

  // Negative: retrying cannot open a hidden report or forbidden content, so no retry is offered.
  it.each([new ApiError(404, "ANY"), new ApiError(403, "CASE_CONTENT_FORBIDDEN", "kirim email")])(
    "offers no retry for %s",
    (error) => {
      expect(canRetryDrilldown(drilldownErrorMessage(error))).toBe(false);
    },
  );
});

describe("canOpenEvidence (AC4)", () => {
  it.each([
    ["admin", true],
    ["contributor", true],
    ["viewer", false],
    ["developer_ai", false],
    [null, false],
  ] as const)("%s → %s", (role, allowed) => {
    expect(canOpenEvidence(role)).toBe(allowed);
  });
});

describe("canCompareProducts (SCRUM-372)", () => {
  it.each([
    ["admin", true],
    ["contributor", true],
    ["viewer", false],
    ["developer_ai", false],
    [null, false],
  ] as const)("%s → %s", (role, allowed) => {
    expect(canCompareProducts(role)).toBe(allowed);
  });
});
