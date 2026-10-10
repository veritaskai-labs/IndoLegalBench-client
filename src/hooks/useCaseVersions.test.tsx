import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listCaseVersions } from "@/lib/cases/versionApi";
import type { VersionSummary } from "@/types/caseVersion";
import { useCaseVersions } from "./useCaseVersions";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);

function version(versionNo: number): VersionSummary {
  return {
    version_no: versionNo,
    status: "approved",
    author: { id: "u1", name: "Aileen" },
    created_at: "2026-10-03T07:05:00Z",
    changed: [],
  };
}

/** A promise the test settles by hand, to control reply order. */
function deferred() {
  let resolve: (value: VersionSummary[]) => void = () => undefined;
  const promise = new Promise<VersionSummary[]>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  listMock.mockReset();
});

describe("useCaseVersions", () => {
  // Positive
  it("starts loading and then exposes the versions", async () => {
    // Arrange
    listMock.mockResolvedValue([version(2), version(1)]);

    // Act
    const { result } = renderHook(() => useCaseVersions("case-1"));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({
      status: "ready",
      versions: [{ version_no: 2 }, { version_no: 1 }],
    });
    expect(listMock).toHaveBeenCalledWith("case-1");
  });

  // Edge: an empty history is a valid answer, not an error.
  it("stays ready when the case has no versions", async () => {
    // Arrange
    listMock.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useCaseVersions("case-1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", versions: [] });
  });

  // Negative
  it("reports the mapped message when the request fails", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(403, "FORBIDDEN"));

    // Act
    const { result } = renderHook(() => useCaseVersions("case-1"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Anda tidak memiliki izin untuk melihat riwayat versi kasus ini.",
    });
  });

  it("reloads after a failure and shows the versions on retry", async () => {
    // Arrange
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    listMock.mockResolvedValueOnce([version(1)]);
    const { result } = renderHook(() => useCaseVersions("case-1"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", versions: [{ version_no: 1 }] });
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  // Edge: a failure that arrives after the case id changed must not show an error.
  it("ignores a late failure for the previous case id", async () => {
    // Arrange
    let rejectFirst: (reason: unknown) => void = () => undefined;
    const first = new Promise<VersionSummary[]>((_, reject) => {
      rejectFirst = reject;
    });
    listMock.mockReturnValueOnce(first).mockResolvedValueOnce([version(7)]);
    const { result, rerender } = renderHook(({ id }) => useCaseVersions(id), {
      initialProps: { id: "A" },
    });

    // Act
    rerender({ id: "B" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => rejectFirst(new ApiError(500, "INTERNAL_ERROR")));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", versions: [{ version_no: 7 }] });
  });

  // Edge: a late reply for the previous case must not overwrite the current one.
  it("ignores a late reply for the previous case id", async () => {
    // Arrange
    const first = deferred();
    listMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce([version(7)]);
    const { result, rerender } = renderHook(({ id }) => useCaseVersions(id), {
      initialProps: { id: "A" },
    });

    // Act
    rerender({ id: "B" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => first.resolve([version(1)]));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", versions: [{ version_no: 7 }] });
  });
});
