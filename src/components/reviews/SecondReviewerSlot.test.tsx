import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ASSIGNMENT_ID, makeCaseReview, makeSlot } from "@/test/reviewFixtures";
import { SecondReviewerSlot } from "./SecondReviewerSlot";

const reload = vi.fn();

describe("SecondReviewerSlot", () => {
  it("shows a loading state while the review is on its way", () => {
    render(<SecondReviewerSlot caseReview={{ status: "loading", reload }} myAssignmentId={ASSIGNMENT_ID} />);

    expect(screen.getByText("Memuat peninjau kedua…")).toBeInTheDocument();
  });

  it("shows the error with a retry that reloads the review", async () => {
    const user = userEvent.setup();
    render(
      <SecondReviewerSlot
        caseReview={{ status: "error", message: "Gagal memuat penilaian kasus. Coba lagi.", reload }}
        myAssignmentId={ASSIGNMENT_ID}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat penilaian kasus. Coba lagi.");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // Edge: a case without a round has no second reviewer to show yet.
  it("shows nothing when the case has no review round", () => {
    const { container } = render(
      <SecondReviewerSlot caseReview={{ status: "ready", review: null, reload }} myAssignmentId={ASSIGNMENT_ID} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the second reviewer card once the review is ready", () => {
    const review = makeCaseReview({
      reviewers: [makeSlot({ assignment_id: ASSIGNMENT_ID }), makeSlot({ verdict: null })],
    });

    render(<SecondReviewerSlot caseReview={{ status: "ready", review, reload }} myAssignmentId={ASSIGNMENT_ID} />);

    expect(screen.getByRole("region", { name: "Peninjau kedua" })).toBeInTheDocument();
  });
});
