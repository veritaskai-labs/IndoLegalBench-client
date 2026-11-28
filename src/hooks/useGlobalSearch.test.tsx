import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { searchAll } from "@/lib/search/searchApi";
import { SEARCH_DEBOUNCE_MS } from "@/lib/search/searchQuery";
import type { SearchResponse } from "@/lib/search/searchResults";
import type { Role } from "@/types";
import { useGlobalSearch } from "./useGlobalSearch";

// The API module is mocked: this file tests WHEN a request is sent, aborted and ignored, not the HTTP
// shape (that is searchApi.test.ts). Fake timers drive the debounce without real waiting.
vi.mock("@/lib/search/searchApi", () => ({ searchAll: vi.fn() }));
const searchMock = vi.mocked(searchAll);

const EMPTY: SearchResponse = { suites: [], cases: [], sessions: [] };

function withSuite(label: string): SearchResponse {
  return { ...EMPTY, suites: [{ id: `id-${label}`, label, archived: false }] };
}

/** A promise the test settles by hand, for answers that arrive late. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(role: Role = "admin") {
  return renderHook(({ r }) => useGlobalSearch(r), { initialProps: { r: role } });
}

type Hook = ReturnType<typeof setup>;

function type(hook: Hook, value: string) {
  act(() => hook.result.current.setQuery(value));
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Types one character every `stepMs`, like a person, e.g. "p", "pi", "pid", ... */
async function typeSlowly(hook: Hook, word: string, stepMs: number) {
  for (let i = 1; i <= word.length; i++) {
    type(hook, word.slice(0, i));
    await wait(stepMs);
  }
}

function signalOf(call: number): AbortSignal | undefined {
  return searchMock.mock.calls[call]?.[1];
}

beforeEach(() => {
  vi.useFakeTimers();
  searchMock.mockReset();
  searchMock.mockResolvedValue(EMPTY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGlobalSearch (SCRUM-352)", () => {
  it("starts idle and sends nothing", async () => {
    const hook = setup();

    await wait(1000);

    expect(hook.result.current.state).toEqual({ status: "idle" });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("waits 300 ms after the last keystroke before sending", async () => {
    const hook = setup();

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS - 1);
    expect(searchMock).not.toHaveBeenCalled();
    expect(hook.result.current.state).toEqual({ status: "loading", q: "pidana" });

    await wait(1);
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toBe("pidana");
  });

  it("sends one request, not one per key, while the user types (performance)", async () => {
    const hook = setup();

    // "pidana" typed one key per 100 ms: a request on every change would send 6 (5 from 2 characters).
    await typeSlowly(hook, "pidana", 100);
    await wait(SEARCH_DEBOUNCE_MS);

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toBe("pidana");
  });

  it("shows the grouped results of the answer", async () => {
    searchMock.mockResolvedValue(withSuite("Suite Pidana"));
    const hook = setup();

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);

    const state = hook.result.current.state;
    expect(state.status).toBe("done");
    expect(state.status === "done" && state.groups[0]?.rows[0]?.label).toBe("Suite Pidana");
  });

  it("sends the trimmed keyword", async () => {
    const hook = setup();

    type(hook, "  pidana  ");
    await wait(SEARCH_DEBOUNCE_MS);

    expect(searchMock.mock.calls[0]?.[0]).toBe("pidana");
  });

  it.each([
    ["", "idle"],
    ["   ", "idle"],
    ["a", "tooShort"],
    ["x".repeat(201), "tooLong"],
  ])("sends nothing for %j and reports %s", async (value, status) => {
    const hook = setup();

    type(hook, value);
    await wait(1000);

    expect(hook.result.current.state).toEqual({ status });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("sends at once on searchNow (Enter) without waiting", async () => {
    const hook = setup();

    type(hook, "pidana");
    act(() => hook.result.current.searchNow());
    await wait(0);

    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing on searchNow while the keyword is too short", async () => {
    const hook = setup();

    type(hook, "p");
    act(() => hook.result.current.searchNow());
    await wait(1000);

    expect(searchMock).not.toHaveBeenCalled();
    expect(hook.result.current.state).toEqual({ status: "tooShort" });
  });

  it("aborts the running request when the keyword changes", async () => {
    searchMock.mockReturnValueOnce(deferred<SearchResponse>().promise);
    const hook = setup();

    type(hook, "pi");
    await wait(SEARCH_DEBOUNCE_MS);
    expect(signalOf(0)?.aborted).toBe(false);

    type(hook, "pidana");
    expect(signalOf(0)?.aborted).toBe(true);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(signalOf(1)?.aborted).toBe(false);
  });

  it("ignores an old answer that arrives after the newer one (race)", async () => {
    const old = deferred<SearchResponse>();
    searchMock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(withSuite("Baru"));
    const hook = setup();

    type(hook, "pi");
    await wait(SEARCH_DEBOUNCE_MS);
    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);
    await act(async () => {
      old.resolve(withSuite("Lama"));
      await old.promise;
    });

    const state = hook.result.current.state;
    expect(state.status === "done" && state.groups[0]?.rows[0]?.label).toBe("Baru");
  });

  it("ignores an old failure after the keyword changed", async () => {
    const old = deferred<SearchResponse>();
    searchMock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(EMPTY);
    const hook = setup();

    type(hook, "pi");
    await wait(SEARCH_DEBOUNCE_MS);
    type(hook, "pidana");
    await act(async () => {
      old.reject(new DOMException("aborted", "AbortError"));
      await old.promise.catch(() => undefined);
    });

    expect(hook.result.current.state).toEqual({ status: "loading", q: "pidana" });
  });

  it("reports a failed search and retries on searchNow", async () => {
    searchMock.mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR")).mockResolvedValueOnce(EMPTY);
    const hook = setup();

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);
    expect(hook.result.current.state).toEqual({ status: "failed", q: "pidana" });

    act(() => hook.result.current.searchNow());
    expect(hook.result.current.state).toEqual({ status: "loading", q: "pidana" });
    await wait(0);
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state).toMatchObject({ status: "done", q: "pidana", groups: [] });
  });

  it("reports a network error as failed", async () => {
    searchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const hook = setup();

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);

    expect(hook.result.current.state).toEqual({ status: "failed", q: "pidana" });
  });

  it("reports a 422 as an invalid keyword (only invisible characters, stripped by the server)", async () => {
    searchMock.mockRejectedValueOnce(new ApiError(422, "UNKNOWN_ERROR"));
    const hook = setup();

    type(hook, "​​");
    await wait(SEARCH_DEBOUNCE_MS);

    expect(hook.result.current.state).toEqual({ status: "invalid", q: "​​" });
  });

  it("shows nothing after a 401, leaving the login flow to AuthGuard", async () => {
    searchMock.mockRejectedValueOnce(new ApiError(401, "SESSION_EXPIRED"));
    const hook = setup();

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);

    expect(hook.result.current.state).toEqual({ status: "idle" });
  });

  it("searches again when the role changes, because links depend on it", async () => {
    const hook = setup("admin");

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);
    hook.rerender({ r: "developer_ai" });
    await wait(SEARCH_DEBOUNCE_MS);

    expect(searchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts the request and the timer on unmount", async () => {
    searchMock.mockReturnValueOnce(deferred<SearchResponse>().promise);
    const hook = setup();

    type(hook, "pidana");
    await wait(SEARCH_DEBOUNCE_MS);
    hook.unmount();

    expect(signalOf(0)?.aborted).toBe(true);
  });

  it("does not send a pending keyword after unmount", async () => {
    const hook = setup();

    type(hook, "pidana");
    hook.unmount();
    await wait(1000);

    expect(searchMock).not.toHaveBeenCalled();
  });
});
