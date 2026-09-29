import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

/** Fire the event the browser sends before a reload, tab close, or external navigation. */
function tryToLeave(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUnsavedChangesWarning", () => {
  // Positive
  it("asks the browser to confirm leaving while there are unsaved changes", () => {
    renderHook(() => useUnsavedChangesWarning(true));

    expect(tryToLeave().defaultPrevented).toBe(true);
  });

  // Negative
  it("lets the page close freely when nothing changed", () => {
    renderHook(() => useUnsavedChangesWarning(false));

    expect(tryToLeave().defaultPrevented).toBe(false);
  });

  // Corner cases
  it("stops warning once the changes are saved", () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesWarning(dirty), {
      initialProps: { dirty: true },
    });

    rerender({ dirty: false });

    expect(tryToLeave().defaultPrevented).toBe(false);
  });

  it("removes its listener when the page unmounts", () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    unmount();

    expect(tryToLeave().defaultPrevented).toBe(false);
  });

  it("adds a single listener however often the page re-renders", () => {
    const add = vi.spyOn(window, "addEventListener");
    const { rerender } = renderHook(() => useUnsavedChangesWarning(true));

    rerender();
    rerender();

    expect(add.mock.calls.filter(([type]) => type === "beforeunload")).toHaveLength(1);
  });
});
