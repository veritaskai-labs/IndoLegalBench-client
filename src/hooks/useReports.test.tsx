import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { firstReport } from "@/test/reportFixtures";
import type { ReportDetail } from "@/types/reports";

import { useReport, useReports } from "./useReports";

function fakeGateway(overrides: Partial<ReportsGateway> = {}): ReportsGateway {
  return {
    list: vi.fn().mockResolvedValue([]),
    detail: vi.fn().mockResolvedValue(firstReport()),
    pdf: vi.fn().mockResolvedValue(new Blob()),
    eligibleSessions: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ report: null, warning: null }),
    ...overrides,
  };
}

describe("useReport (GET /reports/{id})", () => {
  it("starts loading, then hands over the frozen report", async () => {
    const report = firstReport();
    const gateway = fakeGateway({ detail: vi.fn().mockResolvedValue(report) });

    const { result } = renderHook(() => useReport(report.id, gateway));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: report }));
    expect(gateway.detail).toHaveBeenCalledWith(report.id);
  });

  // D9: someone else's saved report reads the same whether it is hidden or missing.
  it.each([403, 404])("explains a %s without confirming the report exists", async (status) => {
    const gateway = fakeGateway({ detail: vi.fn().mockRejectedValue(new ApiError(status, "ANY")) });

    const { result } = renderHook(() => useReport("r-1", gateway));

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.",
      }),
    );
  });

  it("loads again after reload", async () => {
    const detail = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, "ANY"))
      .mockResolvedValueOnce(firstReport());
    const { result } = renderHook(() => useReport("r-1", fakeGateway({ detail })));

    await waitFor(() => expect(result.current.status).toBe("error"));
    result.current.reload();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(detail).toHaveBeenCalledTimes(2);
  });

  // Changing the id must not show the previous report while the next one loads.
  it("waits again when the report id changes", async () => {
    const gateway = fakeGateway({
      detail: vi.fn((id: string) => (id === "r-1" ? Promise.resolve(firstReport()) : new Promise<ReportDetail>(() => {}))),
    });
    const { result, rerender } = renderHook(({ id }) => useReport(id, gateway), { initialProps: { id: "r-1" } });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ id: "r-2" });
    expect(result.current.status).toBe("loading");
  });
});

describe("useReports (GET /reports)", () => {
  it("hands over the saved reports", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useReports(fakeGateway({ list })));

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: [] }));
  });

  it("asks to retry when the list fails", async () => {
    const { result } = renderHook(() =>
      useReports(fakeGateway({ list: vi.fn().mockRejectedValue(new ApiError(500, "ANY")) })),
    );

    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Gagal memuat daftar laporan. Coba lagi." }),
    );
  });
});
