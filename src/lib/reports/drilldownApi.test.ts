import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, onForbidden } from "@/lib/apiClient";

import { httpDrilldownGateway } from "./drilldownApi";

// The real apiFetch runs against a stubbed fetch, so these tests prove the paths that reach the wire (server#149)
// and that a 403 stays on the page instead of jumping to /forbidden: the page explains it with the contact email (AC3).
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

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function requestedUrl(): string {
  return fetchMock.mock.calls[0][0] as string;
}

describe("httpDrilldownGateway (PBI-16, D6 steps 2–8)", () => {
  // Positive: the number is keyed by its result id, never the session, so code mode stays anonymous (AC9).
  it("reads the cases behind one number", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { cases: [] }));

    await expect(httpDrilldownGateway.cases("r-1", "res-1")).resolves.toEqual({ cases: [] });
    expect(requestedUrl()).toMatch(/\/reports\/r-1\/results\/res-1\/cases$/);
  });

  it("reads one case down to its attempts", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { case_id: "c-1" }));

    await httpDrilldownGateway.caseDetail("r-1", "res-1", "c-1");
    expect(requestedUrl()).toMatch(/\/reports\/r-1\/results\/res-1\/cases\/c-1$/);
  });

  it("lists and downloads the evidence of one manual answer (AC4)", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(200, [])).mockResolvedValueOnce(fakeResponse(200, undefined, new Blob(["%PDF"])));

    await httpDrilldownGateway.evidence("r-1", "res-1", "c-1", 2);
    const file = await httpDrilldownGateway.evidenceFile("r-1", "res-1", "c-1", "e-1");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/cases\/c-1\/attempts\/2\/evidence$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/cases\/c-1\/evidence\/e-1\/file$/);
    expect(file.size).toBe(4);
  });

  // Edge: ids come from the URL, so a crafted id cannot add path segments.
  it("encodes every id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await httpDrilldownGateway.caseDetail("a/b", "c?d", "e#f");
    expect(requestedUrl()).toMatch(/\/reports\/a%2Fb\/results\/c%3Fd\/cases\/e%23f$/);
  });

  // Negative: a 403 for case content is thrown to the page, and the app does not leave for /forbidden.
  it("keeps a 403 on the page", async () => {
    const forbidden = vi.fn();
    unsubscribers.push(onForbidden(forbidden));
    fetchMock.mockResolvedValue(
      fakeResponse(403, { code: "CASE_CONTENT_FORBIDDEN", message: "Kirim email ke indolegalbench@veritask.ai." }),
    );

    const failure = await httpDrilldownGateway.caseDetail("r-1", "res-1", "c-1").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ code: "CASE_CONTENT_FORBIDDEN", serverMessage: "Kirim email ke indolegalbench@veritask.ai." });
    expect(forbidden).not.toHaveBeenCalled();
  });
});
