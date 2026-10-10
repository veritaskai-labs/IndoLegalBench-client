import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listCaseVersions } from "@/lib/cases/versionApi";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { makeSummary } from "@/test/versionFixtures";
import { useCanStartNewVersion } from "./useCanStartNewVersion";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);

const me = (role: Role) => ({ id: "u1", role });
const wroteVersionOne = (id: string) => [makeSummary(1, { author: { id, name: "Penulis" } })];

function renderCanStart(user: { id: string; role: Role } | null, status: CaseStatus | null) {
  return renderHook(() => useCanStartNewVersion("case-1", user, status));
}

beforeEach(() => {
  listMock.mockReset();
});

describe("useCanStartNewVersion", () => {
  // Positive
  it("offers the button to the author who created the case once the history says so", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u1"));

    // Act
    const { result } = renderCanStart(me("author"), "approved");

    // Assert
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
    expect(listMock).toHaveBeenCalledWith("case-1");
  });

  it("offers the button to an admin at once, without asking for the history", () => {
    // Arrange / Act
    const { result } = renderCanStart(me("admin"), "approved");

    // Assert
    expect(result.current).toBe(true);
    expect(listMock).not.toHaveBeenCalled();
  });

  // Negative
  it("never offers the button to an author who did not create the case", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u2"));

    // Act
    const { result } = renderCanStart(me("author"), "approved");

    // Assert
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(false);
  });

  it("keeps the button hidden when the history cannot be read", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(500, "INTERNAL"));

    // Act
    const { result } = renderCanStart(me("author"), "approved");

    // Assert
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(false);
  });

  it.each(["reviewer", "viewer"] as const)("does not ask for the history for the %s", (role) => {
    // Arrange / Act
    const { result } = renderCanStart(me(role), "approved");

    // Assert
    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });

  // Edge: nothing to fork yet, or the case has not loaded.
  it.each(["draft", "in_review", "needs_revision", null] as const)(
    "does not ask for the history of a case with status %s",
    (status) => {
      // Arrange / Act
      const { result } = renderCanStart(me("author"), status);

      // Assert
      expect(result.current).toBe(false);
      expect(listMock).not.toHaveBeenCalled();
    },
  );

  it("offers nothing while the session is loading", () => {
    // Arrange / Act
    const { result } = renderCanStart(null, "approved");

    // Assert
    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });
});
