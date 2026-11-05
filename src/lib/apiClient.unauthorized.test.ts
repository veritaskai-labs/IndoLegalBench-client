import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, onForbidden, onUnauthorized } from "./apiClient";

// SCRUM-252: every 401 from apiFetch is reported once, globally, so the protected screen can be
// cleared and the user sent to login. apiFetch only reports; the redirect lives in AuthGuard.
// Input partitions (E3): 401 SESSION_EXPIRED / 401 UNAUTHENTICATED / 401 without a JSON body,
// and the statuses that must not report (403, 500, 2xx).

function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body),
  } as unknown as Response;
}

const fetchMock = vi.fn();
const unsubscribers: Array<() => void> = [];

function listen(listener: (reason: string) => void) {
  unsubscribers.push(onUnauthorized(listener));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("onUnauthorized", () => {
  // Positive: idle or absolute cap passed on the server.
  it("reports an expired session on 401 SESSION_EXPIRED and still throws", async () => {
    const listener = vi.fn();
    listen(listener);
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "SESSION_EXPIRED" }));

    await expect(apiFetch("/dashboard")).rejects.toMatchObject({
      status: 401,
      code: "SESSION_EXPIRED",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("expired");
  });

  // Positive: the session row is gone (logged out elsewhere, account deactivated).
  it("reports no session on 401 UNAUTHENTICATED", async () => {
    const listener = vi.fn();
    listen(listener);
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "UNAUTHENTICATED" }));

    await apiFetch("/notifications/unread-count").catch(() => undefined);

    expect(listener).toHaveBeenCalledWith("no_session");
  });

  // Edge: a proxy answering 401 with an HTML page still means the session is not usable.
  it("reports no session when the 401 body is not JSON", async () => {
    const listener = vi.fn();
    listen(listener);
    fetchMock.mockResolvedValue(fakeResponse(401));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(listener).toHaveBeenCalledWith("no_session");
  });

  it("notifies every subscribed listener", async () => {
    const first = vi.fn();
    const second = vi.fn();
    listen(first);
    listen(second);
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "SESSION_EXPIRED" }));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    unsubscribe();
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "SESSION_EXPIRED" }));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  // Negative: forbidden is not logged out; it keeps its own signal.
  it("does not report a 403, which still goes to onForbidden", async () => {
    const unauthorized = vi.fn();
    const forbidden = vi.fn();
    listen(unauthorized);
    unsubscribers.push(onForbidden(forbidden));
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await apiFetch("/admin/users").catch(() => undefined);

    expect(unauthorized).not.toHaveBeenCalled();
    expect(forbidden).toHaveBeenCalledTimes(1);
  });

  // Negative: a 401 is not also reported as forbidden.
  it("does not report a 401 to onForbidden", async () => {
    const forbidden = vi.fn();
    unsubscribers.push(onForbidden(forbidden));
    listen(vi.fn());
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "SESSION_EXPIRED" }));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(forbidden).not.toHaveBeenCalled();
  });

  it.each([500, 422, 409])("does not report a %i", async (status) => {
    const listener = vi.fn();
    listen(listener);
    fetchMock.mockResolvedValue(fakeResponse(status, { code: "X" }));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not report on success", async () => {
    const listener = vi.fn();
    listen(listener);
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await apiFetch("/me");

    expect(listener).not.toHaveBeenCalled();
  });
});
