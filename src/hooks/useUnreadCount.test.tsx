import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getUnreadCount } from "@/lib/notifications/notificationApi";
import { useUnreadCount } from "./useUnreadCount";

vi.mock("@/lib/notifications/notificationApi", () => ({ getUnreadCount: vi.fn() }));

const countMock = vi.mocked(getUnreadCount);
const POLL_MS = 30_000;

// Fake timers drive the polling; this lets pending promises settle in between.
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  countMock.mockReset();
  countMock.mockResolvedValue({ count: 3 });
});

afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

// jsdom keeps the tab visible; this lets a test hide it and show it again.
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useUnreadCount", () => {
  describe("saat dipasang", () => {
    it("starts at 0 and then shows the unread count", async () => {
      const { result } = renderHook(() => useUnreadCount());
      const initial = result.current.count;

      await flush();

      expect(initial).toBe(0);
      expect(result.current.count).toBe(3);
      expect(countMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("polling", () => {
    it("asks again after 30 seconds and shows the new count", async () => {
      const { result } = renderHook(() => useUnreadCount());
      await flush();
      countMock.mockResolvedValue({ count: 5 });

      await flush(POLL_MS);

      expect(result.current.count).toBe(5);
      expect(countMock).toHaveBeenCalledTimes(2);
    });

    it("does not ask again before the 30 seconds are up", async () => {
      renderHook(() => useUnreadCount());
      await flush();

      await flush(POLL_MS - 1);

      expect(countMock).toHaveBeenCalledTimes(1);
    });

    it("stops asking once the bell is gone", async () => {
      const { unmount } = renderHook(() => useUnreadCount());
      await flush();

      unmount();
      await flush(POLL_MS * 2);

      expect(countMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("tab tersembunyi", () => {
    it("skips the poll while the tab is hidden", async () => {
      renderHook(() => useUnreadCount());
      await flush();
      setVisibility("hidden");

      await flush(POLL_MS * 2);

      expect(countMock).toHaveBeenCalledTimes(1);
    });

    it("reads right away when the tab is shown again", async () => {
      const { result } = renderHook(() => useUnreadCount());
      await flush();
      setVisibility("hidden");
      await flush(POLL_MS);
      countMock.mockResolvedValue({ count: 7 });

      setVisibility("visible");
      await flush();

      expect(result.current.count).toBe(7);
      expect(countMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("gagal memuat", () => {
    it("keeps the last count when a poll fails", async () => {
      const { result } = renderHook(() => useUnreadCount());
      await flush();
      countMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));

      await flush(POLL_MS);

      expect(result.current.count).toBe(3);
      expect(countMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("muat ulang manual", () => {
    it("asks right away when refresh is called", async () => {
      const { result } = renderHook(() => useUnreadCount());
      await flush();
      countMock.mockResolvedValue({ count: 0 });

      act(() => result.current.refresh());
      await flush();

      expect(result.current.count).toBe(0);
      expect(countMock).toHaveBeenCalledTimes(2);
    });

    // Edge: an answer from before the refresh must not overwrite a newer one.
    it("ignores an older answer that arrives after a refresh", async () => {
      let answerOld: (value: { count: number }) => void = () => {};
      countMock.mockReturnValueOnce(new Promise((resolve) => (answerOld = resolve)));
      countMock.mockResolvedValueOnce({ count: 0 });
      const { result } = renderHook(() => useUnreadCount());

      act(() => result.current.refresh());
      await flush();
      answerOld({ count: 9 });
      await flush();

      expect(result.current.count).toBe(0);
    });
  });
});
