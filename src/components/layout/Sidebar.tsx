"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { navForRole } from "@/lib/nav";

export function Sidebar() {
  const auth = useAuth();
  const pathname = usePathname();

  if (auth.status !== "authenticated") return null;
  const groups = navForRole(auth.user.role);

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
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
    </aside>
  );
}