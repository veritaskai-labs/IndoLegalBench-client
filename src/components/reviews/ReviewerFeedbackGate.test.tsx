import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findCaseReview } from "@/lib/reviews/reviewApi";
import { CASE_ID, makeCaseReview, makeSlot, makeVerdictView } from "@/test/reviewFixtures";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { ReviewerFeedbackGate } from "./ReviewerFeedbackGate";

vi.mock("@/lib/reviews/reviewApi", () => ({ findCaseReview: vi.fn() }));

const reviewMock = vi.mocked(findCaseReview);

const me = (role: Role) => ({ id: "u1", role });
const feedback = () => screen.queryByRole("region", { name: "Catatan peninjau" });

function renderGate(user: { id: string; role: Role } | null, status: CaseStatus | null) {
  return render(<ReviewerFeedbackGate caseId={CASE_ID} user={user} status={status} />);
}

beforeEach(() => {
  reviewMock.mockReset();
  reviewMock.mockResolvedValue(
    makeCaseReview({
      status: "decided",
      decision: "revise",
      reviewers: [
        makeSlot({
          reviewer: { id: "r1", name: "Anisa P." },
          verdict: makeVerdictView({ decision: "revise", comment: "Pasal 151 salah" }),
        }),
      ],
    }),
  );
});

describe("ReviewerFeedbackGate", () => {
  // Positive: AC3/AC5, the author, the admin and both reviewers read the comments on every status.
  it.each(["admin", "contributor"] as const)("shows the feedback to the %s role", async (role) => {
    // Arrange / Act
    renderGate(me(role), "needs_revision");

    // Assert
    expect(await screen.findByRole("region", { name: "Catatan peninjau" })).toHaveTextContent("Pasal 151 salah");
    expect(reviewMock).toHaveBeenCalledWith(CASE_ID);
  });

  it.each(["draft", "in_review", "approved"] as const)("also shows the feedback on a %s case", async (status) => {
    // Arrange / Act
    renderGate(me("contributor"), status);

    // Assert
    expect(await screen.findByRole("region", { name: "Catatan peninjau" })).toBeInTheDocument();
  });

  // Positive: after approval the comment is a button, not text on the page.
  it("shows the comment as a button on an approved case", async () => {
    // Arrange / Act
    renderGate(me("contributor"), "approved");

    // Assert
    const region = await screen.findByRole("region", { name: "Catatan peninjau" });
    expect(region).not.toHaveTextContent("Pasal 151 salah");
    expect(within(region).getByRole("button", { name: "Lihat komentar" })).toBeInTheDocument();
  });

  // Edge: a Contributor who is neither the author nor assigned. The server has nothing for them.
  it("shows nothing when the server has no review for this user", async () => {
    // Arrange
    reviewMock.mockResolvedValue(null);

    // Act
    renderGate(me("contributor"), "approved");
    await vi.waitFor(() => expect(reviewMock).toHaveBeenCalledWith(CASE_ID));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(feedback()).not.toBeInTheDocument();
  });

  // Negative: the server answers 403 to these roles, so they are not asked.
  it.each(["viewer", "developer_ai"] as const)("shows nothing and asks for nothing to the %s role", async (role) => {
    // Arrange / Act
    renderGate(me(role), "needs_revision");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(feedback()).not.toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // Edge: the session or the case is still loading.
  it.each([
    ["no user yet", null, "needs_revision"],
    ["no status yet", me("admin"), null],
  ] as const)("shows nothing and asks for nothing with %s", async (_label, user, status) => {
    // Arrange / Act
    renderGate(user, status);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(feedback()).not.toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
  });
});
