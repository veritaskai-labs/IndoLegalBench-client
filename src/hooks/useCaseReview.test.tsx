import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { CASE_ID, makeCaseReview, makeSlot, makeVerdictView } from "@/test/reviewFixtures";
import { useCaseReview } from "./useCaseReview";

vi.mock("@/lib/reviews/reviewApi", () => ({ getCaseReview: vi.fn() }));

const reviewMock = vi.mocked(getCaseReview);

beforeEach(() => {
  reviewMock.mockReset();
});

describe("useCaseReview", () => {
  // Positive
  it("starts loading and then exposes the review of the case", async () => {
    // Arrange
    reviewMock.mockResolvedValue(makeCaseReview({ round_no: 2 }));

    // Act
    const { result } = renderHook(() => useCaseReview(CASE_ID, true));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", review: { round_no: 2 } });
    expect(reviewMock).toHaveBeenCalledWith(CASE_ID);
  });

  // Edge: a hidden verdict stays null all the way to the page, nothing fills it in.
  it("keeps another reviewer's hidden verdict null while the round is open", async () => {
    // Arrange
    reviewMock.mockResolvedValue(
      makeCaseReview({ status: "open", reviewers: [makeSlot({ verdict: null })] }),
    );

    // Act
    const { result } = renderHook(() => useCaseReview(CASE_ID, true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ review: { reviewers: [{ verdict: null }] } });
  });

  // Edge: the verdicts arrive once the round is decided.
  it("exposes both verdicts once the server sends them", async () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "revise", comment: "Pasal salah" });
    reviewMock.mockResolvedValue(
      makeCaseReview({ status: "decided", decision: "revise", reviewers: [makeSlot({ verdict })] }),
    );

    // Act
    const { result } = renderHook(() => useCaseReview(CASE_ID, true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({
      review: { decision: "revise", reviewers: [{ verdict: { comment: "Pasal salah" } }] },
    });
  });

  // Edge: the server answers 403 to anyone who may not open the review, and a 403 redirects to /forbidden.
  it("does not call the server when disabled", async () => {
    // Arrange
    reviewMock.mockResolvedValue(makeCaseReview());

    // Act
    const { result } = renderHook(() => useCaseReview(CASE_ID, false));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(reviewMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: "ready", review: null });
  });

  // Negative
  it("says the case was never submitted when there is no round", async () => {
    // Arrange
    reviewMock.mockRejectedValue(new ApiError(404, "NO_REVIEW_ROUND"));

    // Act
    const { result } = renderHook(() => useCaseReview(CASE_ID, true));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Kasus ini belum pernah diajukan untuk ditinjau.",
    });
  });

  // Positive: after a verdict is sent the page bumps the key to see the new state of the round.
  it("loads again when the refresh key changes", async () => {
    // Arrange
    reviewMock.mockResolvedValueOnce(makeCaseReview({ status: "open" }));
    reviewMock.mockResolvedValueOnce(makeCaseReview({ status: "decided" }));
    const { result, rerender } = renderHook(({ key }) => useCaseReview(CASE_ID, true, key), {
      initialProps: { key: "" },
    });
    await waitFor(() => expect(result.current).toMatchObject({ review: { status: "open" } }));

    // Act
    rerender({ key: "2026-10-14T03:00:00Z" });
    await waitFor(() => expect(result.current).toMatchObject({ review: { status: "decided" } }));

    // Assert
    expect(reviewMock).toHaveBeenCalledTimes(2);
  });
});
