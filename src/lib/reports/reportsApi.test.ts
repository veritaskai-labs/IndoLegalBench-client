import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, onForbidden } from "@/lib/apiClient";
import { firstReport } from "@/test/reportFixtures";
import type { EligibleSession, ReportCreate, ReportSummary } from "@/types/reports";

import { outcomeFromError } from "./builder/createOutcome";
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
    // server#145: GET /reports is paged ({items, total, page, size}, size 20 by default, 100 at most).
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [summary], total: 1, page: 1, size: 100 }));

    await expect(httpReportsGateway.list()).resolves.toEqual([summary]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/reports\?size=100$/);
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

// SCRUM-321: the builder page reads every pickable session with its reasons, then sends one POST /reports.
function eligibleSession(overrides: Partial<EligibleSession> = {}): EligibleSession {
  return {
    session_id: "s-1",
    label: "Sesi A",
    product_id: "p-1",
    product_name: "Produk A",
    created_at: "2026-11-18T09:00:00Z",
    session_type: "automatic",
    purpose: "measurement",
    status: "completed",
    judge_model_version: "judge-1",
    eligible: true,
    reasons: [],
    ...overrides,
  } as EligibleSession;
}

describe("httpReportsGateway.eligibleSessions (GET /reports/eligible-sessions, SCRUM-321)", () => {
  it.each(["all", "automatic", "manual"] as const)(
    "asks the server for the %s sessions with the session cookie",
    async (filter) => {
      const rows = [eligibleSession(), eligibleSession({ session_id: "s-2", eligible: false })];
      fetchMock.mockResolvedValue(fakeResponse(200, rows));

      await expect(httpReportsGateway.eligibleSessions(filter)).resolves.toEqual(rows);
      const [url, init] = fetchMock.mock.calls[0];
      const { pathname, search } = new URL(url);
      expect(`${pathname}${search}`).toBe(`/reports/eligible-sessions?measurement_filter=${filter}`);
      expect(init).toMatchObject({ credentials: "include" });
    },
  );
});

describe("httpReportsGateway.create (POST /reports, SCRUM-321 / PBI-15 AC1)", () => {
  const body: ReportCreate = {
    title: "Perbandingan November",
    session_ids: ["s-1", "s-2"],
    score_scope: "test",
    measurement_filter: "all",
    product_label_mode: "real_name",
    language: "id",
  };

  it("sends the form as JSON in one POST and returns the saved report", async () => {
    const response = { report: { id: "r-9" }, warning: null };
    fetchMock.mockResolvedValue(fakeResponse(201, response));

    await expect(httpReportsGateway.create(body)).resolves.toEqual(response);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/reports$/);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual(body);
  });

  // Negative: 200 with report null is not a saved report; the gateway passes it through untouched.
  it("returns the NO_SHARED_CASES answer as it came", async () => {
    const response = { report: null, warning: "NO_SHARED_CASES" };
    fetchMock.mockResolvedValue(fakeResponse(200, response));

    await expect(httpReportsGateway.create(body)).resolves.toEqual(response);
  });

  // Negative (AC9, AC14): the page explains a refused score type or label itself, no jump to /forbidden.
  it.each(["REPORT_SCOPE_FORBIDDEN", "REPORT_LABEL_MODE_FORBIDDEN"])(
    "rejects a 403 %s without redirecting to /forbidden",
    async (code) => {
      fetchMock.mockResolvedValue(fakeResponse(403, { code, message: "x" }));
      const forbidden = listenForbidden();

      await expect(httpReportsGateway.create(body)).rejects.toMatchObject({ status: 403, code });
      expect(forbidden).not.toHaveBeenCalled();
    },
  );

  // Negative (AC4, AC13): the server puts the reasons at the top level of the error body
  // (server app/main.py domain_error_handler: {**details, code, message}). Bodies below copy
  // report_generation.py. Built by hand, an ApiError would hide this; here the real apiFetch reads them.
  async function outcomeOf(status: number, errorBody: unknown) {
    fetchMock.mockResolvedValue(fakeResponse(status, errorBody));
    try {
      await httpReportsGateway.create(body);
    } catch (error) {
      return outcomeFromError(error);
    }
    throw new Error("create did not reject");
  }

  it("keeps every reason of a real 409 REPORT_NOT_COMPARABLE body", async () => {
    const outcome = await outcomeOf(409, {
      selection_errors: ["DUPLICATE_PRODUCT"],
      ineligible: { "s-2": ["SESSION_CANCELLED", "SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "JUDGE_MODEL", message: "Model penilai berbeda." }],
      code: "REPORT_NOT_COMPARABLE",
      message: "Sesi yang dipilih belum bisa dibandingkan. Lihat alasannya satu per satu.",
    });

    expect(outcome).toEqual({
      kind: "not_comparable",
      selectionErrors: ["DUPLICATE_PRODUCT"],
      ineligible: { "s-2": ["SESSION_CANCELLED", "SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "JUDGE_MODEL", message: "Model penilai berbeda." }],
    });
  });

  it("keeps the missing session ids of a real 404 REPORT_SESSION_NOT_FOUND body", async () => {
    const outcome = await outcomeOf(404, {
      missing: ["s-2"],
      code: "REPORT_SESSION_NOT_FOUND",
      message: "Ada sesi yang dipilih tidak ditemukan.",
    });

    expect(outcome).toEqual({ kind: "sessions_missing", sessionIds: ["s-2"] });
  });
});
