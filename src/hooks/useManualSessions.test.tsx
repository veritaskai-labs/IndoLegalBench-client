import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockLocale, setMockLocale } from "@/lib/i18n/localeMock";
import { useManualSessions } from "./useManualSessions";
import { listManualSessions } from "@/lib/runs/manualRunsApi";
import type { SessionListItem } from "@/types/measurement";

vi.mock("@/lib/runs/manualRunsApi", () => ({
  listManualSessions: vi.fn(),
}));

const mockList = vi.mocked(listManualSessions);

const MOCK_ROWS: SessionListItem[] = [
  {
    id: "s-m1",
    label: "Manual LegalHero",
    created_at: "2026-11-01T00:00:00Z",
    created_by: "u-1",
    created_by_name: "Admin User",
    product_id: "p-lh",
    product_name: "LegalHero",
    case_count: 50,
    repetitions: 1,
    status: "partially_filled",
    session_type: "manual",
    progress: { completed: 20, total: 50, completed_cases: 20, total_cases: 50, percent_cases_complete: 40 },
  },
];

describe("useManualSessions (PBI-22 AC8, AC11)", () => {
  beforeEach(() => {
    mockList.mockReset();
  });

  afterEach(() => {
    resetMockLocale();
  });

  it("loads manual session list successfully", async () => {
    mockList.mockResolvedValue(MOCK_ROWS);

    const { result } = renderHook(() => useManualSessions());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({
      status: "ready",
      data: MOCK_ROWS,
    });
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("handles failure and allows reloading", async () => {
    mockList
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(MOCK_ROWS);

    const { result } = renderHook(() => useManualSessions());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat sesi pengukuran manual. Coba lagi.",
    });

    result.current.reload();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({
      status: "ready",
      data: MOCK_ROWS,
    });
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("explains a failed load in English when the language mock is English", async () => {
    setMockLocale("en");
    mockList.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useManualSessions());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      message: "Could not load the manual measurement sessions. Try again.",
    });
  });
});
