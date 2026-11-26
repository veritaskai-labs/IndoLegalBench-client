"use client";

import Link from "next/link";
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ID, SIDEBAR_ID, useMobileNav } from "@/components/layout/MobileNav";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { isNavItemActive, navForRole, type NavGroup } from "@/lib/nav";
import { ROLE_LABEL } from "@/types";

export function Sidebar() {
  const auth = useAuth();
  const pathname = usePathname();
  const menu = useMobileNav();

  if (auth.status !== "authenticated") return null;
  const groups = navForRole(auth.user.role);

  return (
    <>
      {/* Laptop and tablet: a column that stays in view under the compact top bar while the page scrolls.
          Phones open the same links from the top bar. */}
      <aside
        id={SIDEBAR_ID}
        aria-label="Navigasi utama"
        className={`hidden shrink-0 flex-col border-r border-line-soft bg-paper pt-2 pb-4 md:sticky md:top-12 md:flex md:h-[calc(100dvh-4.5rem)] md:self-start md:overflow-y-auto ${
          menu.collapsed ? "w-16 px-2" : "w-62 px-3"
        }`}
      >
        <NavLinks groups={groups} pathname={pathname} collapsed={menu.collapsed} />
        <div className="mt-auto border-t border-line-soft pt-3">
          <button
            type="button"
            onClick={menu.toggleCollapsed}
            aria-controls={SIDEBAR_ID}
            aria-expanded={!menu.collapsed}
            title={menu.collapsed ? "Lebarkan menu" : undefined}
            className={`flex h-9 w-full items-center gap-2.5 rounded-control text-sm text-muted hover:bg-surface hover:text-ink ${
              menu.collapsed ? "justify-center" : "px-3"
            }`}
          >
            <Icon name={menu.collapsed ? "lebarkan" : "ciutkan"} />
            <span className={menu.collapsed ? "sr-only" : undefined}>
              {menu.collapsed ? "Lebarkan menu" : "Ciutkan menu"}
            </span>
          </button>
        </div>
      </aside>

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
}: Readonly<{ groups: NavGroup[]; pathname: string; collapsed?: boolean; onNavigate?: () => void }>) {
  return (
    <nav>
      {groups.map((group, index) => (
        <div key={group.heading}>
          {/* Collapsed, the headings give way to a rule between groups. */}
          {collapsed
            ? index > 0 && <hr className="mx-2 my-3 border-line-soft" />
            : group.heading && (
                <p className="px-3 pt-5 pb-1.5 text-xs font-medium uppercase tracking-[0.04em] text-subtle">
                  {group.heading}
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
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`flex h-9 items-center gap-2.5 rounded-control text-sm ${collapsed ? "justify-center" : "px-3"} ${
                      active ? "bg-ink text-paper" : "text-ink hover:bg-surface"
                    }`}
                  >
                    <Icon name={item.icon} className="opacity-80" />
                    <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
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
