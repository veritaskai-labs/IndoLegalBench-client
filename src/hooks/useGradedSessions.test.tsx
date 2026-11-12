import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradedSessionItem } from "@/test/gradingFixtures";
import { useGradedSessions } from "./useGradedSessions";

// The hook takes the gateway as a parameter (DIP), so the test hands it a fake instead of mocking modules.
function fakeGateway(sessions: GradingGateway["sessions"]): GradingGateway {
  return { grade: vi.fn(), results: vi.fn(), sessions: vi.fn(sessions), runs: vi.fn(), run: vi.fn() };
}

describe("useGradedSessions (PBI-14 AC8, Laporan list)", () => {
  it("loads the graded sessions", async () => {
    const list = [gradedSessionItem(), gradedSessionItem({ session_id: "s-2" })];
    const gateway = fakeGateway(() => Promise.resolve(list));

    const { result } = renderHook(() => useGradedSessions(gateway));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: list }));
    expect(gateway.sessions).toHaveBeenCalledTimes(1);
  });

  // Edge: no session has been graded yet; an empty list is a result, not an error.
  it("returns an empty list when nothing has been graded", async () => {
    const gateway = fakeGateway(() => Promise.resolve([]));

    const { result } = renderHook(() => useGradedSessions(gateway));

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: [] }));
  });

  it("explains a refusal", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(403, "FORBIDDEN")));

    const { result } = renderHook(() => useGradedSessions(gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Daftar hasil penilaian hanya dapat dilihat Admin, Viewer, dan Kontributor.",
      }),
    );
  });

  it("asks the server again on reload", async () => {
    const sessions = vi
      .fn<GradingGateway["sessions"]>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce([gradedSessionItem()]);
    const gateway: GradingGateway = { grade: vi.fn(), results: vi.fn(), sessions, runs: vi.fn(), run: vi.fn() };

    const { result } = renderHook(() => useGradedSessions(gateway));
    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Gagal memuat daftar sesi yang dinilai. Coba lagi." }),
    );

    act(() => result.current.reload());

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: [gradedSessionItem()] }));
    expect(sessions).toHaveBeenCalledTimes(2);
  });
});
