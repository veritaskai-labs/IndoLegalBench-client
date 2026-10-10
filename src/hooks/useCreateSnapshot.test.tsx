import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { createSnapshot } from "@/lib/suites/snapshotApi";
import { makeSnapshot } from "@/test/snapshotFixtures";
import { useCreateSnapshot } from "./useCreateSnapshot";

vi.mock("@/lib/suites/snapshotApi", () => ({ createSnapshot: vi.fn() }));

const createMock = vi.mocked(createSnapshot);

beforeEach(() => {
  createMock.mockReset();
});

describe("useCreateSnapshot", () => {
  // Positive
  it("creates the snapshot of the suite and hands it to onCreated", async () => {
    // Arrange
    const onCreated = vi.fn();
    createMock.mockResolvedValue(makeSnapshot());
    const { result } = renderHook(() => useCreateSnapshot("suite-1", onCreated));

    // Act
    await act(async () => result.current.create());

    // Assert
    expect(createMock).toHaveBeenCalledWith("suite-1");
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "33333333-3333-3333-3333-333333333333" }));
    expect(result.current.error).toBeNull();
  });

  // Negative
  it("shows the message for an empty suite and does not call onCreated", async () => {
    // Arrange
    const onCreated = vi.fn();
    createMock.mockRejectedValue(new ApiError(422, "NOTHING_TO_SNAPSHOT"));
    const { result } = renderHook(() => useCreateSnapshot("suite-1", onCreated));

    // Act
    await act(async () => result.current.create());

    // Assert
    expect(result.current.error).toBe(
      "Suite ini belum punya kasus yang disetujui, jadi belum ada yang bisa dibekukan.",
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  // Edge: a double press must not freeze the suite twice.
  it("creates only one snapshot when pressed twice quickly", async () => {
    // Arrange
    let finish: (value: ReturnType<typeof makeSnapshot>) => void = () => undefined;
    createMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useCreateSnapshot("suite-1", vi.fn()));

    // Act
    act(() => {
      void result.current.create();
      void result.current.create();
    });
    await act(async () => finish(makeSnapshot()));

    // Assert
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
