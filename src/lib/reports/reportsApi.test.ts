import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, onForbidden } from "@/lib/apiClient";
import { firstReport } from "@/test/reportFixtures";
import type { ReportSummary } from "@/types/reports";

import { httpReportsGateway } from "./reportsApi";

// The real apiFetch runs against a stubbed fetch, so the test proves what reaches the wire and that a 403 stays
// on the page (silentForbidden) instead of jumping to /forbidden: the page explains a hidden report itself (D9).
function fakeResponse(status: number, body?: unknown, blob?: Blob) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body)),
    blob: () => Promise.resolve(blob ?? new Blob()),
  } as unknown as Response;
}

const fetchMock = vi.fn();
const unsubscribers: Array<() => void> = [];

function listenForbidden() {
  const listener = vi.fn();
  unsubscribers.push(onForbidden(listener));
  return listener;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("httpReportsGateway.list (GET /reports, D3 step 10)", () => {
  it("reads the saved reports with the session cookie", async () => {
    const report = firstReport();
    const summary: ReportSummary = {
      id: report.id,
      title: report.title,
      score_scope: report.score_scope,
      has_dev_scores: report.has_dev_scores,
      status: report.status,
      language: report.language,
      created_by: report.created_by,
      created_at: report.created_at,
    };
    fetchMock.mockResolvedValue(fakeResponse(200, [summary]));

    await expect(httpReportsGateway.list()).resolves.toEqual([summary]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/reports$/);
    expect(init).toMatchObject({ credentials: "include" });
  });
});

describe("httpReportsGateway.detail (GET /reports/{id}, D3 step 10-11)", () => {
  it("reads one frozen report", async () => {
    const report = firstReport();
    fetchMock.mockResolvedValue(fakeResponse(200, report));

    await expect(httpReportsGateway.detail(report.id)).resolves.toEqual(report);
    expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/reports/${report.id}$`));
  });

  // Negative: the id comes from the URL, so it is encoded and cannot reach another endpoint.
  it("encodes the report id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, firstReport()));

    await httpReportsGateway.detail("../admin/members");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/reports\/..%2Fadmin%2Fmembers$/);
  });

  it.each([403, 404])("rejects with the server's %s without redirecting to /forbidden", async (status) => {
    fetchMock.mockResolvedValue(fakeResponse(status, { code: "REPORT_NOT_FOUND" }));
    const forbidden = listenForbidden();

    await expect(httpReportsGateway.detail("r-1")).rejects.toMatchObject({ status });
    expect(forbidden).not.toHaveBeenCalled();
  });
});

describe("httpReportsGateway.pdf (GET /reports/{id}/pdf, D3 step 13)", () => {
  it("downloads the server-rendered PDF as a file", async () => {
    const file = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    fetchMock.mockResolvedValue(fakeResponse(200, undefined, file));

    await expect(httpReportsGateway.pdf("r-1")).resolves.toBe(file);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/reports\/r-1\/pdf$/);
  });

  it("rejects with an ApiError and stays on the page on 403", async () => {
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));
    const forbidden = listenForbidden();

    await expect(httpReportsGateway.pdf("r-1")).rejects.toBeInstanceOf(ApiError);
    expect(forbidden).not.toHaveBeenCalled();
  });
});
