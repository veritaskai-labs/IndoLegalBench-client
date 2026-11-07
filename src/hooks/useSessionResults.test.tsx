import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { useSessionResults } from "./useSessionResults";

// The hook takes the gateway as a parameter (DIP), so the test hands it a fake instead of mocking modules.
function fakeGateway(results: GradingGateway["results"]): GradingGateway {
  return { grade: vi.fn(), results: vi.fn(results) };
}

describe("useSessionResults (PBI-14 AC8)", () => {
  it("loads the latest grading of the session", async () => {
    const graded = gradingResponse();
    const gateway = fakeGateway(() => Promise.resolve(graded));

    const { result } = renderHook(() => useSessionResults("s-1", gateway));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: graded }));
    expect(gateway.results).toHaveBeenCalledWith("s-1");
  });

  // Before the first grading the server answers 404 GRADING_NOT_FOUND: an empty result, not an error.
  it("reads 404 GRADING_NOT_FOUND as not graded yet", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(404, "GRADING_NOT_FOUND")));

    const { result } = renderHook(() => useSessionResults("s-1", gateway));

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: null }));
  });

  // server#114: Developer AI on a running session gets 403; the section explains it.
  it("explains a refusal for the results of a running session", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(403, "FORBIDDEN")));

    const { result } = renderHook(() => useSessionResults("s-1", gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.",
      }),
    );
  });

  it("offers a retry message for a network error", async () => {
    const gateway = fakeGateway(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useSessionResults("s-1", gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Gagal memuat hasil penilaian. Coba lagi." }),
    );
  });

  // After Nilai the section reloads, so the table shows the server's own (role-masked) result.
  it("asks the server again on reload", async () => {
    const results = vi
      .fn<GradingGateway["results"]>()
      .mockRejectedValueOnce(new ApiError(404, "GRADING_NOT_FOUND"))
      .mockResolvedValueOnce(gradingResponse());
    const gateway: GradingGateway = { grade: vi.fn(), results };

    const { result } = renderHook(() => useSessionResults("s-1", gateway));
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: null }));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: gradingResponse() }));
    expect(results).toHaveBeenCalledTimes(2);
  });
});
