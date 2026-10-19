import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/suites/suiteApi", () => ({ listActiveSuites: vi.fn() }));
vi.mock("@/lib/api/cases", () => ({ getCasesForSuite: vi.fn() }));
vi.mock("@/lib/reviews/reviewApi", () => ({ getCaseReview: vi.fn() }));
vi.mock("@/lib/cases/versionApi", () => ({ getOpenCaseVersion: vi.fn() }));

import { getCasesForSuite } from "@/lib/api/cases";
import { getOpenCaseVersion } from "@/lib/cases/versionApi";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { listActiveSuites } from "@/lib/suites/suiteApi";
import { listInReviewCases } from "./inReviewApi";
import type { CaseStatus, CaseSummary } from "@/lib/api/cases";
import type { CaseRead } from "@/types/case";
import type { Suite } from "@/types/suite";
import type { CaseReview } from "@/types/reviewAdmin";
import { ApiError } from "@/lib/apiClient";

const suitesMock = vi.mocked(listActiveSuites);
const casesMock = vi.mocked(getCasesForSuite);
const reviewMock = vi.mocked(getCaseReview);
const openVersionMock = vi.mocked(getOpenCaseVersion);

function suite(id: string): Suite {
  return { id, name: `Suite ${id}` } as Suite;
}

function summary(id: string, code: string, status: CaseStatus = "in_review"): CaseSummary {
  return {
    id,
    case_code: code,
    title: `Kasus ${code}`,
    split_tag: "dev",
    status,
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

function openVersion(version: number, status: CaseStatus): CaseRead {
  return { version, status } as CaseRead;
}

/** Kasus per suite dan per status, seperti GET /suites/{id}/cases?status=. */
function casesBySuite(table: Record<string, Partial<Record<CaseStatus, CaseSummary[]>>>) {
  casesMock.mockImplementation((suiteId, params) =>
    Promise.resolve(table[suiteId]?.[params?.status ?? "draft"] ?? []),
  );
}

function rejectWith(error: ApiError) {
  const failure = Promise.reject(error);
  failure.catch(() => undefined);
  return failure;
}

describe("listInReviewCases", () => {
  beforeEach(() => {
    suitesMock.mockReset();
    casesMock.mockReset();
    reviewMock.mockReset();
    openVersionMock.mockReset();
  });

  // Positif
  it("reads the in-review cases of every active suite with their review", async () => {
    suitesMock.mockResolvedValue([suite("s1"), suite("s2")]);
    casesBySuite({
      s1: { in_review: [summary("c1", "ILB-PT-0142")] },
      s2: { in_review: [summary("c2", "ILB-PT-0143")] },
    });
    reviewMock.mockImplementation((caseId) => Promise.resolve(review(caseId)));

    const rows = await listInReviewCases();

    expect(casesMock).toHaveBeenCalledWith("s1", { status: "in_review" });
    expect(casesMock).toHaveBeenCalledWith("s2", { status: "in_review" });
    expect(rows.map((row) => row.case.case_code)).toEqual([
      "ILB-PT-0142",
      "ILB-PT-0143",
    ]);
    expect(rows[0].review).toEqual(review("c1"));
    expect(rows[0].newVersion).toBeNull();
  });

  // Positif (F-02): versi baru dari kasus yang sudah disetujui tetap berstatus approved.
  it("includes an approved case whose new version is in review, with its version number", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesBySuite({
      s1: {
        in_review: [summary("c1", "ILB-PT-0142")],
        approved: [summary("c2", "ILB-PT-0150", "approved")],
      },
    });
    openVersionMock.mockResolvedValue(openVersion(2, "in_review"));
    reviewMock.mockImplementation((caseId) => Promise.resolve(review(caseId)));

    const rows = await listInReviewCases();

    expect(casesMock).toHaveBeenCalledWith("s1", { status: "approved" });
    expect(openVersionMock).toHaveBeenCalledWith("c2");
    expect(rows.map((row) => [row.case.case_code, row.newVersion])).toEqual([
      ["ILB-PT-0142", null],
      ["ILB-PT-0150", 2],
    ]);
    expect(rows[1].review).toEqual(review("c2"));
  });

  // Negatif: kasus disetujui tanpa versi terbuka (404 NO_OPEN_VERSION) bukan sedang direview.
  it("leaves out an approved case with no open version", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesBySuite({ s1: { approved: [summary("c2", "ILB-PT-0150", "approved")] } });
    openVersionMock.mockReturnValue(rejectWith(new ApiError(404, "NO_OPEN_VERSION")));

    await expect(listInReviewCases()).resolves.toEqual([]);
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // corner: versi baru yang masih draf atau dikembalikan untuk revisi belum ada di tangan reviewer.
  it.each(["draft", "needs_revision"] as const)(
    "leaves out an approved case whose new version is %s",
    async (status) => {
      suitesMock.mockResolvedValue([suite("s1")]);
      casesBySuite({ s1: { approved: [summary("c2", "ILB-PT-0150", "approved")] } });
      openVersionMock.mockResolvedValue(openVersion(2, status));

      await expect(listInReviewCases()).resolves.toEqual([]);
      expect(reviewMock).not.toHaveBeenCalled();
    },
  );

  // Negatif: galat lain saat membaca versi terbuka tidak boleh menyembunyikan kasusnya diam-diam.
  it("lets a real failure on the open version through", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesBySuite({ s1: { approved: [summary("c2", "ILB-PT-0150", "approved")] } });
    openVersionMock.mockReturnValue(rejectWith(new ApiError(500, "INTERNAL_ERROR")));

    await expect(listInReviewCases()).rejects.toBeInstanceOf(ApiError);
  });

  // corner: 404 NO_REVIEW_ROUND memang berarti kasusnya belum punya ronde.
  it("keeps the case when it has no review round yet", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesBySuite({ s1: { in_review: [summary("c1", "ILB-PT-0142")] } });
    reviewMock.mockReturnValue(rejectWith(new ApiError(404, "NO_REVIEW_ROUND")));

    const rows = await listInReviewCases();

    expect(rows).toHaveLength(1);
    expect(rows[0].review).toBeNull();
  });

  // Negatif: galat lain tidak boleh menyamar jadi "belum ada putaran review".
  it("lets a real failure through so the tab can show an error", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesBySuite({ s1: { in_review: [summary("c1", "ILB-PT-0142")] } });
    reviewMock.mockReturnValue(rejectWith(new ApiError(500, "INTERNAL_ERROR")));

    await expect(listInReviewCases()).rejects.toBeInstanceOf(ApiError);
  });

  // corner
  it("asks for no review when no suite has an in-review or approved case", async () => {
    suitesMock.mockResolvedValue([suite("s1")]);
    casesBySuite({});

    await expect(listInReviewCases()).resolves.toEqual([]);
    expect(reviewMock).not.toHaveBeenCalled();
    expect(openVersionMock).not.toHaveBeenCalled();
  });

  // corner
  it("asks for no case when there is no active suite", async () => {
    suitesMock.mockResolvedValue([]);

    await expect(listInReviewCases()).resolves.toEqual([]);
    expect(casesMock).not.toHaveBeenCalled();
  });
});