import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/lib/apiClient";
import { listNeedsReassignment, replaceReviewer } from "./reviewApi";
import type { ReassignmentRow, ReplacedAssignment } from "@/types/reviewAdmin";

const fetchMock = vi.mocked(apiFetch);

const ROW: ReassignmentRow = {
  case_id: "c1",
  case_code: "ILB-PT-0142",
  case_title: "Sengketa tanah warisan",
  round_id: "r1",
  round_no: 1,
  round_status: "open",
  active_reviewers_count: 0,
  void_assignments: [],
  assignments: [],
};

const REPLACED: ReplacedAssignment = {
  id: "asg-baru",
  review_round_id: "r1",
  reviewer_id: "u9",
  source: "admin",
  assigned_at: "2026-10-18T02:00:00Z",
  status: "active",
  replaced_assignment_id: "asg-1",
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("listNeedsReassignment", () => {
  // Positif
  it("reads the admin reassignment queue", async () => {
    fetchMock.mockResolvedValue([ROW]);

    await expect(listNeedsReassignment()).resolves.toEqual([ROW]);
    expect(fetchMock).toHaveBeenCalledWith("/reviews/needs-reassignment");
  });

  // corner: antrean kosong tetap sebuah daftar, bukan null.
  it("hands back an empty list when nothing needs a reviewer", async () => {
    fetchMock.mockResolvedValue([]);

    await expect(listNeedsReassignment()).resolves.toEqual([]);
  });
});

describe("replaceReviewer", () => {
  // Positif
  it("posts the new reviewer and the reason", async () => {
    fetchMock.mockResolvedValue(REPLACED);

    await expect(
      replaceReviewer("asg-1", {
        new_reviewer_id: "u9",
        reason: "Reviewer sedang cuti",
      }),
    ).resolves.toEqual(REPLACED);
    expect(fetchMock).toHaveBeenCalledWith("/reviews/asg-1/replace", {
      method: "POST",
      body: JSON.stringify({
        new_reviewer_id: "u9",
        reason: "Reviewer sedang cuti",
      }),
    });
  });

  // corner: id penugasan masuk ke path, jadi harus di-encode.
  it("encodes the assignment id in the path", async () => {
    fetchMock.mockResolvedValue(REPLACED);

    await replaceReviewer("asg 7/8", {
      new_reviewer_id: "u9",
      reason: "Pindah tim",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/reviews/asg%207%2F8/replace",
      expect.anything(),
    );
  });
});