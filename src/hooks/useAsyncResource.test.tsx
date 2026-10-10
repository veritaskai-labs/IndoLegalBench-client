import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncResource } from "./useAsyncResource";

const toMessage = (error: unknown) => `gagal: ${String(error)}`;

/** A promise the test settles by hand, to control reply order. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAsyncResource", () => {
  // Positive
  it("starts loading and then exposes the loaded data", async () => {
    // Arrange
    const load = vi.fn().mockResolvedValue(["a", "b"]);

    // Act
    const { result } = renderHook(() => useAsyncResource("k", load, toMessage));
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", data: ["a", "b"] });
    expect(load).toHaveBeenCalledTimes(1);
  });

  // Negative
  it("turns a failure into the message from toMessage", async () => {
    // Arrange
    const load = vi.fn().mockRejectedValue(new Error("putus"));

    // Act
    const { result } = renderHook(() => useAsyncResource("k", load, toMessage));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "gagal: Error: putus" });
  });

  it("loads again on reload, showing loading in between", async () => {
    // Arrange
    const load = vi.fn().mockRejectedValueOnce(new Error("sekali")).mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useAsyncResource("k", load, toMessage));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());
    const duringReload = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(duringReload).toBe("loading");
    expect(result.current).toMatchObject({ data: "ok" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  // Edge: a new key must not show the data of the old key while waiting.
  it("shows loading for a new key instead of the data of the old key", async () => {
    // Arrange
    const second = deferred<string>();
    const load = vi.fn().mockResolvedValueOnce("untuk A").mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ id }) => useAsyncResource(id, load, toMessage), {
      initialProps: { id: "A" },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender({ id: "B" });
    const waiting = result.current.status;
    await act(async () => second.resolve("untuk B"));

    // Assert
    expect(waiting).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", data: "untuk B" });
  });

  // Edge: late answers for an old key are dropped, whether they succeed or fail.
  it("ignores a late success for the previous key", async () => {
    // Arrange
    const first = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce("untuk B");
    const { result, rerender } = renderHook(({ id }) => useAsyncResource(id, load, toMessage), {
      initialProps: { id: "A" },
    });

    // Act
    rerender({ id: "B" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => first.resolve("untuk A"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: "untuk B" });
  });

  it("ignores a late failure for the previous key", async () => {
    // Arrange
    const first = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce("untuk B");
    const { result, rerender } = renderHook(({ id }) => useAsyncResource(id, load, toMessage), {
      initialProps: { id: "A" },
    });

    // Act
    rerender({ id: "B" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => first.reject(new Error("terlambat")));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: "untuk B" });
  });

  // Edge: callers pass inline functions, which are new on every render and must not refetch.
  it("does not load again when only the load function changes", async () => {
    // Arrange
    const load = vi.fn().mockResolvedValue("sekali");
    const { result, rerender } = renderHook(() => useAsyncResource("k", () => load(), toMessage));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender();
    rerender();

    // Assert
    expect(load).toHaveBeenCalledTimes(1);
  });
});
