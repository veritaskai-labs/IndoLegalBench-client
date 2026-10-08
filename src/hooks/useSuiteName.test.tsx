import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { useSuiteName } from "./useSuiteName";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("useSuiteName", () => {
  it("starts as null while loading", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSuiteName("abc"));

    expect(result.current).toBeNull();
  });

  it("returns the suite name once loaded", async () => {
    apiFetchMock.mockResolvedValue({ name: "Hukum Ketenagakerjaan" });

    const { result } = renderHook(() => useSuiteName("abc"));

    await waitFor(() => expect(result.current).toBe("Hukum Ketenagakerjaan"));
    expect(apiFetchMock).toHaveBeenCalledWith("/suites/abc");
  });

  it("stays null when the request fails", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useSuiteName("abc"));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("does not fetch without a suite id", () => {
    renderHook(() => useSuiteName(null));

    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});