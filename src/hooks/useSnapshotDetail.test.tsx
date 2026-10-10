import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getSnapshot } from "@/lib/suites/snapshotApi";
import { makeSnapshot } from "@/test/snapshotFixtures";
import type { SnapshotRead } from "@/types/snapshot";
import { useSnapshotDetail } from "./useSnapshotDetail";

vi.mock("@/lib/suites/snapshotApi", () => ({ getSnapshot: vi.fn() }));

const getMock = vi.mocked(getSnapshot);

beforeEach(() => {
  getMock.mockReset();
});

describe("useSnapshotDetail", () => {
  // Positive
  it("starts loading and then exposes the snapshot", async () => {
    // Arrange
    getMock.mockResolvedValue(makeSnapshot());

    // Act
    const { result } = renderHook(() => useSnapshotDetail("snap-1"));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", snapshot: { author: { name: "Aileen" } } });
    expect(getMock).toHaveBeenCalledWith("snap-1");
  });

  // Negative
  it("reports the mapped message when the snapshot is missing", async () => {
    // Arrange
    getMock.mockRejectedValue(new ApiError(404, "SNAPSHOT_NOT_FOUND"));

    // Act
    const { result } = renderHook(() => useSnapshotDetail("snap-1"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "Snapshot tidak ditemukan." });
  });

  it("recovers on reload after a failure", async () => {
    // Arrange
    getMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    getMock.mockResolvedValueOnce(makeSnapshot());
    const { result } = renderHook(() => useSnapshotDetail("snap-1"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  // Edge: opening another snapshot must not show the previous one while waiting.
  it("shows loading for another snapshot instead of the old one", async () => {
    // Arrange
    let finish: (value: SnapshotRead) => void = () => undefined;
    getMock.mockResolvedValueOnce(makeSnapshot({ id: "snap-1" }));
    getMock.mockReturnValueOnce(new Promise<SnapshotRead>((resolve) => (finish = resolve)));
    const { result, rerender } = renderHook(({ id }) => useSnapshotDetail(id), {
      initialProps: { id: "snap-1" },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender({ id: "snap-2" });
    const waiting = result.current.status;
    await act(async () => finish(makeSnapshot({ id: "snap-2" })));

    // Assert
    expect(waiting).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", snapshot: { id: "snap-2" } });
  });
});
