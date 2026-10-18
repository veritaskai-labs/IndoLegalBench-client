import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { makeSummary } from "@/test/versionFixtures";
import { useIsCaseCreator } from "./useIsCaseCreator";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);

const wroteVersionOne = (id: string) => [makeSummary(1, { author: { id, name: "Penulis" } })];

beforeEach(() => {
  listMock.mockReset();
});

describe("useIsCaseCreator", () => {
  // Positive
  it("is true once the history says the user wrote version 1", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u1"));

    // Act
    const { result } = renderHook(() => useIsCaseCreator("case-1", "u1", true));

    // Assert
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
    expect(listMock).toHaveBeenCalledWith("case-1");
  });

  // Negative
  it("stays false for a user who did not write version 1", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u2"));

    // Act
    const { result } = renderHook(() => useIsCaseCreator("case-1", "u1", true));

    // Assert
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(false);
  });

  // Edge: the caller may already know the answer and then no request is needed.
  it("does not ask for the history when it is not needed", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u1"));

    // Act
    const { result } = renderHook(() => useIsCaseCreator("case-1", "u1", false));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });

  // Negative: a history that cannot be read never grants anything.
  it("stays false when the history cannot be loaded", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(500, "INTERNAL"));

    // Act
    const { result } = renderHook(() => useIsCaseCreator("case-1", "u1", true));

    // Assert
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(false);
  });
});
