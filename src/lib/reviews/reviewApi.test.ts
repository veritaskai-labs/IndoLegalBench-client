import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { listNeedsReassignment, replaceReviewer, getCaseReview } from "./reviewApi";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

const ASSIGNMENT_ID = "33333333-3333-3333-3333-333333333333";
const REVIEWER_ID = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue([]);
});

describe("listNeedsReassignment", () => {
  // Positive: AC8
  it("reads the admin reassignment queue", async () => {
    await listNeedsReassignment();

    expect(fetchMock).toHaveBeenCalledWith("/reviews/needs-reassignment");
  });

  // Positive
  it("hands back the rows the server returned", async () => {
    const rows = [
      {
        case_id: "c1",
        case_code: "ILB-PT-0142",
        case_title: "Pemberitahuan PHK",
        round_id: "r1",
        round_no: 1,
        round_status: "open" as const,
        active_reviewers_count: 1,
        void_assignments: [],
        assignments: [],
      },
    ];
    fetchMock.mockResolvedValue(rows);

    await expect(listNeedsReassignment()).resolves.toEqual(rows);
  });
});

describe("replaceReviewer", () => {
  // Positive: AC7 — alasan ikut terkirim, itu yang masuk jejak audit.
  it("posts the new reviewer and the reason", async () => {
    fetchMock.mockResolvedValue({});

    await replaceReviewer(ASSIGNMENT_ID, { new_reviewer_id: REVIEWER_ID, reason: "Cuti panjang" });

    expect(fetchMock).toHaveBeenCalledWith(`/reviews/${ASSIGNMENT_ID}/replace`, {
      method: "POST",
      body: JSON.stringify({ new_reviewer_id: REVIEWER_ID, reason: "Cuti panjang" }),
    });
  });

  // Corner: id dari URL bisa memuat karakter yang harus di-escape.
  it("encodes the assignment id", async () => {
    fetchMock.mockResolvedValue({});

    await replaceReviewer("a/b", { new_reviewer_id: REVIEWER_ID, reason: "x" });

    expect(fetchMock).toHaveBeenCalledWith("/reviews/a%2Fb/replace", expect.anything());
  });
});

const REVIEW: CaseReview = {
  case_id: "c1",
  case_version_id: "v1",
  round_no: 1,
  status: "open",
  decision: null,
  opened_at: "2026-10-16T03:00:00Z",
  decided_at: null,
  reviewers: [
    {
      assignment_id: "a1",
      reviewer: { id: "u1", name: "Roben" },
      status: "active",
      verdict: null,
    },
  ],
};

describe("getCaseReview", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // Positif
  it("reads the latest round of one case", async () => {
    fetchMock.mockResolvedValue(REVIEW);

    await expect(getCaseReview("c1")).resolves.toEqual(REVIEW);
    expect(fetchMock).toHaveBeenCalledWith("/cases/c1/review");
  });

  // Sudut
  it("escapes the case id in the path", async () => {
    fetchMock.mockResolvedValue(REVIEW);

    await getCaseReview("c 1/2");

    expect(fetchMock).toHaveBeenCalledWith("/cases/c%201%2F2/review");
  });
});
