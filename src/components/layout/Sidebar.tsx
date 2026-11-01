"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ID, useMobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { navForRole, type NavGroup } from "@/lib/nav";

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
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            onClick={menu.close}
            className="absolute inset-0 h-full w-full bg-slate-900/40"
          />
          <div
            id={MOBILE_NAV_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className={`absolute inset-y-0 left-0 flex w-64 max-w-[80vw] overflow-y-auto ${COLUMN}`}
          >
            <NavLinks groups={groups} pathname={pathname} onNavigate={menu.close} />
          </div>
        </div>
      )}
    </>
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

      <p className="border-t border-slate-200 pt-4 font-mono text-[11px] text-slate-400">
        hanya data sintetis
        <br />
        L1 · L3 · L9 ditegakkan
      </p>
    </>
  );
}
