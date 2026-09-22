import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./apiClient";

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

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
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