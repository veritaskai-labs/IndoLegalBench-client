import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeRubricVersion } from "@/test/rubricFixtures";
import { useRubricVersions } from "./useRubricVersions";

describe("useRubricVersions (GET /rubrics)", () => {
  // Positive
  it("starts loading and then exposes the versions", async () => {
    // Arrange
    const versions = [makeRubricVersion({ id: "v-2", version_no: 2 }), makeRubricVersion()];
    const gateway = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue(versions) });

    // Act
    const { result } = renderHook(() => useRubricVersions(gateway));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", data: versions });
    expect(gateway.listVersions).toHaveBeenCalledTimes(1);
  });

  // Edge: before v1 is typed in the list is empty, which is a state to show, not an error.
  it("is ready with an empty list when no version exists yet", async () => {
    // Arrange
    const gateway = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([]) });

    // Act
    const { result } = renderHook(() => useRubricVersions(gateway));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: [] });
  });

  // Negative
  it("turns any failure into the load error message", async () => {
    // Arrange
    const gateway = makeFakeGateway({ listVersions: vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL_ERROR")) });

    // Act
    const { result } = renderHook(() => useRubricVersions(gateway));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "Gagal memuat daftar versi rubrik. Coba lagi." });
  });

  // Edge: after a new version is saved the page reloads the list.
  it("loads again on reload and shows the new data", async () => {
    // Arrange
    const first = [makeRubricVersion()];
    const second = [makeRubricVersion({ id: "v-2", version_no: 2 }), makeRubricVersion()];
    const gateway = makeFakeGateway({
      listVersions: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second),
    });
    const { result } = renderHook(() => useRubricVersions(gateway));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: second }));

    // Assert
    expect(gateway.listVersions).toHaveBeenCalledTimes(2);
  });
});
