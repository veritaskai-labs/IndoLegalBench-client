import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AsyncResource } from "./useAsyncResource";
import { useRetainedResource } from "./useRetainedResource";

type Resource = AsyncResource<string[]> & { reload: () => void };

const reload = () => undefined;
const loading: Resource = { status: "loading", reload };
const ready = (data: string[]): Resource => ({ status: "ready", data, reload });
const failed: Resource = { status: "error", message: "gagal", reload };

function setup(initial: Resource) {
  return renderHook(({ resource }) => useRetainedResource(resource), { initialProps: { resource: initial } });
}

describe("useRetainedResource", () => {
  // Positive: the first load has nothing to keep, so it stays loading.
  it("stays loading during the first load", () => {
    // Arrange / Act
    const { result } = setup(loading);

    // Assert
    expect(result.current.status).toBe("loading");
    expect(result.current.refreshing).toBe(false);
  });

  // Positive: ready data passes through.
  it("passes ready data through", () => {
    // Arrange / Act
    const { result } = setup(ready(["a"]));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: ["a"], refreshing: false });
  });

  // Edge: a reload keeps showing the last data and says it is refreshing, so the screen does not flash.
  it("keeps the last data while the resource loads again", () => {
    // Arrange
    const { result, rerender } = setup(ready(["a"]));

    // Act
    rerender({ resource: loading });

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: ["a"], refreshing: true });
  });

  // Edge: the new data replaces the old one when the reload finishes.
  it("shows the new data when the reload finishes", () => {
    // Arrange
    const { result, rerender } = setup(ready(["a"]));
    rerender({ resource: loading });

    // Act
    rerender({ resource: ready(["a", "b"]) });

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: ["a", "b"], refreshing: false });
  });

  // Negative: a failure is never hidden behind old data.
  it("shows an error after a reload fails", () => {
    // Arrange
    const { result, rerender } = setup(ready(["a"]));
    rerender({ resource: loading });

    // Act
    rerender({ resource: failed });

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "gagal" });
  });

  it("shows an error from the first load", () => {
    // Arrange / Act
    const { result } = setup(failed);

    // Assert
    expect(result.current).toMatchObject({ status: "error", message: "gagal" });
  });

  // Edge: after an error, a new load does not bring back data from before the error.
  it("forgets old data after an error", () => {
    // Arrange
    const { result, rerender } = setup(ready(["a"]));
    rerender({ resource: failed });

    // Act
    rerender({ resource: loading });

    // Assert
    expect(result.current.status).toBe("loading");
  });

  // Positive: reload is still the one of the resource.
  it("keeps the reload function", () => {
    // Arrange
    const { result } = setup(ready([]));

    // Act
    const fn = result.current.reload;

    // Assert
    expect(fn).toBe(reload);
  });
});
