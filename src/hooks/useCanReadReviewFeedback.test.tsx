import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCaseVersions } from "@/lib/cases/versionApi";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { makeSummary } from "@/test/versionFixtures";
import { useCanReadReviewFeedback } from "./useCanReadReviewFeedback";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);

const me = (role: Role) => ({ id: "u1", role });
const wroteVersionOne = (id: string) => [makeSummary(1, { author: { id, name: "Penulis" } })];

function renderCanRead(user: { id: string; role: Role } | null, status: CaseStatus | null) {
  return renderHook(() => useCanReadReviewFeedback("case-1", user, status));
}

beforeEach(() => {
  listMock.mockReset();
});

describe("useCanReadReviewFeedback", () => {
  // Positive
  it("shows the feedback to the author who created the case once the history says so", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u1"));

    // Act
    const { result } = renderCanRead(me("contributor"), "needs_revision");

    // Assert
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
    expect(listMock).toHaveBeenCalledWith("case-1");
  });

  it("shows the feedback to an admin at once, without asking for the history", () => {
    // Arrange / Act
    const { result } = renderCanRead(me("admin"), "needs_revision");

    // Assert
    expect(result.current).toBe(true);
    expect(listMock).not.toHaveBeenCalled();
  });

  // Negative: the server would answer 403 and send the user to /forbidden.
  it("never shows the feedback to an author who did not create the case", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u2"));

    // Act
    const { result } = renderCanRead(me("contributor"), "needs_revision");

    // Assert
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(false);
  });

  // Edge: only a case that needs revision has feedback, so no history is read for any other status.
  it.each(["draft", "in_review", "approved"] as const)(
    "does not ask for the history of a %s case",
    async (status) => {
      // Arrange / Act
      const { result } = renderCanRead(me("contributor"), status);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(result.current).toBe(false);
      expect(listMock).not.toHaveBeenCalled();
    },
  );

  // Edge: nothing is known yet, or the role never reads it.
  it.each([
    ["no user yet", null, "needs_revision"],
    ["no status yet", me("admin"), null],
    ["a viewer", me("viewer"), "needs_revision"],
  ] as const)("is false for %s and asks for nothing", async (_label, user, status) => {
    // Arrange / Act
    const { result } = renderCanRead(user, status);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });
});
