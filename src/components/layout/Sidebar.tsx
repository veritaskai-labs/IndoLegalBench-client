"use client";

import Link from "next/link";
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ID, useMobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { navForRole, type NavGroup } from "@/lib/nav";
import { ROLE_LABEL } from "@/types";

const COLUMN = "flex-col justify-between border-r border-slate-200 bg-white p-4";

export function Sidebar() {
  const auth = useAuth();
  const pathname = usePathname();
  const menu = useMobileNav();

  if (auth.status !== "authenticated") return null;
  const groups = navForRole(auth.user.role);

  return (
    <>
      {/* Laptop and tablet: a fixed column. Phones open the same links from the top bar. */}
      <aside className={`hidden w-64 shrink-0 md:flex ${COLUMN}`}>
        <NavLinks groups={groups} pathname={pathname} />
      </aside>

      {menu.open && (
        <MobilePanel onClose={menu.close}>
          {/* Below sm the top bar only shows initials, so the panel says who is signed in. */}
          <p className="mb-4 border-b border-slate-200 px-3 pb-4 text-sm leading-tight">
            <span className="block font-medium text-slate-900">{auth.user.name}</span>
            <span className="block text-xs text-slate-500">{ROLE_LABEL[auth.user.role]}</span>
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
      <div className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col overflow-y-auto border-r border-slate-200 bg-white p-4">
        {children}
      </div>
    </dialog>
  );
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: Readonly<{ groups: NavGroup[]; pathname: string; onNavigate?: () => void }>) {
  return (
    <>
      <nav className="space-y-6">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              {group.heading}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-2 text-sm ${
                        active
                          ? "bg-indigo-50 font-medium text-indigo-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="mt-auto border-t border-slate-200 pt-4 font-mono text-[11px] text-slate-400">
        hanya data sintetis
        <br />
        L1 · L3 · L9 ditegakkan
      </p>
    </>
  );
}
