import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCopyToClipboard } from "./useCopyToClipboard";

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: writeText ? { writeText } : undefined, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  stubClipboard(undefined);
});

describe("useCopyToClipboard (PBI-11 AC8, salin markdown mentah)", () => {
  // Positive
  it("writes the text to the clipboard and reports copied", async () => {
    // Arrange
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { result } = renderHook(() => useCopyToClipboard());

    // Act
    await act(async () => {
      await result.current.copy("# Jawaban\n\n**tebal**");
    });

    // Assert
    expect(writeText).toHaveBeenCalledWith("# Jawaban\n\n**tebal**");
    expect(result.current.status).toBe("copied");
  });

  it("starts as idle", () => {
    // Arrange
    stubClipboard(vi.fn());

    // Act
    const { result } = renderHook(() => useCopyToClipboard());

    // Assert
    expect(result.current.status).toBe("idle");
  });

  it("goes back to idle after two seconds so the button can be used again", async () => {
    // Arrange
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("teks");
    });

    expect(result.current.status).toBe("copied");

    // Act
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Assert
    expect(result.current.status).toBe("idle");
  });

  // Negative
  it("reports failed when the browser refuses the write", async () => {
    // Arrange
    stubClipboard(vi.fn().mockRejectedValue(new Error("NotAllowedError")));
    const { result } = renderHook(() => useCopyToClipboard());

    // Act
    await act(async () => {
      await result.current.copy("teks");
    });

    // Assert
    expect(result.current.status).toBe("failed");
  });

  // Edge
  it("reports failed instead of throwing when the clipboard api does not exist", async () => {
    // Arrange
    stubClipboard(undefined);
    const { result } = renderHook(() => useCopyToClipboard());

    // Act
    await act(async () => {
      await result.current.copy("teks");
    });

    // Assert
    expect(result.current.status).toBe("failed");
  });

  it("keeps the failed message visible for two seconds, then returns to idle", async () => {
    // Arrange
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("teks");
    });

    expect(result.current.status).toBe("failed");

    // Act
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Assert
    expect(result.current.status).toBe("idle");
  });

  it("clears the pending reset timer when the component is gone", async () => {
    // Arrange
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { result, unmount } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("teks");
    });

    expect(vi.getTimerCount()).toBe(1);

    // Act
    unmount();

    // Assert
    expect(vi.getTimerCount()).toBe(0);
  });
});
