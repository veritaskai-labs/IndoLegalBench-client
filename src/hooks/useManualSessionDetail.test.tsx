import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useManualSessionDetail } from "./useManualSessionDetail";
import { getManualSession } from "@/lib/runs/manualRunsApi";
import { ApiError } from "@/lib/apiClient";
import type { ManualSessionDetail } from "@/types/measurement";

vi.mock("@/lib/runs/manualRunsApi", () => ({
  getManualSession: vi.fn(),
}));

const mockGet = vi.mocked(getManualSession);

const MOCK_DETAIL: ManualSessionDetail = {
  id: "s-123",
  label: "Sesi Detail Test",
  purpose: "official",
  status: "complete",
  product_name: "LegalHero",
  vendor_name: "LegalHero Inc",
  site_url: "https://legalhero.id",
  manual_params: null,
  case_filter: "both",
  repetitions: 1,
  filled_answers: 50,
  total_answers: 50,
  answer_date_from: "2026-11-01T00:00:00Z",
  answer_date_to: "2026-11-02T00:00:00Z",
  date_range_warning: false,
  created_by: "u-admin",
  created_at: "2026-11-01T00:00:00Z",
  finalized_at: null,
  finalized_by: null,
  cases: [],
};

describe("useManualSessionDetail (PBI-22 AC8, AC11)", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("loads session detail without unfilled filter", async () => {
    mockGet.mockResolvedValue(MOCK_DETAIL);

    const { result } = renderHook(() => useManualSessionDetail("s-123", false));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({
      status: "ready",
      data: MOCK_DETAIL,
    });
    expect(mockGet).toHaveBeenCalledWith("s-123", false);
  });

  it("loads session detail with unfilled=true query", async () => {
    mockGet.mockResolvedValue(MOCK_DETAIL);

    const { result } = renderHook(() => useManualSessionDetail("s-123", true));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockGet).toHaveBeenCalledWith("s-123", true);
  });

  it("translates MANUAL_SESSION_NOT_FOUND error code", async () => {
    mockGet.mockRejectedValue(
      new ApiError(404, "MANUAL_SESSION_NOT_FOUND", "Not found"),
    );

    const { result } = renderHook(() => useManualSessionDetail("s-123"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      status: "error",
      message: "Sesi pengukuran manual tidak ditemukan.",
    });
  });

  it("handles general error and falls back to default message", async () => {
    mockGet.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useManualSessionDetail("s-123"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat sesi pengukuran manual. Coba lagi.",
    });
  });
});
