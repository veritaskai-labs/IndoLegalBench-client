import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onForbidden } from "@/lib/apiClient";
import { gradedSessionItem, gradingResponse, gradingRunSummary } from "@/test/gradingFixtures";
import { httpGradingGateway } from "./gradingApi";

// The real apiFetch runs against a stubbed fetch, so the test proves what reaches the wire
// and whether a 403 fires the /forbidden redirect listener.
function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body)),
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

describe("httpGradingGateway.grade (POST /measurements/{id}/grade, PBI-14 AC6)", () => {
  it("posts to the grade path and returns the graded session", async () => {
    const graded = gradingResponse();
    fetchMock.mockResolvedValue(fakeResponse(200, graded));

    await expect(httpGradingGateway.grade("s-1")).resolves.toEqual(graded);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/grade$/);
    expect(init.method).toBe("POST");
  });

  // The first grading uses the active rubric, which the server picks when no version is sent.
  // Choosing a version is re-grading, which belongs to SCRUM-228.
  it("sends no rubric version, so the server uses the active one", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, gradingResponse()));

    await httpGradingGateway.grade("s-1");

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  // Re-grading (PBI-14 AC7): the Admin picks the version, sent as the label the server resolves ("v2").
  it("sends the chosen rubric version as rubric_version when re-grading", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, gradingResponse({ kind: "regrade", rubric_version: "v2" })));

    const result = await httpGradingGateway.grade("s-1", "v2");

    expect(result).toMatchObject({ kind: "regrade", rubric_version: "v2" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/grade$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ rubric_version: "v2" });
  });

  it.each([
    [404, "RUBRIC_VERSION_NOT_FOUND"],
    [409, "RUBRIC_NOT_ACTIVE"],
  ])("hands a %i %s refusal for a chosen version to the caller", async (status, code) => {
    fetchMock.mockResolvedValue(fakeResponse(status, { code }));

    await expect(httpGradingGateway.grade("s-1", "v9")).rejects.toMatchObject({ status, code });
  });

  it("encodes the session id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, gradingResponse()));

    await httpGradingGateway.grade("a/b");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb\/grade$/);
  });

  // Negative: a role changed while the page was open. The section explains it; no redirect.
  it("keeps the user on the page on 403 and hands the code to the caller", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(httpGradingGateway.grade("s-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it.each([
    [409, "SESSION_NOT_GRADABLE"],
    [409, "SESSION_ARCHIVED"],
    [404, "MEASUREMENT_NOT_FOUND"],
  ])("hands a %i %s refusal to the caller", async (status, code) => {
    fetchMock.mockResolvedValue(fakeResponse(status, { code }));

    await expect(httpGradingGateway.grade("s-1")).rejects.toMatchObject({ status, code });
  });
});

describe("httpGradingGateway.results (GET /measurements/{id}/results, PBI-14 AC8)", () => {
  it("reads the latest grading of the session", async () => {
    const graded = gradingResponse();
    fetchMock.mockResolvedValue(fakeResponse(200, graded));

    await expect(httpGradingGateway.results("s-1")).resolves.toEqual(graded);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/results$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  it("encodes the session id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, gradingResponse()));

    await httpGradingGateway.results("a/b");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb\/results$/);
  });

  // server#114: the results of a running session are for Admin only. Developer AI still sees the
  // rest of the session page, so the 403 is explained in the results section, not by /forbidden.
  it("keeps the user on the page when the results of a running session are refused", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(httpGradingGateway.results("s-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  // Not graded yet: the caller turns this into the empty state, so the code must reach it.
  it("hands 404 GRADING_NOT_FOUND to the caller", async () => {
    fetchMock.mockResolvedValue(fakeResponse(404, { code: "GRADING_NOT_FOUND" }));

    await expect(httpGradingGateway.results("s-1")).rejects.toMatchObject({ status: 404, code: "GRADING_NOT_FOUND" });
  });
});

// PO decision: Viewer picks a graded session under Laporan instead of opening Eksekusi.
describe("httpGradingGateway.sessions (GET /results/sessions, PBI-14 AC8)", () => {
  it("reads the finished sessions that have a grading result", async () => {
    const sessions = [gradedSessionItem(), gradedSessionItem({ session_id: "s-2", label: "Uji Coba Produk B" })];
    fetchMock.mockResolvedValue(fakeResponse(200, sessions));

    await expect(httpGradingGateway.sessions()).resolves.toEqual(sessions);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/results\/sessions$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  // Negative: only Admin and Viewer may list. A refusal is explained where the list would be,
  // so the rest of the Laporan page stays.
  it("keeps the user on the page on 403 and hands the code to the caller", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(httpGradingGateway.sessions()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });
});

describe("httpGradingGateway.runs (GET /measurements/{id}/grading-runs, PBI-14 AC7)", () => {
  it("gets the grading history of the session, newest first as the server sends it", async () => {
    const history = [
      gradingRunSummary({ grading_run_id: "run-2", kind: "regrade", rubric_version: "v2" }),
      gradingRunSummary({ grading_run_id: "run-1", is_latest: false }),
    ];
    fetchMock.mockResolvedValue(fakeResponse(200, history));

    await expect(httpGradingGateway.runs("s-1")).resolves.toEqual(history);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/grading-runs$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  // A session that was never graded has an empty history, which is not an error.
  it("returns an empty list for a session that was never graded", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, []));

    await expect(httpGradingGateway.runs("s-1")).resolves.toEqual([]);
  });

  it("encodes the session id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, []));

    await httpGradingGateway.runs("a/b");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb\/grading-runs$/);
  });

  // Negative: a role changed while the page was open. The section explains it; no redirect.
  it("keeps the user on the page on 403 and hands the code to the caller", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(httpGradingGateway.runs("s-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("hands a 404 MEASUREMENT_NOT_FOUND to the caller", async () => {
    fetchMock.mockResolvedValue(fakeResponse(404, { code: "MEASUREMENT_NOT_FOUND" }));

    await expect(httpGradingGateway.runs("s-1")).rejects.toMatchObject({ status: 404, code: "MEASUREMENT_NOT_FOUND" });
  });
});
