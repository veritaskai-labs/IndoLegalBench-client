import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { startCaseVersion } from "@/lib/cases/versionApi";
import type { CaseRead } from "@/types/case";
import { useStartNewVersion } from "./useStartNewVersion";

vi.mock("@/lib/cases/versionApi", () => ({ startCaseVersion: vi.fn() }));

const startMock = vi.mocked(startCaseVersion);

function draftCase(): CaseRead {
  return {
    id: "case-1",
    suite_id: "suite-1",
    case_code: "ILB-1",
    identity: { title: "Judul", question: "Tanya?", category: null },
    legal_refs: [],
    answer_criteria: {},
    traps: [],
    split_tag: "dev",
    status: "draft",
    completeness_pct: 50,
    version: 2,
    created_at: "2026-10-03T00:00:00Z",
    updated_at: "2026-10-03T00:00:00Z",
  };
}

beforeEach(() => {
  startMock.mockReset();
});

describe("useStartNewVersion", () => {
  // Positive
  it("hands the new draft to onStarted", async () => {
    // Arrange
    const onStarted = vi.fn();
    startMock.mockResolvedValue(draftCase());
    const { result } = renderHook(() => useStartNewVersion("case-1", onStarted));

    // Act
    await act(async () => result.current.start());

    // Assert
    expect(startMock).toHaveBeenCalledWith("case-1");
    expect(onStarted).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", version: 2 }));
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it("is pending while the request runs", async () => {
    // Arrange
    let finish: (draft: CaseRead) => void = () => undefined;
    startMock.mockReturnValue(new Promise<CaseRead>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useStartNewVersion("case-1", vi.fn()));

    // Act
    act(() => void result.current.start());
    const duringRequest = result.current.pending;
    await act(async () => finish(draftCase()));

    // Assert
    expect(duringRequest).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  // Negative
  it("shows the mapped message and does not call onStarted when a version is already in progress", async () => {
    // Arrange
    const onStarted = vi.fn();
    startMock.mockRejectedValue(new ApiError(409, "VERSION_IN_PROGRESS"));
    const { result } = renderHook(() => useStartNewVersion("case-1", onStarted));

    // Act
    await act(async () => result.current.start());

    // Assert
    expect(result.current.error).toBe("Sudah ada versi baru yang sedang dikerjakan atau ditinjau.");
    expect(onStarted).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it("uses the generic message for a network failure", async () => {
    // Arrange
    startMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useStartNewVersion("case-1", vi.fn()));

    // Act
    await act(async () => result.current.start());

    // Assert
    expect(result.current.error).toBe("Gagal membuat versi baru. Coba lagi.");
  });

  // Edge: a second click before the first request returns must not create a second version.
  it("ignores a second start while the first is still running", async () => {
    // Arrange
    let finish: (draft: CaseRead) => void = () => undefined;
    startMock.mockReturnValue(new Promise<CaseRead>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useStartNewVersion("case-1", vi.fn()));

    // Act
    act(() => {
      void result.current.start();
      void result.current.start();
    });
    await act(async () => finish(draftCase()));

    // Assert
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  // Edge: a retry clears the previous error.
  it("clears the old error when the user tries again", async () => {
    // Arrange
    const onStarted = vi.fn();
    startMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    startMock.mockResolvedValueOnce(draftCase());
    const { result } = renderHook(() => useStartNewVersion("case-1", onStarted));
    await act(async () => result.current.start());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    // Act
    await act(async () => result.current.start());

    // Assert
    expect(result.current.error).toBeNull();
    expect(onStarted).toHaveBeenCalledTimes(1);
  });
});
