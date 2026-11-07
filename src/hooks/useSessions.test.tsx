import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listSessions } from "@/lib/runs/runsApi";
import type { SessionListItem } from "@/types/measurement";
import { SESSIONS_POLL_MS, useSessions } from "./useSessions";

vi.mock("@/lib/runs/runsApi", () => ({ listSessions: vi.fn() }));

const list = vi.mocked(listSessions);
const rows = [{ id: "s-1", label: "Uji Coba" }] as SessionListItem[];

beforeEach(() => {
  // shouldAdvanceTime keeps waitFor working while the 5 second interval is faked.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  list.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function row(id: string, status: SessionListItem["status"], completed = 0) {
  return { id, label: id, status, progress: { completed, total: 20 } } as SessionListItem;
}

describe("useSessions (PBI-11 AC10)", () => {
  it("loads the main list by default", async () => {
    // Arrange
    list.mockResolvedValue(rows);

    // Act
    const { result } = renderHook(() => useSessions());

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: rows });
    expect(list).toHaveBeenCalledWith(false);
  });

  it("loads the archived list when archived is true", async () => {
    // Arrange
    list.mockResolvedValue(rows);

    // Act
    const { result } = renderHook(() => useSessions(true));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(list).toHaveBeenCalledWith(true);
  });

  it("explains a failed load and loads again on reload", async () => {
    // Arrange
    list.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(rows);
    const { result } = renderHook(() => useSessions(true));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({ message: "Gagal memuat sesi pengukuran. Coba lagi." });

    // Act
    act(() => result.current.reload());

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe("useSessions polling (SCRUM-266, AC6)", () => {
  it("asks again about every 5 seconds while a session is running", async () => {
    list.mockResolvedValueOnce([row("s-1", "running", 7)]).mockResolvedValueOnce([row("s-1", "running", 8)]);
    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS));

    await waitFor(() => expect(result.current).toMatchObject({ data: [row("s-1", "running", 8)] }));
    expect(list).toHaveBeenCalledTimes(2);
  });

  // The table must not blink back to a skeleton every five seconds.
  it("keeps the rows on screen while the next poll is in flight", async () => {
    list.mockResolvedValueOnce([row("s-1", "running", 7)]).mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS));

    expect(result.current).toMatchObject({ status: "ready", data: [row("s-1", "running", 7)] });
  });

  it("keeps the last rows when a later poll fails", async () => {
    list.mockResolvedValueOnce([row("s-1", "queued")]).mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS));

    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: "ready", data: [row("s-1", "queued")] });
  });

  it("stops asking once nothing in the list changes by itself", async () => {
    list.mockResolvedValueOnce([row("s-1", "running", 19)]).mockResolvedValue([row("s-1", "finished", 20)]);
    renderHook(() => useSessions());
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS * 3));

    expect(list).toHaveBeenCalledTimes(2);
  });

  // Every archived session has ended, so the Arsip tab never polls.
  it("never polls the archived list", async () => {
    list.mockResolvedValue([row("s-1", "running")]);
    renderHook(() => useSessions(true));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS * 3));

    expect(list).toHaveBeenCalledTimes(1);
  });

  it("does not poll a list with no active session", async () => {
    list.mockResolvedValue([row("s-1", "finished", 20)]);
    renderHook(() => useSessions());
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(SESSIONS_POLL_MS * 3));

    expect(list).toHaveBeenCalledTimes(1);
  });

  // A late reply from the main list must never show up on the Arsip tab.
  it("does not show the rows of the other list after switching", async () => {
    let resolveMain: (value: SessionListItem[]) => void = () => {};
    list.mockReturnValueOnce(new Promise((resolve) => (resolveMain = resolve))).mockResolvedValueOnce([row("a-1", "finished")]);
    const { result, rerender } = renderHook(({ archived }) => useSessions(archived), { initialProps: { archived: false } });

    rerender({ archived: true });
    await waitFor(() => expect(result.current).toMatchObject({ data: [row("a-1", "finished")] }));
    await act(async () => resolveMain([row("s-1", "running")]));

    expect(result.current).toMatchObject({ data: [row("a-1", "finished")] });
  });
});
