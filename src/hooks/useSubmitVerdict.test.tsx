import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { submitVerdict } from "@/lib/reviews/reviewApi";
import { ASSIGNMENT_ID, makeVerdictResult } from "@/test/reviewFixtures";
import { useSubmitVerdict } from "./useSubmitVerdict";

vi.mock("@/lib/reviews/reviewApi", () => ({ submitVerdict: vi.fn() }));

const submitMock = vi.mocked(submitVerdict);

const APPROVE = { decision: "approve", comment: null } as const;
const REVISE = { decision: "revise", comment: "Pasal salah" } as const;

beforeEach(() => {
  submitMock.mockReset();
});

describe("useSubmitVerdict", () => {
  // Positive
  it("sends the verdict and hands the result to onSubmitted", async () => {
    // Arrange
    const onSubmitted = vi.fn();
    const created = makeVerdictResult({ decision: "revise", comment: "Pasal salah" });
    submitMock.mockResolvedValue(created);
    const { result } = renderHook(() => useSubmitVerdict(ASSIGNMENT_ID, REVISE, onSubmitted));

    // Act
    await act(async () => result.current.submit());

    // Assert
    expect(submitMock).toHaveBeenCalledWith(ASSIGNMENT_ID, REVISE);
    expect(onSubmitted).toHaveBeenCalledWith(created);
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  // Negative: the server needs a comment for a revision and the field must show it.
  it("exposes the mapped message and skips onSubmitted when the server answers 422", async () => {
    // Arrange
    const onSubmitted = vi.fn();
    submitMock.mockRejectedValue(new ApiError(422, "COMMENT_REQUIRED", null, "comment"));
    const { result } = renderHook(() => useSubmitVerdict(ASSIGNMENT_ID, REVISE, onSubmitted));

    // Act
    await act(async () => result.current.submit());

    // Assert
    expect(result.current.error).toBe("Komentar wajib diisi saat meminta revisi.");
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  // Negative
  it("says the verdict was already sent when the server answers 409", async () => {
    // Arrange
    submitMock.mockRejectedValue(new ApiError(409, "VERDICT_ALREADY_SUBMITTED"));
    const { result } = renderHook(() => useSubmitVerdict(ASSIGNMENT_ID, APPROVE, vi.fn()));

    // Act
    await act(async () => result.current.submit());

    // Assert
    expect(result.current.error).toBe("Penilaian untuk penugasan ini sudah dikirim.");
  });

  // Edge: the button is disabled until a decision is picked, but the hook must not send nothing.
  it("makes no request when there is no verdict yet", async () => {
    // Arrange
    const onSubmitted = vi.fn();
    const { result } = renderHook(() => useSubmitVerdict(ASSIGNMENT_ID, null, onSubmitted));

    // Act
    await act(async () => result.current.submit());

    // Assert
    expect(submitMock).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Gagal mengirim penilaian. Coba lagi.");
  });

  // Edge: a second click while the first is in flight must not post twice.
  it("ignores a second click while the first request is pending", async () => {
    // Arrange
    let finish: (value: ReturnType<typeof makeVerdictResult>) => void = () => undefined;
    submitMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useSubmitVerdict(ASSIGNMENT_ID, APPROVE, vi.fn()));

    // Act
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.submit();
      void result.current.submit();
    });
    await waitFor(() => expect(result.current.pending).toBe(true));
    await act(async () => {
      finish(makeVerdictResult());
      await first;
    });

    // Assert
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
  });

  // Edge: a retry after a failure starts clean.
  it("clears the previous error on the next attempt", async () => {
    // Arrange
    submitMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL"));
    submitMock.mockResolvedValueOnce(makeVerdictResult());
    const { result } = renderHook(() => useSubmitVerdict(ASSIGNMENT_ID, APPROVE, vi.fn()));
    await act(async () => result.current.submit());
    const failed = result.current.error;

    // Act
    await act(async () => result.current.submit());

    // Assert
    expect(failed).toBe("Gagal mengirim penilaian. Coba lagi.");
    expect(result.current.error).toBeNull();
  });
});
