import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboard } from "@/lib/dashboardApi";
import type { DashboardSummary } from "@/types/dashboard";
import { DASHBOARD_POLL_MS, useDashboard } from "./useDashboard";

vi.mock("@/lib/dashboardApi", () => ({ getDashboard: vi.fn() }));

const getMock = vi.mocked(getDashboard);

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    generated_at: "2026-10-18T06:30:00Z",
    case_counts: { draft: 1, in_review: 2, needs_revision: 0, approved: 4 },
    total_cases: 7,
    waiting_for_review: 2,
    review_queue: null,
    needs_reassignment: null,
    latest_run: null,
    ...overrides,
  };
}

const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  getMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDashboard", () => {
  // Positive
  it("reads the summary once on mount", async () => {
    getMock.mockResolvedValue(summary());

    const { result } = renderHook(() => useDashboard(true));
    await flush();

    expect(result.current.status).toBe("ready");
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  // AC2: data tidak boleh lebih lama dari satu menit, dan angkanya tidak boleh berkedip.
  it("asks again after a minute without flashing the loading state", async () => {
    getMock.mockResolvedValue(summary());
    const { result } = renderHook(() => useDashboard(true));
    await flush();

    await tick(DASHBOARD_POLL_MS);

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
  });

  // Corner: Viewer tidak punya dasbor, jadi servernya tidak dipanggil sama sekali.
  it("does not call the server while it is disabled", async () => {
    renderHook(() => useDashboard(false));

    await tick(DASHBOARD_POLL_MS);

    expect(getMock).not.toHaveBeenCalled();
  });

  // Negative
  it("reports an error when the first read fails, and loads again on reload", async () => {
    getMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(summary());
    const { result } = renderHook(() => useDashboard(true));
    await flush();
    expect(result.current.status).toBe("error");

    act(() => result.current.reload());
    await flush();

    expect(result.current.status).toBe("ready");
  });

  // Corner: satu penyegaran gagal tidak boleh menghapus angka yang sudah terlihat.
  it("keeps the last numbers when a refresh fails", async () => {
    getMock
      .mockResolvedValueOnce(summary({ total_cases: 7 }))
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useDashboard(true));
    await flush();

    await tick(DASHBOARD_POLL_MS);

    expect(result.current).toMatchObject({
      status: "ready",
      summary: { total_cases: 7 },
    });
  });

  // Corner: polling berhenti begitu halaman ditinggalkan.
  it("stops polling after unmount", async () => {
    getMock.mockResolvedValue(summary());
    const { unmount } = renderHook(() => useDashboard(true));
    await flush();

    unmount();
    await tick(DASHBOARD_POLL_MS * 2);

    expect(getMock).toHaveBeenCalledTimes(1);
  });
});