import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDirtyRegistry } from "./useDirtyRegistry";

describe("useDirtyRegistry (unsaved changes across many answer boxes)", () => {
  // Positive: starts clean.
  it("starts with nothing unsaved", () => {
    // Arrange / Act
    const { result } = renderHook(() => useDirtyRegistry());

    // Assert
    expect(result.current.anyDirty).toBe(false);
  });

  // Positive: one dirty box is enough.
  it("is dirty as soon as one box reports unsaved changes", () => {
    // Arrange
    const { result } = renderHook(() => useDirtyRegistry());

    // Act
    act(() => result.current.report("att-1", true));

    // Assert
    expect(result.current.anyDirty).toBe(true);
  });

  // Edge: it stays dirty until every dirty box is clean again.
  it("stays dirty until all boxes are clean", () => {
    // Arrange
    const { result } = renderHook(() => useDirtyRegistry());
    act(() => {
      result.current.report("att-1", true);
      result.current.report("att-2", true);
    });

    // Act
    act(() => result.current.report("att-1", false));
    const afterFirst = result.current.anyDirty;
    act(() => result.current.report("att-2", false));

    // Assert
    expect(afterFirst).toBe(true);
    expect(result.current.anyDirty).toBe(false);
  });

  // Edge: reporting the same state twice, or a clean state for an unknown box, changes nothing.
  it("ignores a repeated report", () => {
    // Arrange
    const { result } = renderHook(() => useDirtyRegistry());
    act(() => result.current.report("att-1", true));

    // Act
    act(() => result.current.report("att-1", true));
    act(() => result.current.report("att-9", false));
    act(() => result.current.report("att-1", false));

    // Assert
    expect(result.current.anyDirty).toBe(false);
  });

  // Edge: report keeps the same identity so boxes do not report again after every render.
  it("keeps the same report function between renders", () => {
    // Arrange
    const { result, rerender } = renderHook(() => useDirtyRegistry());
    const first = result.current.report;

    // Act
    rerender();

    // Assert
    expect(result.current.report).toBe(first);
  });
});
