import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { CASE_ID, makeCaseReview, makeSlot, makeVerdictView } from "@/test/reviewFixtures";
import { makeSummary } from "@/test/versionFixtures";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { ReviewerFeedbackGate } from "./ReviewerFeedbackGate";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));
vi.mock("@/lib/reviews/reviewApi", () => ({ getCaseReview: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);
const reviewMock = vi.mocked(getCaseReview);

const me = (role: Role) => ({ id: "u1", role });
const feedback = () => screen.queryByRole("region", { name: "Catatan peninjau" });

function renderGate(user: { id: string; role: Role } | null, status: CaseStatus | null) {
  return render(<ReviewerFeedbackGate caseId={CASE_ID} user={user} status={status} />);
}

beforeEach(() => {
  listMock.mockReset();
  reviewMock.mockReset();
  // Version 1 was written by u1, so an author with id u1 is the creator.
  listMock.mockResolvedValue([makeSummary(1)]);
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
  // Positive
  it("shows the feedback to the author who created the case once the history says so", async () => {
    // Arrange / Act
    renderGate(me("contributor"), "needs_revision");

    // Assert
    expect(await screen.findByRole("region", { name: "Catatan peninjau" })).toHaveTextContent("Pasal 151 salah");
    expect(reviewMock).toHaveBeenCalledWith(CASE_ID);
  });

  // Positive: an admin may read any review, so no history is read.
  it("shows the feedback to an admin without asking who created the case", async () => {
    // Arrange / Act
    renderGate(me("admin"), "needs_revision");

    // Assert
    expect(await screen.findByRole("region", { name: "Catatan peninjau" })).toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });

  // Negative: the server answers 403 here and a 403 sends the user to /forbidden.
  it("shows nothing and asks the server for no review for an author who did not create the case", async () => {
    // Arrange
    listMock.mockResolvedValue([makeSummary(1, { author: { id: "u2", name: "Penulis lain" } })]);

    // Act
    renderGate(me("contributor"), "needs_revision");
    await waitFor(() => expect(listMock).toHaveBeenCalledWith(CASE_ID));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(feedback()).not.toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // Edge: there is feedback to act on only after a revision was asked for.
  it.each(["draft", "in_review", "approved"] as const)("shows nothing and asks for nothing on a %s case", async (status) => {
    // Arrange / Act
    renderGate(me("admin"), status);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(feedback()).not.toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // Negative
  it.each(["viewer"] as const)("shows nothing and asks for nothing to the %s role", async (role) => {
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
