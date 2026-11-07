import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_POLL_MS, useLiveSession } from "@/hooks/useLiveSession";
import { getSession } from "@/lib/runs/runsApi";
import type { SessionDetail, SessionStatus } from "@/types/measurement";

vi.mock("@/lib/runs/runsApi", () => ({ getSession: vi.fn() }));
const get = vi.mocked(getSession);

function session(status: SessionStatus, label = "Sesi uji"): SessionDetail {
  return { id: "s-1", status, label, cases: [] } as unknown as SessionDetail;
}

async function tick(ms = SESSION_POLL_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  get.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLiveSession (PBI-11 AC9, refresh about every 5 seconds)", () => {
  it("returns the session it was given without calling the server on mount", () => {
    const initial = session("running");

    const { result } = renderHook(() => useLiveSession(initial));

    expect(result.current.session).toBe(initial);
    expect(result.current.stale).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("replaces the session with the newer one after each poll while it runs", async () => {
    get.mockResolvedValueOnce(session("running", "Sesi uji 2")).mockResolvedValueOnce(session("running", "Sesi uji 3"));
    const { result } = renderHook(() => useLiveSession(session("running")));

    await tick();
    expect(result.current.session.label).toBe("Sesi uji 2");
    await tick();
    expect(result.current.session.label).toBe("Sesi uji 3");
    expect(get).toHaveBeenCalledWith("s-1");
  });

  it.each<SessionStatus>(["finished", "finished_with_failures", "failed", "cancelled"])(
    "does not poll a %s session",
    async (status) => {
      renderHook(() => useLiveSession(session(status)));

      await tick(SESSION_POLL_MS * 3);

      expect(get).not.toHaveBeenCalled();
    },
  );

  it("stops polling once a poll returns a settled session", async () => {
    get.mockResolvedValue(session("finished"));
    const { result } = renderHook(() => useLiveSession(session("running")));

    await tick();
    expect(result.current.session.status).toBe("finished");
    await tick(SESSION_POLL_MS * 3);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it("keeps the last session and marks it stale when a poll fails", async () => {
    get.mockRejectedValue(new Error("network"));
    const initial = session("running");
    const { result } = renderHook(() => useLiveSession(initial));

    await tick();

    expect(result.current.session).toBe(initial);
    expect(result.current.stale).toBe(true);
  });

  it("clears the stale mark when the next poll succeeds", async () => {
    get.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(session("running", "Pulih"));
    const { result } = renderHook(() => useLiveSession(session("running")));

    await tick();
    expect(result.current.stale).toBe(true);
    await tick();

    expect(result.current.stale).toBe(false);
    expect(result.current.session.label).toBe("Pulih");
  });

  it("does not start a second request while one is still pending", async () => {
    get.mockReturnValue(new Promise(() => {}));
    renderHook(() => useLiveSession(session("running")));

    await tick(SESSION_POLL_MS * 3);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it("reload fetches the latest session straight away", async () => {
    get.mockResolvedValue(session("paused", "Dijeda"));
    const { result } = renderHook(() => useLiveSession(session("running")));

    await act(async () => {
      result.current.reload();
    });

    expect(result.current.session.label).toBe("Dijeda");
  });

  it("ignores a late answer after the component is gone", async () => {
    let resolve: (value: SessionDetail) => void = () => {};
    get.mockReturnValue(new Promise<SessionDetail>((r) => (resolve = r)));
    const { unmount } = renderHook(() => useLiveSession(session("running")));
    await tick();

    unmount();

    await expect(act(async () => resolve(session("finished")))).resolves.not.toThrow();
  });
});
