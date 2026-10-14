import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { compareCaseVersions } from "@/lib/cases/versionApi";
import { makeCompare } from "@/test/versionFixtures";
import type { VersionCompare } from "@/types/caseVersion";
import { useVersionCompare } from "./useVersionCompare";

vi.mock("@/lib/cases/versionApi", () => ({ compareCaseVersions: vi.fn() }));

const compareMock = vi.mocked(compareCaseVersions);

const comparison = (changed: string[]) => makeCompare({ changed });

/** A promise the test settles by hand, to control reply order. */
function deferred() {
  let resolve: (value: VersionCompare) => void = () => undefined;
  const promise = new Promise<VersionCompare>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  compareMock.mockReset();
});

describe("useVersionCompare", () => {
  // Positive
  it("does nothing until a comparison is asked for", () => {
    // Arrange / Act
    const { result } = renderHook(() => useVersionCompare("case-1"));

    // Assert
    expect(result.current.status).toBe("idle");
    expect(compareMock).not.toHaveBeenCalled();
  });

  it("loads the comparison of the two version numbers and exposes it", async () => {
    // Arrange
    compareMock.mockResolvedValue(comparison(["category"]));
    const { result } = renderHook(() => useVersionCompare("case-1"));

    // Act
    await act(async () => result.current.compare(1, 2));

    // Assert
    expect(compareMock).toHaveBeenCalledWith("case-1", 1, 2);
    expect(result.current).toMatchObject({ status: "ready", result: { changed: ["category"] } });
  });

  it("is loading while the request runs", async () => {
    // Arrange
    const pending = deferred();
    compareMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useVersionCompare("case-1"));

    // Act
    act(() => void result.current.compare(1, 2));
    const duringRequest = result.current.status;
    await act(async () => pending.resolve(comparison([])));

    // Assert
    expect(duringRequest).toBe("loading");
    expect(result.current.status).toBe("ready");
  });

  // Negative
  it("reports the mapped message when a version does not exist", async () => {
    // Arrange
    compareMock.mockRejectedValue(new ApiError(404, "VERSION_NOT_FOUND"));
    const { result } = renderHook(() => useVersionCompare("case-1"));

    // Act
    await act(async () => result.current.compare(1, 9));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Salah satu versi yang dipilih tidak ditemukan.",
    });
  });

  it("recovers on the next comparison after a failure", async () => {
    // Arrange
    compareMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    compareMock.mockResolvedValueOnce(comparison([]));
    const { result } = renderHook(() => useVersionCompare("case-1"));
    await act(async () => result.current.compare(1, 2));

    // Act
    await act(async () => result.current.compare(1, 2));

    // Assert
    expect(result.current.status).toBe("ready");
  });

  // Edge: the user asks again before the first answer arrives.
  it("uses only the answer of the latest request", async () => {
    // Arrange
    const first = deferred();
    const second = deferred();
    compareMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useVersionCompare("case-1"));
    act(() => void result.current.compare(1, 2));
    act(() => void result.current.compare(2, 3));

    // Act
    await act(async () => second.resolve(comparison(["traps"])));
    await act(async () => first.resolve(comparison(["category"])));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ result: { changed: ["traps"] } });
  });

  // Edge: a late failure of an old request must not replace a newer result.
  it("ignores a late failure of an older request", async () => {
    // Arrange
    let rejectFirst: (reason: unknown) => void = () => undefined;
    const first = new Promise<VersionCompare>((_, reject) => {
      rejectFirst = reject;
    });
    compareMock.mockReturnValueOnce(first).mockResolvedValueOnce(comparison(["traps"]));
    const { result } = renderHook(() => useVersionCompare("case-1"));
    act(() => void result.current.compare(1, 2));

    // Act
    await act(async () => result.current.compare(2, 3));
    await act(async () => rejectFirst(new ApiError(500, "INTERNAL_ERROR")));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", result: { changed: ["traps"] } });
  });
});
