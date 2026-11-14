import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { useSessionRun } from "./useSessionRun";

// The hook takes the gateway as a parameter (DIP), so the test hands it a fake instead of mocking modules.
function fakeGateway(run: GradingGateway["run"]): GradingGateway {
  return { grade: vi.fn(), results: vi.fn(), sessions: vi.fn(), runs: vi.fn(), run: vi.fn(run), estimate: vi.fn() };
}

describe("useSessionRun (PBI-22 AC9, open one run from Laporan)", () => {
  it("loads the run that was asked for, not the latest result", async () => {
    const lama = gradingResponse({ grading_run_id: "run-1", is_latest: false });
    const gateway = fakeGateway(() => Promise.resolve(lama));

    const { result } = renderHook(() => useSessionRun("s-1", "run-1", gateway));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: lama }));
    expect(gateway.run).toHaveBeenCalledWith("s-1", "run-1");
    expect(gateway.results).not.toHaveBeenCalled();
  });

  // Unlike the latest result, a run that is not found is an error, not an empty "not graded yet".
  it("explains a run that does not exist", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(404, "GRADING_RUN_NOT_FOUND")));

    const { result } = renderHook(() => useSessionRun("s-1", "run-x", gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Hasil penilaian ini tidak ditemukan. Muat ulang halaman." }),
    );
  });

  it("explains a refusal for a session that is still running", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(403, "FORBIDDEN")));

    const { result } = renderHook(() => useSessionRun("s-1", "run-1", gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.",
      }),
    );
  });

  // Moving to another run must not show the previous run's data.
  it("loads again when the run id changes", async () => {
    const run = vi.fn<GradingGateway["run"]>((_, runId) => Promise.resolve(gradingResponse({ grading_run_id: runId })));
    const gateway = fakeGateway(run);

    const { result, rerender } = renderHook(({ runId }) => useSessionRun("s-1", runId, gateway), { initialProps: { runId: "run-1" } });
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready" }));
    rerender({ runId: "run-2" });

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: { grading_run_id: "run-2" } }));
    expect(run).toHaveBeenCalledTimes(2);
  });
});
