import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, onForbidden } from "./apiClient";

/** Fake response, cukup yang dipakai apiFetch */
function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      body === undefined
        ? Promise.reject(new SyntaxError("no body"))
        : Promise.resolve(body),
  } as unknown as Response;
}

const fetchMock = vi.fn();

/** Unsubscribe functions from onForbidden, cleaned up after each test so listeners don't leak between tests. */
const unsubscribers: Array<() => void> = [];

function listenForbidden(listener: () => void) {
  unsubscribers.push(onForbidden(listener));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("apiFetch", () => {
  it("sends the session cookie and JSON headers", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await apiFetch("/me", { headers: { "X-Test": "1" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/me$/);
    expect(init).toMatchObject({
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Test": "1" },
    });
  });

  it("returns the parsed body on success", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { name: "Rina" }));

    await expect(apiFetch("/me")).resolves.toEqual({ name: "Rina" });
  });

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(fakeResponse(204));

    await expect(apiFetch("/auth/logout")).resolves.toBeUndefined();
  });

  it("throws ApiError with status and code from the error body", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse(401, { code: "SESSION_EXPIRED", message: "..." }),
    );

    const error = await apiFetch("/me").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: "SESSION_EXPIRED" });
  });

  it("falls back to UNKNOWN_ERROR when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(fakeResponse(500));

    await expect(apiFetch("/me")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN_ERROR",
    });
  });

  it("falls back to UNKNOWN_ERROR when the body has no code", async () => {
    fetchMock.mockResolvedValue(fakeResponse(400, { message: "bad" }));

    await expect(apiFetch("/me")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
    });
  });
});

describe("apiFetch affected_count", () => {
  // PBI-24 AC8: the server tells how many cases wait, and the dialog must show that number.
  it("keeps affected_count from a 409 body on the error", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse(409, { code: "CONFIRMATION_REQUIRED", message: "konfirmasi", affected_count: 3 }),
    );

    const error = await apiFetch("/admin/users/u1").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).affectedCount).toBe(3);
  });

  it("leaves affectedCount null when the body has none", async () => {
    fetchMock.mockResolvedValue(fakeResponse(409, { code: "CONFIRMATION_REQUIRED" }));

    const error = await apiFetch("/admin/users/u1").catch((err: unknown) => err);

    expect((error as ApiError).affectedCount).toBeNull();
  });

  // Edge: the schema says at least 1, so anything else is not a count worth showing.
  it.each([0, -2, 1.5, "3", null])("ignores %j as an affected count", async (value) => {
    fetchMock.mockResolvedValue(
      fakeResponse(409, { code: "CONFIRMATION_REQUIRED", affected_count: value }),
    );

    const error = await apiFetch("/admin/users/u1").catch((err: unknown) => err);

    expect((error as ApiError).affectedCount).toBeNull();
  });
});

describe("onForbidden", () => {
  it("notifies the listener on 403 and still throws", async () => {
    const listener = vi.fn();
    listenForbidden(listener);
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(apiFetch("/admin/users")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies every subscribed listener", async () => {
    const first = vi.fn();
    const second = vi.fn();
    listenForbidden(first);
    listenForbidden(second);
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await apiFetch("/admin/users").catch(() => undefined);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = onForbidden(listener);
    unsubscribe();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await apiFetch("/admin/users").catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not notify on 401", async () => {
    const listener = vi.fn();
    listenForbidden(listener);
    fetchMock.mockResolvedValue(fakeResponse(401, { code: "UNAUTHENTICATED" }));

    await apiFetch("/me").catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not notify on success", async () => {
    const listener = vi.fn();
    listenForbidden(listener);
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await apiFetch("/me");

    expect(listener).not.toHaveBeenCalled();
  });
});