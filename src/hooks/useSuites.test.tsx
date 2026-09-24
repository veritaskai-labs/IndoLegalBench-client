import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import type { SuitePage, SuiteStatus } from "@/types/suite";
import { useSuites } from "./useSuites";


vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const suite = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Perburuhan",
  description: "Kasus hukum Ketenagakerjaan",
  status: "active",
  case_count: 3,
  is_empty: false,
  exportable: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const page: SuitePage = { items: [suite], total: 1, page: 1, size: 20 };

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("useSuites", () => {
  it("starts in loading", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSuites("active"));

    expect(result.current.status).toBe("loading");
  });

  it("requests the suites for the given status", async () => {
    apiFetchMock.mockResolvedValue(page);

    renderHook(() => useSuites("active"));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith("/suites?status=active"),
    );
  });

  it("exposes the suites once loaded", async () => {
    apiFetchMock.mockResolvedValue(page);

    const { result } = renderHook(() => useSuites("active"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.suites).toEqual([suite]);
  });

  it("goes to error when the request fails", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useSuites("active"));

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("refetches when the status changes", async () => {
    apiFetchMock.mockResolvedValue(page);

    const { rerender } = renderHook(({ s }: { s: SuiteStatus }) => useSuites(s), {
      initialProps: { s: "active" },
    });

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));

    rerender({ s: "archived" as const });

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenLastCalledWith("/suites?status=archived"),
    );
  });
});