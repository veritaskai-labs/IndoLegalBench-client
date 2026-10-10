import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listSnapshots } from "@/lib/suites/snapshotApi";
import { makeSnapshotPage, makeSnapshotSummary } from "@/test/snapshotFixtures";
import type { SnapshotPage } from "@/types/snapshot";
import { SNAPSHOT_PAGE_SIZE, useSnapshots } from "./useSnapshots";

vi.mock("@/lib/suites/snapshotApi", () => ({ listSnapshots: vi.fn() }));

const listMock = vi.mocked(listSnapshots);

/** A promise the test settles by hand, to control reply order. */
function deferred() {
  let resolve: (value: SnapshotPage) => void = () => undefined;
  const promise = new Promise<SnapshotPage>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  listMock.mockReset();
});

describe("useSnapshots", () => {
  // Positive
  it("starts loading and then exposes the page of snapshots", async () => {
    // Arrange
    listMock.mockResolvedValue(makeSnapshotPage([makeSnapshotSummary()]));

    // Act
    const { result } = renderHook(() => useSnapshots("suite-1", 1));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", page: { total: 1 } });
    expect(listMock).toHaveBeenCalledWith("suite-1", 1, SNAPSHOT_PAGE_SIZE);
  });

  // Edge: an empty list is a valid answer, not an error.
  it("stays ready when the suite has no snapshots", async () => {
    // Arrange
    listMock.mockResolvedValue(makeSnapshotPage([]));

    // Act
    const { result } = renderHook(() => useSnapshots("suite-1", 1));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", page: { items: [], total: 0 } });
  });

  // Negative
  it("reports the mapped message when the request fails", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(404, "SUITE_NOT_FOUND"));

    // Act
    const { result } = renderHook(() => useSnapshots("suite-1", 1));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "Suite tidak ditemukan." });
  });

  it("loads again on reload and shows loading in between", async () => {
    // Arrange
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    listMock.mockResolvedValueOnce(makeSnapshotPage([makeSnapshotSummary()]));
    const { result } = renderHook(() => useSnapshots("suite-1", 1));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());
    const duringReload = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(duringReload).toBe("loading");
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  // Edge: moving to another page must not show the previous page while waiting.
  it("shows loading for a new page instead of the old page", async () => {
    // Arrange
    const second = deferred();
    listMock.mockResolvedValueOnce(makeSnapshotPage([makeSnapshotSummary({ case_count: 1 })], { total: 12 }));
    listMock.mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ page }) => useSnapshots("suite-1", page), {
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender({ page: 2 });
    const waiting = result.current.status;
    await act(async () => second.resolve(makeSnapshotPage([], { page: 2, total: 12 })));

    // Assert
    expect(waiting).toBe("loading");
    expect(listMock).toHaveBeenLastCalledWith("suite-1", 2, SNAPSHOT_PAGE_SIZE);
    expect(result.current).toMatchObject({ status: "ready", page: { page: 2 } });
  });

  // Edge: a late reply for the previous page must not overwrite the current one.
  it("ignores a late reply for the previous page", async () => {
    // Arrange
    const first = deferred();
    listMock.mockReturnValueOnce(first.promise);
    listMock.mockResolvedValueOnce(makeSnapshotPage([], { page: 2, total: 12 }));
    const { result, rerender } = renderHook(({ page }) => useSnapshots("suite-1", page), {
      initialProps: { page: 1 },
    });

    // Act
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => first.resolve(makeSnapshotPage([makeSnapshotSummary()], { page: 1, total: 12 })));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", page: { page: 2 } });
  });
});
