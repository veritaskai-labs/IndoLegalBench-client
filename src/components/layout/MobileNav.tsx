"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** id of the phone navigation panel, for the menu button's aria-controls. */
export const MOBILE_NAV_ID = "mobile-nav";

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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav(): MobileNav {
  return useContext(MobileNavContext);
}
