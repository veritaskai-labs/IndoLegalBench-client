import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { resetMockLocale, setMockLocale } from "@/lib/i18n/localeMock";
import { findCaseReview } from "@/lib/reviews/reviewApi";
import { CASE_ID, makeCaseReview } from "@/test/reviewFixtures";
import { useFoundCaseReview } from "./useFoundCaseReview";

vi.mock("@/lib/reviews/reviewApi", () => ({ findCaseReview: vi.fn() }));

const findMock = vi.mocked(findCaseReview);

beforeEach(() => {
  findMock.mockReset();
});

afterEach(() => {
  resetMockLocale();
});

describe("useFoundCaseReview", () => {
  // Positive
  it("starts loading and then exposes the review of the case", async () => {
    // Arrange
    findMock.mockResolvedValue(makeCaseReview({ round_no: 2 }));

    // Act
    const { result } = renderHook(() => useFoundCaseReview(CASE_ID));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", review: { round_no: 2 } });
    expect(findMock).toHaveBeenCalledWith(CASE_ID);
  });

  // Edge: not involved or never submitted is ready with nothing to show.
  it("is ready with a null review when there is nothing to show", async () => {
    // Arrange
    findMock.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useFoundCaseReview(CASE_ID));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", review: null });
  });

  // Negative
  it("exposes a mapped message when the request fails", async () => {
    // Arrange
    findMock.mockRejectedValue(new ApiError(500, "INTERNAL"));

    // Act
    const { result } = renderHook(() => useFoundCaseReview(CASE_ID));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat penilaian kasus. Coba lagi.",
    });
  });

  it("maps a failure in English when the language mock is English", async () => {
    setMockLocale("en");
    findMock.mockRejectedValue(new ApiError(500, "INTERNAL"));

    const { result } = renderHook(() => useFoundCaseReview(CASE_ID));
    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current).toMatchObject({
      message: "Could not load the case review. Try again.",
    });
  });
});
