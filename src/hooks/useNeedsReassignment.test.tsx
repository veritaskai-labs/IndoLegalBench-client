import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reviews/reviewApi", () => ({ listNeedsReassignment: vi.fn() }));

import { ApiError } from "@/lib/apiClient";
import { listNeedsReassignment } from "@/lib/reviews/reviewApi";
import { useNeedsReassignment } from "./useNeedsReassignment";
import type { ReassignmentRow } from "@/types/reviewAdmin";

const listMock = vi.mocked(listNeedsReassignment);

const ROW: ReassignmentRow = {
  case_id: "c1",
  case_code: "ILB-PT-0142",
  case_title: "Sengketa tanah warisan",
  round_id: "r1",
  round_no: 1,
  round_status: "awaiting_assignment",
  active_reviewers_count: 0,
  void_assignments: [],
  assignments: [],
};

/** Ditangkap di sini supaya penolakan tidak jadi unhandled rejection di runner. */
function rejectedWith(error: unknown) {
  const failure = Promise.reject(error);
  failure.catch(() => undefined);
  return failure;
}

describe("useNeedsReassignment", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  // Positif
  it("waits, then hands the queue back", async () => {
    listMock.mockResolvedValue([ROW]);

    const { result } = renderHook(() => useNeedsReassignment());
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: [ROW] });
  });

  // Negatif
  it("says the page is admin only on 403", async () => {
    listMock.mockReturnValue(rejectedWith(new ApiError(403, "FORBIDDEN")));

    const { result } = renderHook(() => useNeedsReassignment());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      message: "Hanya Admin yang boleh membuka pemantauan review.",
    });
  });

  // Negatif
  it("keeps one general message for anything else", async () => {
    listMock.mockReturnValue(rejectedWith(new Error("offline")));

    const { result } = renderHook(() => useNeedsReassignment());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      message: "Gagal memuat antrean penugasan ulang. Coba lagi.",
    });
  });

  // corner
  it("asks the server again when the queue is reloaded", async () => {
    listMock.mockResolvedValue([ROW]);

    const { result } = renderHook(() => useNeedsReassignment());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });
});