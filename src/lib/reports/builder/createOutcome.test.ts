import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { outcomeFromError, outcomeFromResponse } from "./createOutcome";

function apiError(status: number, code: string, details: Record<string, unknown> | null = null) {
  return new ApiError(status, code, "pesan server", null, [], null, details);
}

describe("outcomeFromResponse", () => {
  // Positive: 201, the report was saved; the page opens it.
  it("returns the saved report id", () => {
    // Arrange / Act
    const outcome = outcomeFromResponse({ report: { id: "r-1" }, warning: null });

    // Assert
    expect(outcome).toEqual({ kind: "saved", reportId: "r-1" });
  });

  // Negative: 200 NO_SHARED_CASES (AC1), nothing saved, no numbers.
  it("reports no shared cases when the server saved nothing", () => {
    // Arrange / Act
    const outcome = outcomeFromResponse({ report: null, warning: "NO_SHARED_CASES" });

    // Assert
    expect(outcome).toEqual({ kind: "no_shared_cases" });
  });

  // Edge: a success status with no report and no known warning. Treating every 2xx as
  // "saved" would open /reports/comparisons/undefined.
  it.each([null, "SOMETHING_NEW"])("does not treat a missing report as saved (warning %j)", (warning) => {
    // Arrange / Act
    const outcome = outcomeFromResponse({ report: null, warning });

    // Assert
    expect(outcome.kind).toBe("failed");
  });
});

describe("outcomeFromError", () => {
  // Negative: 409 REPORT_NOT_COMPARABLE carries every reason at once (AC4, AC13).
  it("keeps every reason from a 409", () => {
    // Arrange
    const error = apiError(409, "REPORT_NOT_COMPARABLE", {
      selection_errors: ["NEED_AT_LEAST_TWO_PRODUCTS"],
      ineligible: { "s-1": ["SESSION_CANCELLED", "SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "JUDGE_MODEL", message: "Penilai berbeda." }],
    });

    // Act
    const outcome = outcomeFromError(error);

    // Assert
    expect(outcome).toEqual({
      kind: "not_comparable",
      selectionErrors: ["NEED_AT_LEAST_TWO_PRODUCTS"],
      ineligible: { "s-1": ["SESSION_CANCELLED", "SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "JUDGE_MODEL", message: "Penilai berbeda." }],
    });
  });

  // Edge: a 409 body that is missing parts or has the wrong shape must not crash the page;
  // whatever is readable is kept, the rest is empty.
  it("reads a 409 with missing or malformed details as empty lists", () => {
    // Arrange
    const error = apiError(409, "REPORT_NOT_COMPARABLE", {
      selection_errors: "NEED_AT_LEAST_TWO_PRODUCTS",
      ineligible: { "s-1": "SESSION_CANCELLED", "s-2": ["SESSION_NOT_GRADED", 7] },
      rejections: [{ requirement: "SUITE_VERSION" }, "x", { requirement: "RUBRIC_VERSION", message: "Rubrik beda." }],
    });

    // Act
    const outcome = outcomeFromError(error);

    // Assert
    expect(outcome).toEqual({
      kind: "not_comparable",
      selectionErrors: [],
      ineligible: { "s-2": ["SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "RUBRIC_VERSION", message: "Rubrik beda." }],
    });
  });

  it("reads a 409 without details as empty lists", () => {
    // Arrange / Act
    const outcome = outcomeFromError(apiError(409, "REPORT_NOT_COMPARABLE"));

    // Assert
    expect(outcome).toEqual({ kind: "not_comparable", selectionErrors: [], ineligible: {}, rejections: [] });
  });

  // Negative: 404, some picked sessions are gone (deleted or archived after loading).
  it("names the sessions that no longer exist", () => {
    // Arrange
    const error = apiError(404, "REPORT_SESSION_NOT_FOUND", { missing: ["s-9", 3, "s-8"] });

    // Act
    const outcome = outcomeFromError(error);

    // Assert
    expect(outcome).toEqual({ kind: "sessions_missing", sessionIds: ["s-9", "s-8"] });
  });

  // Negative: 403 for a scope or label the role may not use (the UI should prevent it).
  it.each(["REPORT_SCOPE_FORBIDDEN", "REPORT_LABEL_MODE_FORBIDDEN"])("reports %s as forbidden", (code) => {
    // Arrange / Act
    const outcome = outcomeFromError(apiError(403, code));

    // Assert
    expect(outcome).toEqual({ kind: "forbidden", code });
  });

  // Negative: 422 validation, with the server message for the user.
  it("reports a 422 as invalid input", () => {
    // Arrange / Act
    const outcome = outcomeFromError(apiError(422, "VALIDATION_ERROR"));

    // Assert
    expect(outcome).toEqual({ kind: "invalid", message: "pesan server" });
  });

  // Edge: a status/code pair this page doesn't know (500, a 409 with another code, a 404
  // that is not about sessions) is a general failure, not a wrong specific message.
  it.each([
    [500, "INTERNAL_ERROR"],
    [409, "SOMETHING_ELSE"],
    [404, "NOT_FOUND"],
    [0, "UNKNOWN_ERROR"],
  ])("reports %i %s as a general failure", (status, code) => {
    // Arrange / Act
    const outcome = outcomeFromError(apiError(status, code));

    // Assert
    expect(outcome).toEqual({ kind: "failed", message: "pesan server" });
  });

  // Edge: something that is not an ApiError (network down, a bug) is a general failure too.
  it("reports a non-API error as a general failure without a server message", () => {
    // Arrange / Act
    const outcome = outcomeFromError(new TypeError("Failed to fetch"));

    // Assert
    expect(outcome).toEqual({ kind: "failed", message: null });
  });
});
