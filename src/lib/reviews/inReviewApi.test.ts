import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

import { ApiError, apiFetch } from "@/lib/apiClient";
import { listInReviewCases } from "./inReviewApi";
import type { components } from "@/lib/generated/api";
import type { CaseReview } from "@/types/reviewAdmin";

type InReviewCase = components["schemas"]["InReviewCase"];

const fetchMock = vi.mocked(apiFetch);

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

function item(caseId: string, code: string, versionNo: number): InReviewCase {
  return {
    case_id: caseId,
    case_code: code,
    title: `Kasus ${code}`,
    version_no: versionNo,
    review: review(caseId),
  };
}

function rejectWith(error: ApiError) {
  const failure = Promise.reject(error);
  failure.catch(() => undefined);
  return failure;
}

describe("listInReviewCases", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // Positif: satu permintaan ke daftar server, bukan per suite dan per kasus.
  it("reads the whole tab from GET /reviews/in-review in one request", async () => {
    fetchMock.mockResolvedValue([item("c1", "ILB-PT-0142", 1)]);

    const rows = await listInReviewCases();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/reviews/in-review");
    expect(rows).toEqual([
      {
        case: { id: "c1", case_code: "ILB-PT-0142", title: "Kasus ILB-PT-0142" },
        review: review("c1"),
        newVersion: null,
      },
    ]);
  });

  // Positif (F-02): versi di atas 1 berarti ada versi disetujui yang tetap berlaku.
  it("marks a version above 1 as a new version of an approved case", async () => {
    fetchMock.mockResolvedValue([item("c1", "ILB-PT-0142", 1), item("c2", "ILB-PT-0150", 2)]);

    const rows = await listInReviewCases();

    expect(rows.map((row) => [row.case.case_code, row.newVersion])).toEqual([
      ["ILB-PT-0142", null],
      ["ILB-PT-0150", 2],
    ]);
  });

  // corner
  it("returns an empty list when nothing is in review", async () => {
    fetchMock.mockResolvedValue([]);

    await expect(listInReviewCases()).resolves.toEqual([]);
  });

  // Negatif: 403 dan galat lain naik ke hook, yang memilih pesannya.
  it.each([403, 500])("lets a %i through so the tab can explain it", async (status) => {
    fetchMock.mockReturnValue(rejectWith(new ApiError(status, "ERROR")));

    await expect(listInReviewCases()).rejects.toMatchObject({ status });
  });
});
