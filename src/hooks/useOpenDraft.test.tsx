import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getOpenCaseVersion } from "@/lib/cases/versionApi";
import type { CaseRead } from "@/types/case";
import { useOpenDraft } from "./useOpenDraft";

vi.mock("@/lib/cases/versionApi", () => ({ getOpenCaseVersion: vi.fn() }));

const openMock = vi.mocked(getOpenCaseVersion);

const draft = { id: "case-1", status: "draft", version: 2 } as CaseRead;

const onFound = vi.fn();

beforeEach(() => {
  openMock.mockReset();
  onFound.mockReset();
});

describe("useOpenDraft", () => {
  // Positive
  it("loads the open draft of the case once it is allowed to look", async () => {
    // Arrange
    openMock.mockResolvedValue(draft);

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: draft });
    expect(openMock).toHaveBeenCalledWith("case-1");
  });

  // Edge: a case with only an approved version is normal, so "no open version" is not an error.
  it("reports no draft, not an error, when the server says NO_OPEN_VERSION", async () => {
    // Arrange
    openMock.mockRejectedValue(new ApiError(404, "NO_OPEN_VERSION"));

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: null });
  });

  // Edge: a 403 sends the user to /forbidden, so the caller must be able to skip the request.
  it("does not ask the server when it is not allowed to look", async () => {
    // Arrange / Act
    const { result } = renderHook(() => useOpenDraft("case-1", false, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: null });
    expect(openMock).not.toHaveBeenCalled();
  });

  // Negative
  it("shows a message when the draft cannot be loaded", async () => {
    // Arrange
    openMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat draf versi baru. Coba lagi.",
    });
  });

  it("does not hide a missing case behind the no-draft answer", async () => {
    // Arrange
    openMock.mockRejectedValue(new ApiError(404, "not_found"));

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({ status: "error", message: "Kasus tidak ditemukan." });
  });

  it("asks again after reload", async () => {
    // Arrange
    openMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    openMock.mockResolvedValueOnce(draft);
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: draft });
    expect(openMock).toHaveBeenCalledTimes(2);
  });

  // Positive: the page fills the editor from the draft the hook found.
  it("hands the found draft to the caller", async () => {
    // Arrange
    openMock.mockResolvedValue(draft);

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(onFound).toHaveBeenCalledTimes(1);
    expect(onFound).toHaveBeenCalledWith(draft);
  });

  // Negative
  it("hands nothing over when the case has no open version", async () => {
    // Arrange
    openMock.mockRejectedValue(new ApiError(404, "NO_OPEN_VERSION"));

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(onFound).not.toHaveBeenCalled();
  });

  // Edge: a slow reply for another case must not overwrite the case on screen.
  it("ignores a draft that belongs to another case", async () => {
    // Arrange
    openMock.mockResolvedValue({ ...draft, id: "case-2" });

    // Act
    const { result } = renderHook(() => useOpenDraft("case-1", true, onFound));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(onFound).not.toHaveBeenCalled();
  });
});
