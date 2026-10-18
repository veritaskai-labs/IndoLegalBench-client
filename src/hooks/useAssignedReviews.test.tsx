import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listAssignedReviews } from "@/lib/reviews/reviewApi";
import { makeAssigned, OTHER_ASSIGNMENT_ID } from "@/test/reviewFixtures";
import { useAssignedReviews } from "./useAssignedReviews";

vi.mock("@/lib/reviews/reviewApi", () => ({ listAssignedReviews: vi.fn() }));

const listMock = vi.mocked(listAssignedReviews);

beforeEach(() => {
  listMock.mockReset();
});

describe("useAssignedReviews", () => {
  // Positive
  it("starts loading and then exposes the assignments in the server's order", async () => {
    // Arrange
    listMock.mockResolvedValue([makeAssigned(), makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID })]);

    // Act
    const { result } = renderHook(() => useAssignedReviews(true));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({
      status: "ready",
      reviews: [{ round_no: 1 }, { assignment_id: OTHER_ASSIGNMENT_ID }],
    });
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  // Edge: an empty queue is a valid answer, not an error.
  it("is ready with an empty list when nothing is assigned", async () => {
    // Arrange
    listMock.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useAssignedReviews(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", reviews: [] });
  });

  // Edge: the server answers 403 for anyone but a reviewer, and a 403 redirects to /forbidden.
  it("does not call the server when disabled", async () => {
    // Arrange
    listMock.mockResolvedValue([makeAssigned()]);

    // Act
    const { result } = renderHook(() => useAssignedReviews(false));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(listMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: "ready", reviews: [] });
  });

  // Negative
  it("exposes a mapped message when the request fails", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(500, "INTERNAL"));

    // Act
    const { result } = renderHook(() => useAssignedReviews(true));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat antrean tinjauan. Coba lagi.",
    });
  });

  // Positive
  it("loads again after reload", async () => {
    // Arrange
    listMock.mockResolvedValueOnce([]).mockResolvedValueOnce([makeAssigned()]);
    const { result } = renderHook(() => useAssignedReviews(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ reviews: [{ round_no: 1 }] }));

    // Assert
    expect(listMock).toHaveBeenCalledTimes(2);
  });
});
