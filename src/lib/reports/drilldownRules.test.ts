import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";

import {
  attemptSourceLabel,
  canOpenEvidence,
  canRetryDrilldown,
  CONTENT_REQUEST_TEXT,
  drilldownErrorMessage,
  HIDDEN_DRILLDOWN,
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

describe("attemptSourceLabel (AC2)", () => {
  it("labels manual and automatic answers", () => {
    expect(attemptSourceLabel({ source: "manual" })).toBe("Manual");
    expect(attemptSourceLabel({ source: "automatic" })).toBe("Otomatis");
  });
});
