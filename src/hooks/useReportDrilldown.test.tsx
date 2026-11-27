import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import { HIDDEN_DRILLDOWN } from "@/lib/reports/drilldownRules";

import { forgetResultCases, useResultCase, useResultCases } from "./useReportDrilldown";

afterEach(forgetResultCases);

function fakeGateway(overrides: Partial<DrilldownGateway> = {}): DrilldownGateway {
  return {
    cases: vi.fn().mockResolvedValue({ cases: [] }),
    caseDetail: vi.fn().mockResolvedValue({ attempts: [] }),
    evidence: vi.fn().mockResolvedValue([]),
    evidenceFile: vi.fn().mockResolvedValue(new Blob()),
    ...overrides,
  };
}

describe("useResultCases (AC1)", () => {
  it("loads the cases behind one number", async () => {
    const gateway = fakeGateway();

    const { result } = renderHook(() => useResultCases("r-1", "res-1", gateway));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: { cases: [] } }));
    expect(gateway.cases).toHaveBeenCalledWith("r-1", "res-1");
  });

  // Negative: a number from a report the user may not read reads like a missing one (D9).
  it("explains a 404 without confirming the report exists", async () => {
    const gateway = fakeGateway({ cases: vi.fn().mockRejectedValue(new ApiError(404, "REPORT_NOT_FOUND")) });

    const { result } = renderHook(() => useResultCases("r-1", "res-1", gateway));

    await waitFor(() => expect(result.current).toMatchObject({ status: "error", message: HIDDEN_DRILLDOWN }));
  });

  // Positif, SCRUM-378: the case detail reuses the list the case list page just loaded, without a third request.
  it("reuses the list it loaded last for the same number", async () => {
    const gateway = fakeGateway();
    const first = renderHook(() => useResultCases("r-1", "res-1", gateway));
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    first.unmount();

    const again = renderHook(() => useResultCases("r-1", "res-1", gateway));

    await waitFor(() => expect(again.result.current.status).toBe("ready"));
    expect(gateway.cases).toHaveBeenCalledTimes(1);
  });

  // Negatif: another number is loaded from the server, and a failure is never remembered, so a retry asks again.
  it("asks the server for another number and after a failure", async () => {
    const cases = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, "ANY"))
      .mockResolvedValue({ cases: [] });
    const gateway = fakeGateway({ cases });

    const failed = renderHook(() => useResultCases("r-1", "res-1", gateway));
    await waitFor(() => expect(failed.result.current.status).toBe("error"));
    act(() => failed.result.current.reload());
    await waitFor(() => expect(failed.result.current.status).toBe("ready"));
    const other = renderHook(() => useResultCases("r-1", "res-2", gateway));
    await waitFor(() => expect(other.result.current.status).toBe("ready"));

    expect(cases.mock.calls).toEqual([
      ["r-1", "res-1"],
      ["r-1", "res-1"],
      ["r-1", "res-2"],
    ]);
  });
});

describe("useResultCase (AC2, AC3)", () => {
  it("loads one case down to its attempts", async () => {
    const gateway = fakeGateway();

    const { result } = renderHook(() => useResultCase("r-1", "res-1", "c-1", gateway));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(gateway.caseDetail).toHaveBeenCalledWith("r-1", "res-1", "c-1");
  });

  // Negative: a Viewer gets the server's 403 message, which points to the contact email (AC3).
  it("passes on the contact message for forbidden content", async () => {
    const message = "Untuk mendapatkan isi kasus, kirim email ke indolegalbench@veritask.ai.";
    const gateway = fakeGateway({
      caseDetail: vi.fn().mockRejectedValue(new ApiError(403, "CASE_CONTENT_FORBIDDEN", message)),
    });

    const { result } = renderHook(() => useResultCase("r-1", "res-1", "c-1", gateway));

    await waitFor(() => expect(result.current).toMatchObject({ status: "error", message }));
  });
});
