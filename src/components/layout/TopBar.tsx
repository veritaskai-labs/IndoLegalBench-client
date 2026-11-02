"use client";

import { MOBILE_NAV_ID, useMobileNav } from "@/components/layout/MobileNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { LOGOUT_URL } from "@/lib/auth";
import { ROLE_LABEL } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopBar() {
  const auth = useAuth();
  const menu = useMobileNav();

  return (
    <header className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 sm:px-6">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        {auth.status === "authenticated" && (
          // Phones only: the sidebar is hidden below md (SCRUM-204 E2E F3).
          <button
            type="button"
            onClick={menu.toggle}
            aria-expanded={menu.open}
            aria-controls={MOBILE_NAV_ID}
            aria-label={menu.open ? "Tutup menu" : "Buka menu"}
            className="-ml-2 grid h-11 w-11 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm.75 4.5a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H2.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <span className="h-5 w-5 rounded bg-indigo-500" />
        IndoLegalBench
      </span>

      {auth.status === "authenticated" && (
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span
            title={`${auth.user.name} · ${ROLE_LABEL[auth.user.role]}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-indigo-600 text-xs font-semibold text-white"
          >
            {initials(auth.user.name)}
          </span>
          {/* Phones keep the initials; the name and role pushed the bar past 375 px. */}
          <span className="hidden text-right text-xs leading-tight sm:block">
            <span className="block font-medium text-white">
              {auth.user.name}
            </span>
            <span className="block text-slate-400">
              {ROLE_LABEL[auth.user.role]}
            </span>
          </span>
          <form method="POST" action={LOGOUT_URL}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Keluar
            </button>
          </form>
        </div>
      )}
    </header>
  );
}