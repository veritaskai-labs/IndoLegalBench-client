import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, onForbidden } from "@/lib/apiClient";
import { archiveSession, getProgress, getSession, listSessions, getAttemptCalls } from "./runsApi";

// The real apiFetch runs against a stubbed fetch, so the test proves what reaches the wire
// and whether a 403 fires the /forbidden redirect listener, not just which helper was called.
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

describe("listSessions (GET /measurements)", () => {
  it("asks for the session list and returns it as sent", async () => {
    const rows = [{ id: "s-1", label: "Uji Coba" }];
    fetchMock.mockResolvedValue(fakeResponse(200, rows));

    await expect(listSessions()).resolves.toEqual(rows);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  // Kontributor and Viewer opening /runs: the page has no own message, so /forbidden is right.
  it("lets a 403 on the list send the user to /forbidden", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(listSessions()).rejects.toBeInstanceOf(ApiError);
    expect(forbidden).toHaveBeenCalledTimes(1);
  });
});

describe("getSession (GET /measurements/{id}, PBI-11 AC7, AC8)", () => {
  it("asks for one session with its id encoded and returns it as sent", async () => {
    const detail = { id: "a/b", label: "Uji Coba", cases: [] };
    fetchMock.mockResolvedValue(fakeResponse(200, detail));

    await expect(getSession("a/b")).resolves.toEqual(detail);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/a%2Fb$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  // An unknown or mistyped id: the page shows "Sesi tidak ditemukan", so the code must reach it.
  it("hands a 404 MEASUREMENT_NOT_FOUND to the caller without a redirect", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(404, { code: "MEASUREMENT_NOT_FOUND" }));

    await expect(getSession("s-404")).rejects.toMatchObject({ status: 404, code: "MEASUREMENT_NOT_FOUND" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  // Kontributor or Viewer opening a detail link: same as the list, /forbidden is right.
  it("lets a 403 send the user to /forbidden", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(getSession("s-1")).rejects.toBeInstanceOf(ApiError);
    expect(forbidden).toHaveBeenCalledTimes(1);
  });
});

describe("archiveSession (PATCH /measurements/{id}/archive)", () => {
  it("sends a PATCH to the session's archive route", async () => {
    const archived = { id: "s-1", archived_at: "2026-11-03T03:00:00Z", archived_by: "admin-1" };
    fetchMock.mockResolvedValue(fakeResponse(200, archived));

    await expect(archiveSession("s-1")).resolves.toEqual(archived);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/archive$/);
    expect(init.method).toBe("PATCH");
  });

  it("encodes the session id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await archiveSession("a/b?c");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb%3Fc\/archive$/);
  });

  // Developer AI on someone else's session (stale list, or a second tab): the page shows the
  // message in place, so the 403 must not throw the user off the page.
  it("keeps the user on the page on 403 NOT_YOUR_SESSION and hands the code to the caller", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "NOT_YOUR_SESSION", message: "x" }));

    await expect(archiveSession("s-1")).rejects.toMatchObject({ status: 403, code: "NOT_YOUR_SESSION" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("hands a 409 code to the caller", async () => {
    fetchMock.mockResolvedValue(fakeResponse(409, { code: "SESSION_ALREADY_ARCHIVED" }));

    await expect(archiveSession("s-1")).rejects.toMatchObject({ status: 409, code: "SESSION_ALREADY_ARCHIVED" });
  });

  it("lets a network error through unchanged", async () => {
    const offline = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(offline);

    await expect(archiveSession("s-1")).rejects.toBe(offline);
  });
});

describe("getProgress (GET /measurements/{id}/progress, PBI-12 AC5, AC6)", () => {
  it("asks for the progress of one session with its id encoded", async () => {
    const progress = { completed_calls: 240, total_calls: 300 };
    fetchMock.mockResolvedValue(fakeResponse(200, progress));

    await expect(getProgress("a/b")).resolves.toEqual(progress);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/a%2Fb\/progress$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  // Polling an id that no longer exists: the panel says so in place, it does not redirect.
  it("hands a 404 MEASUREMENT_NOT_FOUND to the caller without a redirect", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(404, { code: "MEASUREMENT_NOT_FOUND" }));

    await expect(getProgress("s-404")).rejects.toMatchObject({ status: 404, code: "MEASUREMENT_NOT_FOUND" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  // A role changed while the page stayed open: AC6 lets only Admin and Developer AI watch.
  it("lets a 403 send the user to /forbidden", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(getProgress("s-1")).rejects.toBeInstanceOf(ApiError);
    expect(forbidden).toHaveBeenCalledTimes(1);
  });
});

describe("getAttemptCalls (PBI-12 AC4)", () => {
  it("requests the calls of the correct attempt", async () => {
    const detail = {
      attempt_id: "a/1",
      repetition_no: 2,
      status: "technical_failure",
      masked: false,
      calls: [],
    };

    fetchMock.mockResolvedValue(fakeResponse(200, detail));

    await expect(
      getAttemptCalls("s/1", "a/1")
    ).resolves.toEqual(detail);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toMatch(
      /\/measurements\/s%2F1\/attempts\/a%2F1\/calls$/
    );

    expect(init.method ?? "GET").toBe("GET");
  });

  it("returns a 404 without redirecting to forbidden", async () => {
    const forbidden = listenForbidden();

    fetchMock.mockResolvedValue(
      fakeResponse(404, { code: "ATTEMPT_NOT_FOUND" })
    );

    await expect(
      getAttemptCalls("s-1", "a-404")
    ).rejects.toMatchObject({
      status: 404,
      code: "ATTEMPT_NOT_FOUND",
    });

    expect(forbidden).not.toHaveBeenCalled();
  });
});