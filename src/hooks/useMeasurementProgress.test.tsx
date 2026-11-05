import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/apiClient";
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

});