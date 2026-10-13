import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncAction } from "./useAsyncAction";

const toMessage = (error: unknown) => `gagal: ${String(error)}`;

describe("useAsyncAction", () => {
  // Positive
  it("hands the result of the action to onDone", async () => {
    // Arrange
    const onDone = vi.fn();
    const { result } = renderHook(() => useAsyncAction(async () => 42, onDone, toMessage));

    // Act
    await act(async () => result.current.run());

    // Assert
    expect(onDone).toHaveBeenCalledWith(42);
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it("is pending while the action runs", async () => {
    // Arrange
    let finish: (value: string) => void = () => undefined;
    const action = () => new Promise<string>((resolve) => (finish = resolve));
    const { result } = renderHook(() => useAsyncAction(action, vi.fn(), toMessage));

    // Act
    act(() => void result.current.run());
    const duringAction = result.current.pending;
    await act(async () => finish("selesai"));

    // Assert
    expect(duringAction).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  // Negative
  it("turns a failure into a message and does not call onDone", async () => {
    // Arrange
    const onDone = vi.fn();
    const action = () => Promise.reject(new Error("putus"));
    const { result } = renderHook(() => useAsyncAction(action, onDone, toMessage));

    // Act
    await act(async () => result.current.run());

    // Assert
    expect(result.current.error).toBe("gagal: Error: putus");
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  // Edge: a second press while the first is running.
  it("ignores a second run while the first is still running", async () => {
    // Arrange
    let finish: (value: string) => void = () => undefined;
    const action = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useAsyncAction(action, vi.fn(), toMessage));

    // Act
    act(() => {
      void result.current.run();
      void result.current.run();
    });
    await act(async () => finish("selesai"));

    // Assert
    expect(action).toHaveBeenCalledTimes(1);
  });

  // Edge: trying again after a failure starts clean.
  it("clears the old error when run again and can finish the second time", async () => {
    // Arrange
    const onDone = vi.fn();
    const action = vi.fn().mockRejectedValueOnce(new Error("sekali")).mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useAsyncAction(action, onDone, toMessage));
    await act(async () => result.current.run());

    // Act
    await act(async () => result.current.run());

    // Assert
    expect(result.current.error).toBeNull();
    expect(onDone).toHaveBeenCalledWith("ok");
  });

  // Edge: the request worked, the code that handles the result broke.
  it("does not report a failure when onDone throws after the action succeeded", async () => {
    // Arrange
    const onDone = vi.fn(() => {
      throw new Error("bug di penanganan hasil");
    });
    const { result } = renderHook(() => useAsyncAction(async () => "ok", onDone, toMessage));

    // Act
    let thrown: unknown = null;
    await act(async () => {
      try {
        await result.current.run();
      } catch (error) {
        thrown = error;
      }
    });

    // Assert
    expect(thrown).toEqual(new Error("bug di penanganan hasil"));
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });
});
