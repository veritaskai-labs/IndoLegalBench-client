import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeGradingRun } from "@/test/rubricFixtures";
import { useRegrade } from "./useRegrade";

/** A promise the test settles by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useRegrade (POST /measurements/{id}/grade, AC7)", () => {
  // Positive: the chosen version goes to the server and the new run is handed back.
  it("asks for a re-grade with the chosen version and reports the new run", async () => {
    // Arrange
    const started = makeGradingRun({ id: "r-2", kind: "regrade", status: "queued" });
    const gateway = makeFakeGateway({ regrade: vi.fn().mockResolvedValue(started) });
    const onDone = vi.fn();
    const { result } = renderHook(() => useRegrade("s-1", "v-2", onDone, gateway));

    // Act
    await act(() => result.current.run());

    // Assert
    expect(gateway.regrade).toHaveBeenCalledWith("s-1", { rubric_version_id: "v-2" });
    expect(onDone).toHaveBeenCalledWith(started);
    expect(result.current).toMatchObject({ pending: false, error: null });
  });

  it("is pending while the request is in flight", async () => {
    // Arrange
    const request = deferred<ReturnType<typeof makeGradingRun>>();
    const gateway = makeFakeGateway({ regrade: vi.fn().mockReturnValue(request.promise) });
    const { result } = renderHook(() => useRegrade("s-1", "v-2", vi.fn(), gateway));

    // Act
    act(() => void result.current.run());
    const duringRequest = result.current.pending;
    await act(async () => request.resolve(makeGradingRun()));

    // Assert
    expect(duringRequest).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  // Negative: why the server cannot grade now (still running, wrong state) is shown as the server wrote it.
  it("shows the server reason on a 409 and does not report a run", async () => {
    // Arrange
    const refusal = new ApiError(409, "SESSION_NOT_GRADABLE", "Sesi masih berjalan");
    const gateway = makeFakeGateway({ regrade: vi.fn().mockRejectedValue(refusal) });
    const onDone = vi.fn();
    const { result } = renderHook(() => useRegrade("s-1", "v-2", onDone, gateway));

    // Act
    await act(() => result.current.run());

    // Assert
    expect(result.current.error).toBe("Sesi masih berjalan");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("explains a role change on a 403", async () => {
    // Arrange
    const gateway = makeFakeGateway({ regrade: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")) });
    const { result } = renderHook(() => useRegrade("s-1", "v-2", vi.fn(), gateway));

    // Act
    await act(() => result.current.run());

    // Assert
    expect(result.current.error).toBe("Peran Anda tidak lagi boleh menilai ulang sesi. Muat ulang halaman.");
  });

  it("gives the generic message when the request itself fails", async () => {
    // Arrange
    const gateway = makeFakeGateway({ regrade: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
    const { result } = renderHook(() => useRegrade("s-1", "v-2", vi.fn(), gateway));

    // Act
    await act(() => result.current.run());

    // Assert
    expect(result.current.error).toBe("Penilaian ulang gagal dimulai. Coba lagi.");
  });

  // Edge: a double click must not start two re-grades.
  it("ignores a second click while the first is in flight", async () => {
    // Arrange
    const request = deferred<ReturnType<typeof makeGradingRun>>();
    const gateway = makeFakeGateway({ regrade: vi.fn().mockReturnValue(request.promise) });
    const { result } = renderHook(() => useRegrade("s-1", "v-2", vi.fn(), gateway));

    // Act
    act(() => void result.current.run());
    await act(() => result.current.run());
    await act(async () => request.resolve(makeGradingRun()));

    // Assert
    expect(gateway.regrade).toHaveBeenCalledTimes(1);
  });

  // Edge: the version the dialog shows is the one that is sent, even if the list reloads under it.
  it("sends the version id it was given on the latest render", async () => {
    // Arrange
    const gateway = makeFakeGateway({ regrade: vi.fn().mockResolvedValue(makeGradingRun()) });
    const { result, rerender } = renderHook(({ versionId }) => useRegrade("s-1", versionId, vi.fn(), gateway), {
      initialProps: { versionId: "v-2" },
    });

    // Act
    rerender({ versionId: "v-3" });
    await act(() => result.current.run());

    // Assert
    expect(gateway.regrade).toHaveBeenCalledWith("s-1", { rubric_version_id: "v-3" });
  });
});
