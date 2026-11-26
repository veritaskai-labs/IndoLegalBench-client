"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ID, SIDEBAR_ID, useMobileNav } from "@/components/layout/MobileNav";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { isNavItemActive, navForRole, type NavGroup } from "@/lib/nav";
import { ROLE_LABEL } from "@/types";

// Collapsing only animates the width and fades the words: icons keep their place, so nothing jumps.
const SMOOTH = "duration-200 ease-out motion-reduce:transition-none";
const fade = (hidden: boolean) => `transition-opacity ${SMOOTH} ${hidden ? "opacity-0" : "opacity-100"}`;

/** Resting on an icon this long opens the collapsed column over the page until the pointer leaves it. */
export const PEEK_AFTER_MS = 2000;

export function Sidebar() {
  const auth = useAuth();
  const pathname = usePathname();
  const menu = useMobileNav();
  const [onIcon, setOnIcon] = useState(false);
  const [peeking, setPeeking] = useState(false);

  useEffect(() => {
    if (!menu.collapsed || !onIcon) return;
    const timer = setTimeout(() => setPeeking(true), PEEK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [menu.collapsed, onIcon]);

  if (auth.status !== "authenticated") return null;
  const groups = navForRole(auth.user.role);
  const expanded = !menu.collapsed || peeking;

  return (
    <>
      {/* Laptop and tablet: a column that stays in view under the compact top bar while the page scrolls.
          Phones open the same links from the top bar. */}
      {/* The wrapper holds the column's place in the layout; a peeking column grows past it, over the page,
          so the page never reflows for a peek. */}
      <div
        className={`hidden shrink-0 transition-[width] md:sticky md:top-12 md:z-20 md:block md:h-[calc(100dvh-4.5rem)] md:self-start ${SMOOTH} ${
          menu.collapsed ? "w-16" : "w-62"
        }`}
      >
        <aside
          id={SIDEBAR_ID}
          aria-label="Navigasi utama"
          onMouseLeave={() => {
            setOnIcon(false);
            setPeeking(false);
          }}
          className={`hidden h-full flex-col overflow-x-hidden overflow-y-auto border-r border-line-soft bg-paper px-3 pt-2 pb-4 transition-[width,box-shadow] md:flex ${SMOOTH} ${
            expanded ? "w-62" : "w-16"
          } ${peeking ? "shadow-menu" : ""}`}
        >
          <NavLinks groups={groups} pathname={pathname} collapsed={!expanded} onIconHover={setOnIcon} />
          <div className="mt-auto border-t border-line-soft pt-3">
            <button
              type="button"
              onClick={() => {
                setPeeking(false);
                // A peek is not a choice to keep the column open, so Minimize just ends it.
                if (!peeking) menu.toggleCollapsed();
              }}
              aria-controls={SIDEBAR_ID}
              aria-expanded={expanded}
              aria-label={expanded ? "Minimize menu" : "Lebarkan menu"}
              className="flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-control px-3 text-sm whitespace-nowrap text-muted hover:bg-surface hover:text-ink"
            >
              <Icon name="ciutkan" className={`transition-transform ${SMOOTH} ${expanded ? "" : "rotate-180"}`} />
              <span aria-hidden="true" className={fade(!expanded)}>
                Minimize
              </span>
            </button>
          </div>
        </aside>
      </div>

      {menu.open && (
        <MobilePanel onClose={menu.close}>
          {/* Below sm the top bar only shows initials, so the panel says who is signed in. */}
          <p className="mb-2 border-b border-line-soft px-3 pb-4 text-sm leading-tight">
            <span className="block font-medium text-ink">{auth.user.name}</span>
            <span className="block text-xs text-muted">{ROLE_LABEL[auth.user.role]}</span>
          </p>
          <NavLinks groups={groups} pathname={pathname} onNavigate={menu.close} />
        </MobilePanel>
      )}
    </>
  );
}

/**
 * Phone menu as a native modal <dialog> (Sonar S6819): the browser traps focus and Escape
 * fires cancel. The dialog covers the screen; the backdrop is a real button, so no click
 * handler sits on a non-interactive element.
 */
function MobilePanel({ onClose, children }: Readonly<{ onClose: () => void; children: React.ReactNode }>) {
  // Returning a cleanup means React never calls this ref with null (same as DiscussionDrawer).
  const attach = useCallback((node: HTMLDialogElement) => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (typeof node.showModal === "function") node.showModal();
    else node.open = true;
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      ref={attach}
      id={MOBILE_NAV_ID}
      aria-label="Menu navigasi"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent"
    >
      <button
        type="button"
        aria-label="Tutup menu navigasi"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-slate-900/40"
      />
      <div className="absolute inset-y-0 left-0 flex w-62 max-w-[80vw] flex-col overflow-y-auto border-r border-line-soft bg-paper p-3">
        {children}
      </div>
    </dialog>
  );
}

function NavLinks({
  groups,
  pathname,
  collapsed = false,
  onNavigate,
  onIconHover,
}: Readonly<{
  groups: NavGroup[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onIconHover?: (hovering: boolean) => void;
}>) {
  return (
    <nav>
      {groups.map((group) => (
        <div key={group.heading}>
          {/* Collapsed, the heading fades into a rule of the same height, so the links below stay put. */}
          {group.heading && (
            <p className="relative flex h-[42px] items-end px-3 pb-1.5 text-xs font-medium tracking-[0.04em] whitespace-nowrap text-subtle uppercase">
              <span className={fade(collapsed)}>{group.heading}</span>
              <span aria-hidden="true" className={`absolute inset-x-2 top-1/2 h-px bg-line-soft ${fade(!collapsed)}`} />
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    onMouseEnter={() => onIconHover?.(true)}
                    onMouseLeave={() => onIconHover?.(false)}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`flex h-9 items-center gap-2.5 overflow-hidden rounded-control px-3 text-sm whitespace-nowrap ${
                      active ? "bg-ink text-paper" : "text-ink hover:bg-surface"
                    }`}
                  >
                    <Icon name={item.icon} className="opacity-80" />
                    <span className={fade(collapsed)}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
