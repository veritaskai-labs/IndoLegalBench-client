"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** id of the phone navigation panel, for the menu button's aria-controls. */
export const MOBILE_NAV_ID = "mobile-nav";

// Tailwind's md breakpoint, where Sidebar shows its column.
const WIDE_ENOUGH_FOR_COLUMN = "(min-width: 768px)";

type MobileNav = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

// Outside the app shell (tests, the login screen) the menu simply never opens.
const CLOSED: MobileNav = { open: false, toggle: () => {}, close: () => {} };

const MobileNavContext = createContext<MobileNav>(CLOSED);

/**
 * Open state of the phone menu, shared by TopBar (button) and Sidebar (panel).
 *
 * The panel remembers the page it was opened on, so moving to another page closes it
 * without an effect that resets state.
 */
export function MobileNavProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const close = useCallback(() => setOpenOn(null), []);
  const toggle = useCallback(
    () => setOpenOn((current) => (current === pathname ? null : pathname)),
    [pathname],
  );

  // The panel is a modal <dialog>, whose cancel event already handles Escape. This listener
  // is the fallback for browsers without showModal, where the dialog is only `open`.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // From md up the sidebar column is visible again (e.g. a rotated tablet), so the panel goes.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const wide = window.matchMedia(WIDE_ENOUGH_FOR_COLUMN);
    const onChange = (event: { matches: boolean }) => {
      if (event.matches) close();
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [open, close]);

  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav(): MobileNav {
  return useContext(MobileNavContext);
}
