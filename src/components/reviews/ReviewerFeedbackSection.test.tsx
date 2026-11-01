import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { findCaseReview } from "@/lib/reviews/reviewApi";
import { CASE_ID, makeCaseReview, makeSlot, makeVerdictView } from "@/test/reviewFixtures";
import { ReviewerFeedbackSection } from "./ReviewerFeedbackSection";

vi.mock("@/lib/reviews/reviewApi", () => ({ findCaseReview: vi.fn() }));

const reviewMock = vi.mocked(findCaseReview);

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

  // Edge: not involved in the case, or never submitted: the section stays out of the page, no error box.
  it("shows nothing when the server has no review to show this user", async () => {
    // Arrange
    reviewMock.mockResolvedValue(null);

    // Act
    const { container } = render(<ReviewerFeedbackSection caseId={CASE_ID} />);
    await waitFor(() => expect(reviewMock).toHaveBeenCalledWith(CASE_ID));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());

    // Assert
    expect(container).toBeEmptyDOMElement();
  });
});
