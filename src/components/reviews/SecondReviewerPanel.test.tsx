import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ASSIGNMENT_ID,
  makeCaseReview,
  makeSlot,
  makeVerdictView,
} from "@/test/reviewFixtures";
import { SecondReviewerPanel } from "./SecondReviewerPanel";

/** The slot of the reviewer who is looking at the page. */
const mine = (overrides = {}) =>
  makeSlot({
    assignment_id: ASSIGNMENT_ID,
    reviewer: { id: "11111111-1111-1111-1111-111111111111", name: "Bagus S." },
    ...overrides,
  });

describe("SecondReviewerPanel", () => {
  // Positive: AC3, while the round is open the other verdict stays hidden.
  it("says the other reviewer is blind and who the case went to", () => {
    // Arrange
    const review = makeCaseReview({ status: "open", reviewers: [mine(), makeSlot({ verdict: null })] });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.getByRole("heading", { name: /Peninjau kedua/ })).toBeInTheDocument();
    expect(screen.getByText("HIDDEN")).toBeInTheDocument();
    expect(screen.getByText(/Disembunyikan sampai kedua peninjau selesai menilai/)).toBeInTheDocument();
    expect(screen.getByText("Ditugaskan ke Anisa P.")).toBeInTheDocument();
  });

  // Negative: nothing of a hidden verdict is made up.
  it("shows no decision or comment while the verdict is hidden", () => {
    // Arrange
    const review = makeCaseReview({ status: "open", reviewers: [mine(), makeSlot({ verdict: null })] });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.queryByText("Perlu revisi")).not.toBeInTheDocument();
    expect(screen.queryByText("Dapat dipertahankan sebagaimana tertulis")).not.toBeInTheDocument();
    expect(screen.queryByText("Tanpa komentar")).not.toBeInTheDocument();
  });

  // Edge: the reviewer's own slot is in the same list and must not be taken for the second reviewer.
  it("shows the other reviewer, not the one who is looking", () => {
    // Arrange
    const review = makeCaseReview({
      reviewers: [mine({ verdict: makeVerdictView({ decision: "approve" }) }), makeSlot({ verdict: null })],
    });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.getByText("Ditugaskan ke Anisa P.")).toBeInTheDocument();
    expect(screen.queryByText(/Bagus S\./)).not.toBeInTheDocument();
  });

  // Positive: AC3, once the round is decided both verdicts are shown.
  it("shows the other reviewer's decision, comment and time once the server sends them", () => {
    // Arrange
    const verdict = makeVerdictView({
      decision: "revise",
      comment: "Pasal 151 salah",
      submitted_at: "2026-10-14T03:00:00Z",
    });
    const review = makeCaseReview({
      status: "decided",
      decision: "revise",
      reviewers: [mine(), makeSlot({ verdict })],
    });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.getByText("Anisa P.")).toBeInTheDocument();
    expect(screen.getByText("Perlu revisi")).toBeInTheDocument();
    expect(screen.getByText("Pasal 151 salah")).toBeInTheDocument();
    expect(screen.getByText("14 Okt 2026, 10.00 WIB")).toBeInTheDocument();
    expect(screen.queryByText("HIDDEN")).not.toBeInTheDocument();
  });

  // Edge: an approval may carry no comment.
  it("says there is no comment when the other reviewer approved without one", () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "approve", comment: null });
    const review = makeCaseReview({ status: "decided", reviewers: [mine(), makeSlot({ verdict })] });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.getByText("Dapat dipertahankan sebagaimana tertulis")).toBeInTheDocument();
    expect(screen.getByText("Tanpa komentar")).toBeInTheDocument();
  });

  // Edge: an admin gets the verdict while the round is open, and the page follows the response.
  it("is not blind when the server sent the verdict even though the round is open", () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "approve" });
    const review = makeCaseReview({ status: "open", reviewers: [mine(), makeSlot({ verdict })] });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.queryByText("HIDDEN")).not.toBeInTheDocument();
    expect(screen.getByText("Dapat dipertahankan sebagaimana tertulis")).toBeInTheDocument();
  });

  // Edge: a decided round where the other reviewer has no verdict should not look blind.
  it("says there is no verdict when the round is decided and none was sent", () => {
    // Arrange
    const review = makeCaseReview({ status: "decided", reviewers: [mine(), makeSlot({ verdict: null })] });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.getByText("Anisa P.")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada penilaian.")).toBeInTheDocument();
    expect(screen.queryByText("HIDDEN")).not.toBeInTheDocument();
  });

  // Edge: the second reviewer was replaced and no one has taken the slot yet.
  it("says the second reviewer is not assigned yet when there is only one slot", () => {
    // Arrange
    const review = makeCaseReview({ reviewers: [mine()] });

    // Act
    render(<SecondReviewerPanel review={review} myAssignmentId={ASSIGNMENT_ID} />);

    // Assert
    expect(screen.getByText("Peninjau kedua belum ditugaskan.")).toBeInTheDocument();
    expect(screen.queryByText("HIDDEN")).not.toBeInTheDocument();
  });
});
