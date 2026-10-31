import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeCaseReview, makeSlot, makeVerdictView } from "@/test/reviewFixtures";
import { ReviewerFeedback } from "./ReviewerFeedback";

const reviseSlot = (name: string, comment: string) =>
  makeSlot({
    assignment_id: `revise-${name}`,
    reviewer: { id: `revise-${name}`, name },
    verdict: makeVerdictView({ decision: "revise", comment, submitted_at: "2026-10-14T03:00:00Z" }),
  });
const approveSlot = (name: string) =>
  makeSlot({
    assignment_id: `approve-${name}`,
    reviewer: { id: `approve-${name}`, name },
    verdict: makeVerdictView({ decision: "approve", comment: null }),
  });

/** The block of one reviewer: the name and what comes with it. */
const block = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

describe("ReviewerFeedback", () => {
  // Positive: AC5, the author sees what the reviewer asked for.
  it("shows who asked for a revision, what they wrote and when, with the round", () => {
    // Arrange
    const review = makeCaseReview({
      round_no: 2,
      status: "decided",
      decision: "revise",
      reviewers: [reviseSlot("Anisa P.", "Pasal 151 salah, cek PP 35/2021")],
    });

    // Act
    render(<ReviewerFeedback review={review} />);

    // Assert
    expect(screen.getByRole("heading", { name: "Catatan peninjau" })).toBeInTheDocument();
    expect(screen.getByText("Putaran 2")).toBeInTheDocument();
    const anisa = block("Anisa P.");
    expect(within(anisa).getByText("Perlu revisi")).toBeInTheDocument();
    expect(within(anisa).getByText("Pasal 151 salah, cek PP 35/2021")).toBeInTheDocument();
    expect(within(anisa).getByText("14 Okt 2026, 10.00 WIB")).toBeInTheDocument();
  });

  // Positive: an approval stays valid and the author can see it.
  it("shows a reviewer who approved without a comment", () => {
    // Arrange
    const review = makeCaseReview({
      status: "decided",
      reviewers: [reviseSlot("Anisa P.", "Perbaiki"), approveSlot("Bagus S.")],
    });

    // Act
    render(<ReviewerFeedback review={review} />);

    // Assert
    const bagus = block("Bagus S.");
    expect(within(bagus).getByText("Dapat dipertahankan sebagaimana tertulis")).toBeInTheDocument();
    expect(within(bagus).getByText("Tanpa komentar")).toBeInTheDocument();
  });

  // Edge: what needs the author's attention comes first, whatever order the server sent.
  it("lists the revision request before the approval", () => {
    // Arrange
    const review = makeCaseReview({
      status: "decided",
      reviewers: [approveSlot("Bagus S."), reviseSlot("Anisa P.", "Perbaiki")],
    });

    // Act
    render(<ReviewerFeedback review={review} />);

    // Assert
    const names = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(names[0]).toContain("Anisa P.");
    expect(names[1]).toContain("Bagus S.");
  });

  // Negative: nothing of a verdict that is not available is made up.
  it("says a verdict is not available when the server sent none", () => {
    // Arrange
    const review = makeCaseReview({
      status: "open",
      reviewers: [makeSlot({ reviewer: { id: "x", name: "Anisa P." }, verdict: null })],
    });

    // Act
    render(<ReviewerFeedback review={review} />);

    // Assert
    const anisa = block("Anisa P.");
    expect(within(anisa).getByText("Penilaian belum tersedia.")).toBeInTheDocument();
    expect(screen.queryByText("Perlu revisi")).not.toBeInTheDocument();
    expect(screen.queryByText("Tanpa komentar")).not.toBeInTheDocument();
  });

  // Edge
  it("says there are no reviewers when the round has none", () => {
    // Arrange
    const review = makeCaseReview({ reviewers: [] });

    // Act
    render(<ReviewerFeedback review={review} />);

    // Assert
    expect(screen.getByText("Belum ada peninjau yang ditugaskan.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  // The case editor stays separate from the discussion composer.
  it("opens discussion from a visible action without embedding a second editor", () => {
    // Arrange
    const review = makeCaseReview({ status: "decided", reviewers: [reviseSlot("Anisa P.", "Perbaiki")] });

    // Act
    render(<ReviewerFeedback review={review} caseStatus="needs_revision" />);

    // Assert
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name:"Balas komentar"})).toBeInTheDocument();
  });
});

describe("ReviewerFeedback after approval", () => {
  const approved = () =>
    makeCaseReview({
      status: "decided",
      decision: "approved",
      reviewers: [reviseSlot("Anisa P.", "Catatan kecil saja"), approveSlot("Bagus S.")],
    });

  // Positive: the comment becomes a button that opens the read-only drawer.
  it("shows a button instead of the comment text once the case is approved", () => {
    // Act
    render(<ReviewerFeedback review={approved()} caseStatus="approved" />);

    // Assert
    const anisa = block("Anisa P.");
    expect(within(anisa).queryByText("Catatan kecil saja")).not.toBeInTheDocument();
    expect(within(anisa).getByRole("button", { name: "Lihat komentar" })).toBeInTheDocument();
    expect(within(anisa).queryByRole("button", { name: "Balas komentar" })).not.toBeInTheDocument();
  });

  // Edge: a reviewer without a comment has no thread to open.
  it("offers no button to a reviewer who wrote no comment", () => {
    // Act
    render(<ReviewerFeedback review={approved()} caseStatus="approved" />);

    // Assert
    expect(within(block("Bagus S.")).queryByRole("button")).not.toBeInTheDocument();
  });

  // Positive: while the case needs revision nothing changes for the author.
  it("keeps the comment inline with a reply button while the case needs revision", () => {
    // Act
    render(<ReviewerFeedback review={approved()} caseStatus="needs_revision" />);

    // Assert
    const anisa = block("Anisa P.");
    expect(within(anisa).getByText("Catatan kecil saja")).toBeInTheDocument();
    expect(within(anisa).getByRole("button", { name: "Balas komentar" })).toBeInTheDocument();
  });

  // Edge: other statuses read the comment inline and open the discussion without promising a reply.
  it("opens the discussion without a reply promise on an in-review case", () => {
    // Act
    render(<ReviewerFeedback review={approved()} caseStatus="in_review" />);

    // Assert
    const anisa = block("Anisa P.");
    expect(within(anisa).getByText("Catatan kecil saja")).toBeInTheDocument();
    expect(within(anisa).getByRole("button", { name: "Buka diskusi komentar" })).toBeInTheDocument();
  });
});
