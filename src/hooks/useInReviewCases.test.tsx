import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reviews/inReviewApi", () => ({ listInReviewCases: vi.fn() }));

import { ApiError } from "@/lib/apiClient";
import { listInReviewCases } from "@/lib/reviews/inReviewApi";
import { useInReviewCases } from "./useInReviewCases";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";

const listMock = vi.mocked(listInReviewCases);

const ROW: InReviewRow = {
  case: {
    id: "c1",
    case_code: "ILB-PT-0142",
    title: "Sengketa tanah warisan",
    split_tag: "dev",
    status: "in_review",
    completeness_pct: 100,
    updated_at: "2026-10-16T03:00:00Z",
  },
  review: {
    case_id: "c1",
    case_version_id: "v1",
    round_no: 1,
    status: "open",
    decision: null,
    opened_at: "2026-10-16T03:00:00Z",
    decided_at: null,
    reviewers: [],
  },
  newVersion: null,
};

/** Ditangkap di sini supaya penolakan tidak jadi unhandled rejection di runner. */
function rejectedWith(error: unknown) {
  const failure = Promise.reject(error);
  failure.catch(() => undefined);
  return failure;
}

describe("useInReviewCases", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  // Positif
  it("waits, then hands the list back", async () => {
    listMock.mockResolvedValue([ROW]);

    const { result } = renderHook(() => useInReviewCases());
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: [ROW] });
  });

  // Negatif
  it("says the page is admin only on 403", async () => {
    listMock.mockReturnValue(rejectedWith(new ApiError(403, "FORBIDDEN")));

    const { result } = renderHook(() => useInReviewCases());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      message: "Hanya Admin yang boleh membuka pemantauan review.",
    });
  });

  // Negatif
  it("keeps one general message for anything else", async () => {
    listMock.mockReturnValue(rejectedWith(new Error("offline")));

    const { result } = renderHook(() => useInReviewCases());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      message: "Gagal memuat kasus yang sedang direview. Coba lagi.",
    });
  });

  // corner
  it("asks the server again when the list is reloaded", async () => {
    listMock.mockResolvedValue([ROW]);

    const { result } = renderHook(() => useInReviewCases());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });
});