import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { getAttemptCalls } from "@/lib/runs/runsApi";
import { useAttemptCalls } from "@/hooks/useAttemptCalls";
import type { AttemptCalls } from "@/types/measurement";

vi.mock("@/lib/runs/runsApi", () => ({
  getAttemptCalls: vi.fn(),
}));

const readCalls = vi.mocked(getAttemptCalls);

const SESSION_ID = "s-1";
const ATTEMPT_ID = "a-1";

function detail(): AttemptCalls {
  return {
    attempt_id: ATTEMPT_ID,
    repetition_no: 2,
    status: "technical_failure",
    masked: false,
    calls: [
      {
        try_no: 1,
        is_manual_retry: false,
        started_at: "2026-11-05T03:00:00Z",
        ended_at: "2026-11-05T03:00:02Z",
        duration_ms: 1840,
        result: "error",
        failure_kind: "timeout",
        model_version: "gemini-2.0-flash",
        error_summary: "HTTP 504 dari penyedia",
        raw_response: { error: { code: 504 } },
      },
    ],
  };
}

beforeEach(() => {
  readCalls.mockReset();
});

describe("useAttemptCalls", () => {
  it("makes no API request without an attempt id", async () => {
    const { result } = renderHook(() =>
      useAttemptCalls(SESSION_ID, null)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(readCalls).not.toHaveBeenCalled();
  });

  it("fetches the selected attempt", async () => {
    readCalls.mockResolvedValue(detail());

    const { result } = renderHook(() =>
      useAttemptCalls(SESSION_ID, ATTEMPT_ID)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(readCalls).toHaveBeenCalledWith(
      SESSION_ID,
      ATTEMPT_ID
    );
  });

  it("handles missing attempts", async () => {
    readCalls.mockRejectedValue(
      new ApiError(404, "ATTEMPT_NOT_FOUND")
    );

    const { result } = renderHook(() =>
      useAttemptCalls(SESSION_ID, ATTEMPT_ID)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(
      result.current.status === "error" &&
      result.current.message
    ).toBe("Percobaan ini tidak ada di sesi tersebut.");
  });

  it("fetches a different attempt when selection changes", async () => {
    readCalls.mockResolvedValue(detail());

    const { rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useAttemptCalls(SESSION_ID, id),
      {
        initialProps: {
          id: ATTEMPT_ID as string | null,
        },
      }
    );

    await waitFor(() => {
      expect(readCalls).toHaveBeenCalledWith(
        SESSION_ID,
        ATTEMPT_ID
      );
    });

    rerender({ id: "a-2" });

    await waitFor(() => {
      expect(readCalls).toHaveBeenCalledWith(
        SESSION_ID,
        "a-2"
      );
    });

    expect(readCalls).toHaveBeenCalledTimes(2);
  });
});