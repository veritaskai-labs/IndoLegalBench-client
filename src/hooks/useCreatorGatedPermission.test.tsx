import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { makeSummary } from "@/test/versionFixtures";
import { useCreatorGatedPermission } from "./useCreatorGatedPermission";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);

// A rule that lets anyone in, so what the test sees is only what the hook decides on its own.
const allowAll = vi.fn(() => true);
const wroteVersionOne = (id: string) => [makeSummary(1, { author: { id, name: "Penulis" } })];

beforeEach(() => {
  listMock.mockReset();
  allowAll.mockClear();
});

describe("useCreatorGatedPermission", () => {
  // Positive
  it("hands the creator answer of the history to the rule for an author on the required status", async () => {
    // Arrange
    listMock.mockResolvedValue(wroteVersionOne("u1"));
    const rule = vi.fn((_role, _status, isCreator: boolean) => isCreator);

    // Act
    const { result } = renderHook(() =>
      useCreatorGatedPermission("case-1", { id: "u1", role: "contributor" }, "draft", "draft", rule),
    );

    // Assert
    await waitFor(() => expect(result.current).toBe(true));
    expect(listMock).toHaveBeenCalledWith("case-1");
    expect(rule).toHaveBeenLastCalledWith("contributor", "draft", true);
  });

  // Edge: any other status is decided without reading the history.
  it("does not read the history when the status is not the required one", async () => {
    // Arrange / Act
    const { result } = renderHook(() =>
      useCreatorGatedPermission("case-1", { id: "u1", role: "contributor" }, "approved", "draft", allowAll),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(listMock).not.toHaveBeenCalled();
    expect(allowAll).toHaveBeenCalledWith("contributor", "approved", false);
    expect(result.current).toBe(true);
  });

  // Edge: only an author needs the history to prove they created the case.
  it.each(["admin", "viewer"] as const)("does not read the history for the %s role", (role) => {
    // Arrange / Act
    renderHook(() => useCreatorGatedPermission("case-1", { id: "u1", role }, "draft", "draft", allowAll));

    // Assert
    expect(listMock).not.toHaveBeenCalled();
  });

  // Negative: with no session or no status the rule is never asked.
  it.each([
    ["no user yet", null, "draft"],
    ["no status yet", { id: "u1", role: "admin" as const }, null],
  ] as const)("is false for %s and does not ask the rule", (_label, user, status) => {
    // Arrange / Act
    const { result } = renderHook(() => useCreatorGatedPermission("case-1", user, status, "draft", allowAll));

    // Assert
    expect(result.current).toBe(false);
    expect(allowAll).not.toHaveBeenCalled();
  });
});
