import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, onForbidden, onUnauthorized } from "./apiClient";

// SCRUM-253 AC3: session-expiry regression around apiFetch, for the inputs the SCRUM-252 tests
// did not cover. Partitions (E3): a request that gets no HTTP answer at all, and a write that the
// server refuses with 401.

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

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("apiFetch session-expiry regression (SCRUM-253)", () => {
  // Edge: Wi-Fi drops or the API is unreachable, so fetch throws and there is no status code at
  // all. Every SCRUM-252 test had a real status. If a missing answer were read as a 401, a short
  // network blip would log the user out; if it were read as a 403, it would open /forbidden.
  it("does not report a lost session or a forbidden page when the network fails", async () => {
    const unauthorized = vi.fn();
    const forbidden = vi.fn();
    unsubscribers.push(onUnauthorized(unauthorized), onForbidden(forbidden));
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/dashboard")).rejects.toBeInstanceOf(TypeError);

    expect(unauthorized).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });

  // Edge: a save is the one request that changes data. If apiFetch ever queued a refused write
  // and sent it again (after a retry timer or the next login), a person who walked up to an
  // expired screen could not stop it, and the write would land under the next login. The
  // request must go out once and only once.
  it("sends a write refused with 401 exactly once, also after time passes", async () => {
    vi.useFakeTimers();
    unsubscribers.push(onUnauthorized(() => undefined));
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "SESSION_EXPIRED" }));

    await expect(
      apiFetch("/cases/c1", { method: "PUT", body: JSON.stringify({ title: "draft" }) }),
    ).rejects.toMatchObject({ status: 401 });
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
