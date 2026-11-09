import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";
import { useAnswerHistory } from "./useAnswerHistory";

function gatewayWith(getHistory: ManualAnswerGateway["getHistory"]) {
  return { getHistory } as unknown as ManualAnswerGateway;
}

describe("useAnswerHistory (AC5)", () => {
  // Positive: loading first, then the entries of the right slot.
  it("loads the history of one answer slot", async () => {
    // Arrange
    const entries = [{ id: "h-1" }] as ManualAnswerHistoryEntry[];
    const getHistory = vi.fn().mockResolvedValue(entries);

    // Act
    const { result } = renderHook(() => useAnswerHistory(gatewayWith(getHistory), "sesi-1", "snap-1", 2));
    const first = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(first).toBe("loading");
    expect(getHistory).toHaveBeenCalledWith("sesi-1", "snap-1", 2);
    expect(result.current).toMatchObject({ status: "ready", data: entries });
  });

  // Edge: an answer that was never overwritten has an empty history, not an error.
  it("is ready with an empty list when nothing was overwritten", async () => {
    // Arrange
    const getHistory = vi.fn().mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useAnswerHistory(gatewayWith(getHistory), "sesi-1", "snap-1", 1));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ data: [] });
  });

  // Negative: a known server error becomes its message.
  it("shows the message of a known server error", async () => {
    // Arrange
    const getHistory = vi.fn().mockRejectedValue(new ApiError(404, "MANUAL_ANSWER_NOT_FOUND"));

    // Act
    const { result } = renderHook(() => useAnswerHistory(gatewayWith(getHistory), "sesi-1", "snap-1", 1));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ message: "Jawaban manual tidak ditemukan." });
  });

  // Negative: an unknown failure uses the history specific fallback.
  it("uses the fallback message for an unknown failure", async () => {
    // Arrange
    const getHistory = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    // Act
    const { result } = renderHook(() => useAnswerHistory(gatewayWith(getHistory), "sesi-1", "snap-1", 1));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ message: "Gagal memuat riwayat jawaban. Coba lagi." });
  });

  // Edge: reload asks the server again.
  it("asks the server again on reload", async () => {
    // Arrange
    const getHistory = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useAnswerHistory(gatewayWith(getHistory), "sesi-1", "snap-1", 1));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    act(() => result.current.reload());
    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));

    // Assert
    expect(getHistory).toHaveBeenCalledTimes(2);
  });
});
