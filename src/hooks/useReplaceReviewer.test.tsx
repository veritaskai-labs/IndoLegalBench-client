import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reviews/reviewApi", () => ({ replaceReviewer: vi.fn() }));

import { ApiError } from "@/lib/apiClient";
import { replaceReviewer } from "@/lib/reviews/reviewApi";
import { useReplaceReviewer } from "./useReplaceReviewer";
import type {
  ReplaceReviewerBody,
  ReplacedAssignment,
} from "@/types/reviewAdmin";

const replaceMock = vi.mocked(replaceReviewer);

const BODY: ReplaceReviewerBody = {
  new_reviewer_id: "u9",
  reason: "Reviewer sedang cuti",
};

const REPLACED: ReplacedAssignment = {
  id: "asg-baru",
  review_round_id: "round-1",
  reviewer_id: "rev-2",
  status: "active",
  replaced_assignment_id: "asg-1",
  source: "admin",
  assigned_at: "2026-10-18T02:00:00Z",
};

describe("useReplaceReviewer", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  // Positif
  it("sends the replacement and tells the page it is done", async () => {
    const onDone = vi.fn();
    replaceMock.mockResolvedValue(REPLACED);

    const { result } = renderHook(() => useReplaceReviewer(onDone));
    await act(async () => {
      await result.current.replace("a1", BODY);
    });

    expect(replaceMock).toHaveBeenCalledWith("a1", BODY);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Negatif
  it("keeps the server message and leaves the queue alone", async () => {
    const onDone = vi.fn();
    replaceMock.mockRejectedValue(new ApiError(422, "CANNOT_ASSIGN_AUTHOR"));

    const { result } = renderHook(() => useReplaceReviewer(onDone));
    await act(async () => {
      await result.current.replace("a1", BODY);
    });

    expect(result.current.error).toBe(
      "Penulis kasus tidak boleh jadi reviewer.",
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  // corner
  it("refuses a second call while the first is still running", async () => {
    let release: (value: ReplacedAssignment) => void = () => undefined;
    replaceMock.mockReturnValue(
      new Promise<ReplacedAssignment>((resolve) => {
        release = resolve;
      }),
    );

    const { result } = renderHook(() => useReplaceReviewer(vi.fn()));

    act(() => {
      void result.current.replace("a1", BODY);
    });
    act(() => {
      void result.current.replace("a1", BODY);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(REPLACED);
    });
  });

  // corner
  it("clears the message when the dialog is opened again", async () => {
    replaceMock.mockRejectedValue(new ApiError(409, "ROUND_ALREADY_DECIDED"));

    const { result } = renderHook(() => useReplaceReviewer(vi.fn()));
    await act(async () => {
      await result.current.replace("a1", BODY);
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
  });

  // Negatif: 409 berarti layar sudah ketinggalan, jadi daftarnya yang dimuat ulang.
  it("asks the page to reload when the server says the row is stale", async () => {
    const onDone = vi.fn();
    const onStale = vi.fn();
    replaceMock.mockRejectedValue(
      new ApiError(409, "ASSIGNMENT_ALREADY_REPLACED"),
    );

    const { result } = renderHook(() => useReplaceReviewer(onDone, onStale));
    await act(async () => {
      await result.current.replace("a1", BODY);
    });

    expect(onStale).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "Penugasan ini sudah pernah diganti. Daftarnya dimuat ulang.",
    );
  });

  // corner: galat yang masih bisa diperbaiki admin tidak memuat ulang apa pun.
  it("does not reload for an error the admin can fix", async () => {
    const onStale = vi.fn();
    replaceMock.mockRejectedValue(new ApiError(422, "REASON_REQUIRED"));

    const { result } = renderHook(() => useReplaceReviewer(vi.fn(), onStale));
    await act(async () => {
      await result.current.replace("a1", BODY);
    });

    expect(onStale).not.toHaveBeenCalled();
  });
});