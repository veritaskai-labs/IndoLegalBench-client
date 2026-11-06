import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeGradingRun } from "@/test/rubricFixtures";
import { useGradingRuns } from "./useGradingRuns";

describe("useGradingRuns (GET /measurements/{id}/grading-runs)", () => {
  // Positive
  it("loads the grading history of the session", async () => {
    // Arrange
    const runs = [makeGradingRun({ id: "r-2", kind: "regrade" }), makeGradingRun()];
    const gateway = makeFakeGateway({ listGradingRuns: vi.fn().mockResolvedValue(runs) });

    // Act
    const { result } = renderHook(() => useGradingRuns("s-1", gateway));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", data: runs });
    expect(gateway.listGradingRuns).toHaveBeenCalledWith("s-1");
  });

  // Edge: a session that was never graded has no history.
  it("is ready with an empty list for a session that was never graded", async () => {
    // Arrange
    const gateway = makeFakeGateway({ listGradingRuns: vi.fn().mockResolvedValue([]) });

    // Act
    const { result } = renderHook(() => useGradingRuns("s-1", gateway));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: [] });
  });

  // Negative
  it("turns a failure into the history error message", async () => {
    // Arrange
    const gateway = makeFakeGateway({ listGradingRuns: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")) });

    // Act
    const { result } = renderHook(() => useGradingRuns("s-1", gateway));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "Gagal memuat riwayat penilaian. Coba lagi." });
  });

  // Edge: moving to another session must not show the history of the first one.
  it("loads the history of the new session when the id changes", async () => {
    // Arrange
    const listGradingRuns = vi
      .fn()
      .mockResolvedValueOnce([makeGradingRun({ id: "r-a" })])
      .mockResolvedValueOnce([makeGradingRun({ id: "r-b" })]);
    const gateway = makeFakeGateway({ listGradingRuns });
    const { result, rerender } = renderHook(({ id }) => useGradingRuns(id, gateway), { initialProps: { id: "s-1" } });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender({ id: "s-2" });
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: [{ id: "r-b" }] }));

    // Assert
    expect(listGradingRuns).toHaveBeenNthCalledWith(2, "s-2");
  });
});
