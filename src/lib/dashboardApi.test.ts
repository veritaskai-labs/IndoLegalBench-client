import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import type { DashboardSummary } from "@/types/dashboard";
import { getDashboard } from "./dashboardApi";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));

const fetchMock = vi.mocked(apiFetch);

const SUMMARY: DashboardSummary = {
  generated_at: "2026-10-18T06:30:00Z",
  case_counts: { draft: 2, in_review: 1, needs_revision: 0, approved: 3 },
  total_cases: 6,
  waiting_for_review: 1,
  own_cases: null,
  review_queue: null,
  needs_reassignment: null,
  latest_run: null,
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("getDashboard", () => {
  // Positive: satu panggilan, semua angka sekaligus — itu yang membuatnya aman di-poll.
  it("reads the whole summary from one call", async () => {
    fetchMock.mockResolvedValue(SUMMARY);

    await expect(getDashboard()).resolves.toEqual(SUMMARY);
    expect(fetchMock).toHaveBeenCalledWith("/dashboard");
  });
});