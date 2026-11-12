import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingRunSummary } from "@/test/gradingFixtures";
import { useGradingRuns } from "./useGradingRuns";

// The hook takes the gateway as a parameter (DIP), so the test hands it a fake instead of mocking modules.
function fakeGateway(runs: GradingGateway["runs"]): GradingGateway {
  return { grade: vi.fn(), results: vi.fn(), sessions: vi.fn(), runs: vi.fn(runs), run: vi.fn() };
}

describe("useGradingRuns (PBI-14 AC7)", () => {
  it("loads the grading history of the session", async () => {
    const history = [gradingRunSummary({ grading_run_id: "run-2", kind: "regrade" }), gradingRunSummary({ is_latest: false })];
    const gateway = fakeGateway(() => Promise.resolve(history));

    const { result } = renderHook(() => useGradingRuns("s-1", gateway));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: history }));
    expect(gateway.runs).toHaveBeenCalledWith("s-1");
  });

  // A session never graded has an empty history: ready, not an error.
  it("treats an empty history as ready", async () => {
    const gateway = fakeGateway(() => Promise.resolve([]));

    const { result } = renderHook(() => useGradingRuns("s-1", gateway));

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: [] }));
  });

  it("explains a refusal in the section's own words", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(403, "FORBIDDEN")));

    const { result } = renderHook(() => useGradingRuns("s-1", gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Riwayat penilaian hanya dapat dilihat Admin. Muat ulang halaman.",
      }),
    );
  });

  it("falls back to a retry message for an unexpected failure and loads again on reload", async () => {
    const runs = vi
      .fn<GradingGateway["runs"]>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce([gradingRunSummary()]);
    const gateway = fakeGateway(runs);

    const { result } = renderHook(() => useGradingRuns("s-1", gateway));
    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Gagal memuat riwayat penilaian. Coba lagi." }),
    );
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(runs).toHaveBeenCalledTimes(2);
  });

  // Moving to another session must not keep showing the previous session's history.
  it("loads again for another session", async () => {
    const gateway = fakeGateway(() => Promise.resolve([]));

    const { rerender } = renderHook(({ id }) => useGradingRuns(id, gateway), { initialProps: { id: "s-1" } });
    await waitFor(() => expect(gateway.runs).toHaveBeenCalledWith("s-1"));
    rerender({ id: "s-2" });

    await waitFor(() => expect(gateway.runs).toHaveBeenCalledWith("s-2"));
  });
});
