import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingProgress, gradingRunQueued } from "@/test/gradingFixtures";
import type { GradingProgress } from "@/types/grading";
import { PROGRESS_POLL_MS } from "./useMeasurementProgress";
import { useGradingProgress } from "./useGradingProgress";

function fakeGateway(progress: GradingGateway["progress"]): GradingGateway {
  return {
    enqueue: vi.fn(),
    progress: vi.fn(progress),
    estimate: vi.fn(),
    results: vi.fn(),
    runs: vi.fn(),
    run: vi.fn(),
    sessions: vi.fn(),
  };
}

/** Gateway whose answers come from a queue; the last answer repeats. */
function scripted(...answers: Array<GradingProgress | null>): GradingGateway {
  let index = 0;
  return fakeGateway(() => {
    const answer = answers[Math.min(index, answers.length - 1)];
    index += 1;
    return Promise.resolve(answer);
  });
}

beforeEach(() => {
  // shouldAdvanceTime keeps waitFor working while the 5 second interval is faked.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGradingProgress (K-13, SCRUM-285)", () => {
  it("reads the session's grading progress for an Admin", async () => {
    const gateway = scripted(gradingProgress({ status: "running", percent: 25 }));

    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: { status: "running", percent: 25 }, active: true });
    expect(gateway.progress).toHaveBeenNthCalledWith(1, "s-1");
  });

  // AC: progress stays right after a refresh, because it comes from the server, not from the dialog.
  it("shows a run that is already running when the page opens", async () => {
    const gateway = scripted(gradingProgress({ status: "queued", attempts_graded: 0, percent: 0 }));

    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));

    await waitFor(() => expect(result.current.active).toBe(true));
  });

  it("asks again about every 5 seconds with the passive header while the run is active", async () => {
    const gateway = scripted(gradingProgress({ status: "running" }));
    renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));
    await waitFor(() => expect(gateway.progress).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    await waitFor(() => expect(gateway.progress).toHaveBeenCalledTimes(2));
    expect(gateway.progress).toHaveBeenNthCalledWith(2, "s-1", { activity: "passive" });
  });

  it.each([
    ["never graded", null],
    ["finished", gradingProgress({ status: "finished", percent: 100, attempts_graded: 12 })],
    ["failed", gradingProgress({ status: "failed", error_code: "GRADING_INTERRUPTED" })],
  ])("does not poll when the latest run is %s", async (_name, answer) => {
    const gateway = scripted(answer);
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.active).toBe(false);

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS * 3);

    expect(gateway.progress).toHaveBeenCalledTimes(1);
  });

  it("stops polling once the run finishes", async () => {
    const gateway = scripted(gradingProgress({ status: "running" }), gradingProgress({ status: "finished", percent: 100 }));
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));
    await waitFor(() => expect(result.current.active).toBe(true));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);
    await waitFor(() => expect(result.current.active).toBe(false));
    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS * 3);

    expect(gateway.progress).toHaveBeenCalledTimes(2);
  });

  // The endpoint is Admin only (403 otherwise): other roles never ask for it.
  it("does not ask the server when disabled", async () => {
    const gateway = scripted(gradingProgress());

    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: false, gateway }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ data: null, active: false });
    expect(gateway.progress).not.toHaveBeenCalled();
  });

  // Right after 202 the run counts as active, so the Nilai button cannot flicker back on.
  it("treats a just-queued run as active before the next read arrives, then polls it", async () => {
    let answer: GradingProgress | null = null;
    const gateway = fakeGateway(() => Promise.resolve(answer));
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.active).toBe(false);

    answer = gradingProgress({ grading_run_id: "run-new", status: "queued", percent: 0 });
    act(() => result.current.started(gradingRunQueued({ grading_run_id: "run-new" })));

    expect(result.current.active).toBe(true);
    await waitFor(() => expect(result.current).toMatchObject({ data: { grading_run_id: "run-new" } }));
    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);
    await waitFor(() => expect(gateway.progress).toHaveBeenCalledTimes(3));
  });

  it("stops treating a queued run as pending once a read shows it, so a later run can end", async () => {
    let answer: GradingProgress | null = null;
    const gateway = fakeGateway(() => Promise.resolve(answer));
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    answer = gradingProgress({ grading_run_id: "run-A", status: "finished", percent: 100 });
    act(() => result.current.started(gradingRunQueued({ grading_run_id: "run-A" })));
    await waitFor(() => expect(result.current).toMatchObject({ data: { grading_run_id: "run-A" }, active: false }));

    answer = gradingProgress({ grading_run_id: "run-B", status: "running", percent: 50 });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ data: { grading_run_id: "run-B" }, active: true }));

    answer = gradingProgress({ grading_run_id: "run-B", status: "finished", percent: 100 });
    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);
    await waitFor(() => expect(result.current).toMatchObject({ data: { status: "finished" }, active: false }));
    const calls = vi.mocked(gateway.progress).mock.calls.length;

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS * 2);

    expect(gateway.progress).toHaveBeenCalledTimes(calls);
  });

  // AC: the score table loads by itself when the run ends.
  it("calls onSettled once when a run it saw active finishes", async () => {
    const done = gradingProgress({ status: "finished", percent: 100 });
    const gateway = scripted(gradingProgress({ status: "running" }), done);
    const onSettled = vi.fn();
    renderHook(() => useGradingProgress("s-1", { enabled: true, gateway, onSettled }));
    await waitFor(() => expect(gateway.progress).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(onSettled).toHaveBeenCalledWith(done);
    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS * 2);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("calls onSettled when a run it saw active fails", async () => {
    const failed = gradingProgress({ status: "failed", error_code: "GRADING_ERROR" });
    const gateway = scripted(gradingProgress({ status: "running" }), failed);
    const onSettled = vi.fn();
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway, onSettled }));
    await waitFor(() => expect(result.current.active).toBe(true));

    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    await waitFor(() => expect(onSettled).toHaveBeenCalledWith(failed));
  });

  // Edge: the worker can finish before the first read after 202 arrives.
  it("calls onSettled when a just-queued run is already finished on the next read", async () => {
    let answer: GradingProgress | null = null;
    const gateway = fakeGateway(() => Promise.resolve(answer));
    const onSettled = vi.fn();
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway, onSettled }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    answer = gradingProgress({ grading_run_id: "run-new", status: "finished", percent: 100 });
    act(() => result.current.started(gradingRunQueued({ grading_run_id: "run-new" })));

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(result.current.active).toBe(false);
  });

  // An old finished run on page load is not news: the results are already on the page.
  it("does not call onSettled for a run that was already finished when the page opened", async () => {
    const gateway = scripted(gradingProgress({ status: "finished", percent: 100 }));
    const onSettled = vi.fn();
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway, onSettled }));

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(onSettled).not.toHaveBeenCalled();
  });

  it.each([
    ["MEASUREMENT_NOT_FOUND", 404, "Sesi tidak ditemukan. Muat ulang halaman."],
    ["FORBIDDEN", 403, "Progres penilaian hanya dapat dilihat Admin. Muat ulang halaman."],
    ["SOMETHING_ELSE", 500, "Gagal memuat progres penilaian. Coba lagi."],
  ])("explains a %s failure on the first read", async (code, status, message) => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(status, code, code)));

    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));

    await waitFor(() => expect(result.current).toMatchObject({ status: "error", message }));
  });

  // A short outage mid-run keeps the last numbers on screen instead of an error.
  it("keeps the last progress when a later poll fails", async () => {
    let fail = false;
    const gateway = fakeGateway(() =>
      fail ? Promise.reject(new Error("offline")) : Promise.resolve(gradingProgress({ status: "running", percent: 50 })),
    );
    const { result } = renderHook(() => useGradingProgress("s-1", { enabled: true, gateway }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    fail = true;
    await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

    await waitFor(() => expect(gateway.progress).toHaveBeenCalledTimes(2));
    expect(result.current).toMatchObject({ status: "ready", data: { percent: 50 }, active: true });
  });
});
