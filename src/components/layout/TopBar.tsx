"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { MOBILE_NAV_ID, SIDEBAR_ID, useMobileNav } from "@/components/layout/MobileNav";
import { replaySidebarIntro } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { LOGOUT_URL } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const isScrolled = () => window.scrollY > 0;
const atTopOnServer = () => false;

const ICON_BUTTON = "place-items-center rounded-control text-ink hover:bg-surface";
const SMOOTH = "duration-200 ease-out motion-reduce:transition-none";

export function TopBar() {
  const auth = useAuth();
  const menu = useMobileNav();
  // SCRUM-347: at the very top the bar is full height; once the page scrolls it stays on top, compact.
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, atTopOnServer);
  const user = auth.status === "authenticated" ? auth.user : null;
  // The brand leads to the role's first page, because Developer AI has no Beranda.
  const home = user === null ? undefined : navForRole(user.role)[0]?.items[0];
  const brand = `font-serif font-bold leading-7 text-ink transition-[font-size] ${SMOOTH} ${scrolled ? "text-lg" : "text-lg sm:text-[22px]"}`;

  // The bar is fixed over a spacer that keeps the full height, so shrinking it never shortens the page:
  // on a page barely taller than the window, that would scroll it back to the top and flicker.
  return (
    <div className="h-18 shrink-0">
      <header
        className={`fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 border-b border-line-soft bg-paper px-4 transition-[height,box-shadow] sm:px-5 ${SMOOTH} ${
          scrolled ? "h-12 shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "h-18"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {user !== null && (
            <>
              {/* Phones: the side column is hidden below md, so this opens it as a panel (SCRUM-204 E2E F3). */}
              <button
                type="button"
                onClick={menu.toggle}
                aria-expanded={menu.open}
                aria-controls={MOBILE_NAV_ID}
                aria-label={menu.open ? "Tutup menu" : "Buka menu"}
                className={`-ml-2 grid h-11 w-11 md:hidden ${ICON_BUTTON}`}
              >
                <Icon name="panel" size={18} />
              </button>
              <button
                type="button"
                onClick={menu.toggleCollapsed}
                aria-expanded={!menu.collapsed}
                aria-controls={SIDEBAR_ID}
                aria-label={menu.collapsed ? "Lebarkan menu" : "Minimize menu"}
                className={`-ml-1 hidden h-9 w-9 md:grid ${ICON_BUTTON}`}
              >
                <Icon name="panel" size={18} />
              </button>
            </>
          )}
          {home ? (
            <Link href={home.href} aria-label={`IndoLegalBench, ke ${home.label}`} className={brand}>
              IndoLegalBench
            </Link>
          ) : (
            <span className={brand}>IndoLegalBench</span>
          )}
        </div>

        {user !== null && (
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span
              title={`${user.name} · ${ROLE_LABEL[user.role]}`}
              className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-paper"
            >
              {initials(user.name)}
            </span>
            {/* Phones keep the initials; the name and role pushed the bar past 375 px. */}
            <span className="hidden leading-4 sm:block">
              <span className="block text-sm font-medium text-ink">{user.name}</span>
              {/* Folds away instead of vanishing, so the name slides to the middle. */}
              <span
                aria-hidden={scrolled}
                className={`block overflow-hidden text-xs text-muted transition-[max-height,opacity] ${SMOOTH} ${
                  scrolled ? "max-h-0 opacity-0" : "max-h-4 opacity-100"
                }`}
              >
                {ROLE_LABEL[user.role]}
              </span>
            </span>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line-soft sm:block" />
            <form method="POST" action={LOGOUT_URL} onSubmit={replaySidebarIntro}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              >
                <Icon name="keluar" />
                <span className="sr-only sm:not-sr-only">Keluar</span>
              </button>
            </form>
          </div>
        )}
      </header>
    </div>
  );
}
