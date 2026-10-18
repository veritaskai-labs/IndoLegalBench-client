import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listAssignedReviews } from "@/lib/reviews/reviewApi";
import { ASSIGNMENT_ID, makeAssigned, OTHER_ASSIGNMENT_ID } from "@/test/reviewFixtures";
import { useAssignedReview } from "./useAssignedReview";

vi.mock("@/lib/reviews/reviewApi", () => ({ listAssignedReviews: vi.fn() }));

const listMock = vi.mocked(listAssignedReviews);

beforeEach(() => {
  listMock.mockReset();
});

describe("useAssignedReview", () => {
  // Positive
  it("finds the assignment with the requested id", async () => {
    // Arrange
    listMock.mockResolvedValue([
      makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID, round_no: 2 }),
      makeAssigned({ assignment_id: ASSIGNMENT_ID, round_no: 1 }),
    ]);

    // Act
    const { result } = renderHook(() => useAssignedReview(ASSIGNMENT_ID, true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({
      status: "ready",
      assignment: { assignment_id: ASSIGNMENT_ID, round_no: 1 },
    });
  });

  // Edge: the list only holds active assignments of open rounds, so a finished or replaced one is missing.
  it("is ready with a null assignment when the id is not in the list", async () => {
    // Arrange
    listMock.mockResolvedValue([makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID })]);

    // Act
    const { result } = renderHook(() => useAssignedReview(ASSIGNMENT_ID, true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", assignment: null });
  });

  // Edge: moving to another assignment reuses the loaded list instead of asking the server again.
  it("switches assignment without another request", async () => {
    // Arrange
    listMock.mockResolvedValue([
      makeAssigned({ assignment_id: ASSIGNMENT_ID, round_no: 1 }),
      makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID, round_no: 2 }),
    ]);
    const { result, rerender } = renderHook(({ id }) => useAssignedReview(id, true), {
      initialProps: { id: ASSIGNMENT_ID },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender({ id: OTHER_ASSIGNMENT_ID });

    // Assert
    expect(result.current).toMatchObject({ assignment: { round_no: 2 } });
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  // Edge
  it("does not call the server when disabled", async () => {
    // Arrange
    listMock.mockResolvedValue([makeAssigned()]);

    // Act
    const { result } = renderHook(() => useAssignedReview(ASSIGNMENT_ID, false));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(listMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ assignment: null });
  });

  // Negative
  it("passes the load error through", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(500, "INTERNAL"));

    // Act
    const { result } = renderHook(() => useAssignedReview(ASSIGNMENT_ID, true));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat antrean tinjauan. Coba lagi.",
    });
  });
});
