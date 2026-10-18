import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/suites/suiteApi", () => ({ listActiveSuites: vi.fn() }));
vi.mock("@/lib/api/cases", () => ({ getCasesForSuite: vi.fn() }));
vi.mock("@/lib/reviews/reviewApi", () => ({ getCaseReview: vi.fn() }));

import { getCasesForSuite } from "@/lib/api/cases";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { listActiveSuites } from "@/lib/suites/suiteApi";
import { listInReviewCases } from "./inReviewApi";
import type { CaseSummary } from "@/lib/api/cases";
import type { Suite } from "@/types/suite";
import type { CaseReview } from "@/types/reviewAdmin";
import { ApiError } from "@/lib/apiClient";

const suitesMock = vi.mocked(listActiveSuites);
const casesMock = vi.mocked(getCasesForSuite);
const reviewMock = vi.mocked(getCaseReview);

function suite(id: string): Suite {
  return { id, name: `Suite ${id}` } as Suite;
}

function summary(id: string, code: string): CaseSummary {
  return {
    id,
    case_code: code,
    title: `Kasus ${code}`,
    split_tag: "dev",
    status: "in_review",
    completeness_pct: 100,
    updated_at: "2026-10-16T03:00:00Z",
  };
}

function review(caseId: string): CaseReview {
  return {
    case_id: caseId,
    case_version_id: `v-${caseId}`,
    round_no: 1,
    status: "open",
    decision: null,
    opened_at: "2026-10-16T03:00:00Z",
    decided_at: null,
    reviewers: [],
  };
}

describe("listInReviewCases", () => {
  beforeEach(() => {
    suitesMock.mockReset();
    casesMock.mockReset();
    reviewMock.mockReset();
  });

  // Positif
  it("reads the in-review cases of every active suite with their review", async () => {
    suitesMock.mockResolvedValue([suite("s1"), suite("s2")]);
    casesMock
      .mockResolvedValueOnce([summary("c1", "ILB-PT-0142")])
      .mockResolvedValueOnce([summary("c2", "ILB-PT-0143")]);
    reviewMock.mockImplementation((caseId) => Promise.resolve(review(caseId)));

    const rows = await listInReviewCases();

    expect(casesMock).toHaveBeenCalledWith("s1", { status: "in_review" });
    expect(casesMock).toHaveBeenCalledWith("s2", { status: "in_review" });
    expect(rows.map((row) => row.case.case_code)).toEqual([
      "ILB-PT-0142",
      "ILB-PT-0143",
    ]);
    expect(rows[0].review).toEqual(review("c1"));
  });

  // corner: 404 NO_REVIEW_ROUND memang berarti kasusnya belum punya ronde.
  it("keeps the case when it has no review round yet", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesMock.mockResolvedValue([summary("c1", "ILB-PT-0142")]);
    const failure = Promise.reject(new ApiError(404, "NO_REVIEW_ROUND"));
    failure.catch(() => undefined);
    reviewMock.mockReturnValue(failure);

    const rows = await listInReviewCases();

    expect(rows).toHaveLength(1);
    expect(rows[0].review).toBeNull();
  });

  // Negatif: galat lain tidak boleh menyamar jadi "belum ada putaran review".
  it("lets a real failure through so the tab can show an error", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesMock.mockResolvedValue([summary("c1", "ILB-PT-0142")]);
    const failure = Promise.reject(new ApiError(500, "INTERNAL_ERROR"));
    failure.catch(() => undefined);
    reviewMock.mockReturnValue(failure);

    await expect(listInReviewCases()).rejects.toBeInstanceOf(ApiError);
  });

  // corner
  it("asks for no review when no suite has an in-review case", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesMock.mockResolvedValue([]);

    await expect(listInReviewCases()).resolves.toEqual([]);
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // corner
  it("asks for no case when there is no active suite", async () => {
    suitesMock.mockResolvedValue([]);

    await expect(listInReviewCases()).resolves.toEqual([]);
    expect(casesMock).not.toHaveBeenCalled();
  });
});