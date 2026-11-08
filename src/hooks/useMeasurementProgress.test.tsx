import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "@/lib/apiClient";
import { PROGRESS_POLL_MS, useMeasurementProgress } from "./useMeasurementProgress";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

function progress(completed: number) {
  return { completed_calls: completed, total_calls: 300 };
}

beforeEach(() => {
  // shouldAdvanceTime keeps waitFor working while the 5 second interval is faked.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  apiFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMeasurementProgress (PBI-12 AC5, AC6)", () => {
  it("asks the progress route of that session", async () => {
    apiFetchMock.mockResolvedValue(progress(240));

    renderHook(() => useMeasurementProgress("s-1", { poll: true }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/measurements/s-1/progress"));
  });

  it("exposes the numbers once loaded", async () => {
    apiFetchMock.mockResolvedValue(progress(240));

    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: true }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: progress(240) });
  });

  // AC4: the 5 second refresh must not move last_activity_at. The first read and Reload still do.
  it("sends passive only on the repeating poll, not on the first load or reload", async () => {
    apiFetchMock.mockResolvedValue(progress(1));
    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: true }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/measurements/s-1/progress");

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/measurements/s-1/progress", { activity: "passive" });

    act(() => result.current.reload());
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(3));
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/measurements/s-1/progress");
  });

  it("asks again about every 5 seconds, with no page reload", async () => {
    apiFetchMock.mockResolvedValue(progress(240));
    renderHook(() => useMeasurementProgress("s-1", { poll: true }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
  });

  // The panel must not blink back to a skeleton every five seconds.
  it("keeps the numbers on screen while the next poll is in flight", async () => {
    apiFetchMock.mockResolvedValueOnce(progress(240)).mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: true }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    expect(result.current).toMatchObject({ status: "ready", data: progress(240) });
  });

  // A session that has ended never changes again, so polling it is wasted traffic.
  it("stops asking when polling is off", async () => {
    apiFetchMock.mockResolvedValue(progress(300));
    renderHook(() => useMeasurementProgress("s-1", { poll: false }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS * 3);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("goes to error when the first read fails, because there is nothing to show", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: true }));

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  // One hiccup in the middle of a measurement must not empty a panel that already has numbers.
  it("keeps the last numbers when a later poll fails", async () => {
    apiFetchMock.mockResolvedValueOnce(progress(240)).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: true }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    expect(result.current).toMatchObject({ status: "ready", data: progress(240) });
  });

it("reloads progress after a failed first request even when polling is off", async () => {
  apiFetchMock
    .mockRejectedValueOnce(new Error("network error"))
    .mockResolvedValueOnce(progress(300));

  const { result } = renderHook(() =>
    useMeasurementProgress("s-1", { poll: false }),
  );

  await waitFor(() => expect(result.current.status).toBe("error"));

  act(() => {
    result.current.reload();
  });

  await waitFor(() => expect(result.current.status).toBe("ready"));

  expect(result.current).toMatchObject({
    status: "ready",
    data: progress(300),
  });
  expect(apiFetchMock).toHaveBeenCalledTimes(2);
});

  // Waiting for the next poll cannot bring back a session that does not exist.
  it("says the session is missing on 404 instead of the generic message", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(404, "MEASUREMENT_NOT_FOUND"));

    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: false }));

    await waitFor(() => expect(result.current).toMatchObject({ status: "error", message: "Sesi tidak ditemukan." }));
  });

  // Same as before the refactor: polling keeps going while the first read is still failing.
  it("recovers by itself when polling is on and the first read failed", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(progress(10));
    const { result } = renderHook(() => useMeasurementProgress("s-1", { poll: true }));
    await waitFor(() => expect(result.current.status).toBe("error"));

    await act(() => vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS));

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: progress(10) }));
  });

  // Switching sessions must never show the numbers of the previous one.
  it("drops a late reply for the previous session", async () => {
    let resolveOld: (value: unknown) => void = () => {};
    apiFetchMock.mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve))).mockResolvedValueOnce(progress(5));
    const { result, rerender } = renderHook(({ id }) => useMeasurementProgress(id, { poll: false }), {
      initialProps: { id: "s-1" },
    });

    rerender({ id: "s-2" });
    await waitFor(() => expect(result.current).toMatchObject({ data: progress(5) }));
    await act(async () => resolveOld(progress(240)));

    expect(result.current).toMatchObject({ data: progress(5) });
  });
});
