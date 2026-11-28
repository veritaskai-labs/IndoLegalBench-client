import { describe, expect, it } from "vitest";
import { CASE_STATUS_LABEL, caseStatusLabel } from "./caseStatus";

describe("caseStatusLabel", () => {
  it("keeps the Indonesian names the screens already use", () => {
    expect(caseStatusLabel("draft")).toBe("Draft");
    expect(caseStatusLabel("in_review")).toBe("Dalam tinjauan");
    expect(caseStatusLabel("needs_revision")).toBe("Perlu revisi");
    expect(caseStatusLabel("approved")).toBe("Disetujui");
    expect(CASE_STATUS_LABEL).toEqual({
      draft: "Draft",
      in_review: "Dalam tinjauan",
      needs_revision: "Perlu revisi",
      approved: "Disetujui",
    });
  });

  it("names the same statuses in English", () => {
    expect(caseStatusLabel("draft", "en")).toBe("Draft");
    expect(caseStatusLabel("in_review", "en")).toBe("In review");
    expect(caseStatusLabel("needs_revision", "en")).toBe("Needs revision");
    expect(caseStatusLabel("approved", "en")).toBe("Approved");
  });
});
