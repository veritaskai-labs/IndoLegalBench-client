import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL, onUnauthorized } from "@/lib/apiClient";
import { resetSessionClock } from "@/lib/sessionClock";
import { searchAll } from "./searchApi";
import type { SearchResponse } from "./searchResults";

// fetch is the only way out of this module, so stubbing it with real Response objects checks the
// exact request and the shared error handling of apiClient without a server.
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const BODY: SearchResponse = {
  suites: [{ id: "s-1", label: "Suite Pidana", archived: false }],
  cases: [],
  sessions: [],
};

function calledUrl(): string {
  return String(fetchMock.mock.calls[0]?.[0]);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetSessionClock();
});

describe("searchAll (SCRUM-352)", () => {
  it("GETs /search with the keyword and the session cookie, and returns the groups", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, BODY));

    await expect(searchAll("pidana")).resolves.toEqual(BODY);

    expect(calledUrl()).toBe(`${BASE_URL}/search?q=pidana`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined();
  });

  it("encodes characters that would otherwise change the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, BODY));

    await searchAll("a&b=c #1 100% ?");

    expect(calledUrl()).toBe(`${BASE_URL}/search?q=a%26b%3Dc%20%231%20100%25%20%3F`);
  });

  it("passes the abort signal through to fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, BODY));
    const controller = new AbortController();

    await searchAll("pidana", controller.signal);

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it("throws the 422 as ApiError, so the box can say the keyword is not valid", async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { detail: [{ msg: "too short" }] }));

    await expect(searchAll("​​")).rejects.toMatchObject({ status: 422 });
  });

  it("reports a 401 to the login flow and still throws", async () => {
    const listener = vi.fn();
    const stop = onUnauthorized(listener);
    fetchMock.mockResolvedValue(jsonResponse(401, { code: "SESSION_EXPIRED", message: "Sesi berakhir" }));

    const error = await searchAll("pidana").catch((e: unknown) => e);

    stop();
    expect(error).toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledWith("expired");
  });

  it("throws an unknown server error as ApiError with UNKNOWN_ERROR", async () => {
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));

    await expect(searchAll("pidana")).rejects.toMatchObject({ status: 502, code: "UNKNOWN_ERROR" });
  });

  it("lets a network failure through unchanged", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(searchAll("pidana")).rejects.toThrow("Failed to fetch");
  });
});
