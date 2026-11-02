import { act, fireEvent, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNavProvider, useMobileNav } from "./MobileNav";

// The menu closes when the page changes, so the current path is the test's lever.
const { pathname } = vi.hoisted(() => ({ pathname: { current: "/dashboard" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

function wrapper({ children }: { children: ReactNode }) {
  return <MobileNavProvider>{children}</MobileNavProvider>;
}

beforeEach(() => {
  pathname.current = "/dashboard";
});

describe("useMobileNav (SCRUM-204 E2E F3: phone menu)", () => {
  // Positive
  it("starts closed and opens and closes with toggle", () => {
    const { result } = renderHook(() => useMobileNav(), { wrapper });
    expect(result.current.open).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it("closes with close", () => {
    const { result } = renderHook(() => useMobileNav(), { wrapper });
    act(() => result.current.toggle());

    act(() => result.current.close());

    expect(result.current.open).toBe(false);
  });

  it("closes on Escape", () => {
    const { result } = renderHook(() => useMobileNav(), { wrapper });
    act(() => result.current.toggle());

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(result.current.open).toBe(false);
  });

  // Edge
  it("stays open on other keys", () => {
    const { result } = renderHook(() => useMobileNav(), { wrapper });
    act(() => result.current.toggle());

    act(() => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(result.current.open).toBe(true);
  });

  it("closes by itself once the user has moved to another page", () => {
    const { result, rerender } = renderHook(() => useMobileNav(), { wrapper });
    act(() => result.current.toggle());

    pathname.current = "/suites";
    rerender();

    expect(result.current.open).toBe(false);
  });

  // Negative
  it("is a closed menu that does nothing outside the app shell", () => {
    // TopBar and Sidebar are also rendered on their own (tests, the login screen).
    const { result } = renderHook(() => useMobileNav());

    act(() => result.current.toggle());

    expect(result.current.open).toBe(false);
  });

  it("ignores close outside the app shell", () => {
    const { result } = renderHook(() => useMobileNav());

    act(() => result.current.close());

    expect(result.current.open).toBe(false);
  });

  // Review #63: rotating a tablet past md shows the desktop column, so the panel must go.
  it("closes once the screen is wide enough for the sidebar column", () => {
    let onChange: (event: { matches: boolean }) => void = () => undefined;
    const removeEventListener = vi.fn();
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        media: query,
        matches: false,
        addEventListener: (_: string, listener: typeof onChange) => (onChange = listener),
        removeEventListener,
      })),
    );
    try {
      const { result, unmount } = renderHook(() => useMobileNav(), { wrapper });
      act(() => result.current.toggle());
      expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 768px)");

      act(() => onChange({ matches: false }));
      expect(result.current.open).toBe(true);

      act(() => onChange({ matches: true }));
      expect(result.current.open).toBe(false);

      unmount();
      expect(removeEventListener).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
