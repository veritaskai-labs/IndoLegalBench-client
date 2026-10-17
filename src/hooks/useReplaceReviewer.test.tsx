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
  id: "a2",
  review_round_id: "r1",
  reviewer_id: "u9",
  status: "active",
  replaced_assignment_id: "a1",
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
    replaceMock.mockRejectedValue(new ApiError(422, "REVIEWER_IS_AUTHOR"));

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
    replaceMock.mockRejectedValue(new ApiError(409, "ROUND_NOT_OPEN"));

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
});