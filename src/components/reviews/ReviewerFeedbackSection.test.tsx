import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { CASE_ID, makeCaseReview, makeSlot, makeVerdictView } from "@/test/reviewFixtures";
import { ReviewerFeedbackSection } from "./ReviewerFeedbackSection";

vi.mock("@/lib/reviews/reviewApi", () => ({ getCaseReview: vi.fn() }));

const reviewMock = vi.mocked(getCaseReview);

const decidedWithComment = () =>
  makeCaseReview({
    status: "decided",
    decision: "revise",
    reviewers: [
      makeSlot({
        reviewer: { id: "x", name: "Anisa P." },
        verdict: makeVerdictView({ decision: "revise", comment: "Pasal 151 salah" }),
      }),
    ],
  });

beforeEach(() => {
  reviewMock.mockReset();
});

describe("ReviewerFeedbackSection", () => {
  // Positive
  it("says it is loading and then shows the feedback of the case", async () => {
    // Arrange
    reviewMock.mockResolvedValue(decidedWithComment());

    // Act
    render(<ReviewerFeedbackSection caseId={CASE_ID} />);
    const loading = screen.getByRole("status");

    // Assert
    expect(loading).toHaveTextContent("Memuat catatan peninjau…");
    expect(await screen.findByText("Pasal 151 salah")).toBeInTheDocument();
    expect(reviewMock).toHaveBeenCalledWith(CASE_ID);
  });

  // Negative
  it("shows the error with a retry that loads the feedback again", async () => {
    // Arrange
    reviewMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL"));
    reviewMock.mockResolvedValueOnce(decidedWithComment());
    const user = userEvent.setup();
    render(<ReviewerFeedbackSection caseId={CASE_ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat penilaian kasus. Coba lagi.");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByText("Pasal 151 salah")).toBeInTheDocument();
    expect(reviewMock).toHaveBeenCalledTimes(2);
  });

  // Edge: a case that needs revision but has no round, for example data moved from before reviews existed.
  it("says the case was never submitted when there is no round", async () => {
    // Arrange
    reviewMock.mockRejectedValue(new ApiError(404, "NO_REVIEW_ROUND"));

    // Act
    render(<ReviewerFeedbackSection caseId={CASE_ID} />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Kasus ini belum pernah diajukan untuk ditinjau.");
  });
});
