"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { formatWib } from "@/lib/datetime/formatWib";
import { badgeLabel } from "@/lib/notifications/badgeLabel";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notificationApi";
import type { AppNotification } from "@/types/notification";

const PAGE_SIZE = 10;

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: AppNotification[] };

// Hanya path aplikasi; "//…" dan "/\…" dibaca browser sebagai situs lain.
const isInAppLink = (link: string) =>
  link.startsWith("/") && !link.startsWith("//") && !link.startsWith("/\\");

const markAllRead = (items: AppNotification[]) => {
  const now = new Date().toISOString();
  return items.map((item) => (item.read_at === null ? { ...item, read_at: now } : item));
};

/** Lonceng di TopBar: badge belum dibaca dan daftar 10 notifikasi terbaru. */
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { count, refresh } = useUnreadCount();
  // Terbuka hanya di halaman tempat ia dibuka, jadi pindah halaman menutupnya.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const wrapper = useRef<HTMLDivElement>(null);
  const bellButton = useRef<HTMLButtonElement>(null);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const badge = badgeLabel(count);
  const bellLabel = badge ? `Notifikasi, ${badge} belum dibaca` : "Notifikasi";

  async function load() {
    setList({ status: "loading" });
    try {
      const page = await listNotifications(PAGE_SIZE);
      setList({ status: "ready", items: page.items });
    } catch {
      setList({ status: "error" });
    }
  }

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpenOn(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      bellButton.current?.focus();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpenOn(null);
      return;
    }
    void load();
    setOpenOn(pathname);
  }

  async function markRead(id: string) {
    try {
      await markNotificationRead(id);
    } catch {
      // Halaman sudah dibuka; badge menyusul di polling berikutnya.
    }
    refresh();
  }

  function openItem(item: AppNotification) {
    setOpenOn(null);
    if (isInAppLink(item.link)) router.push(item.link);
    if (item.read_at === null) void markRead(item.id);
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
    } catch {
      return;
    }
    setList((current) =>
      current.status === "ready" ? { status: "ready", items: markAllRead(current.items) } : current,
    );
    refresh();
  }

  // Badge juga menghitung yang di luar 10 terbaru, jadi tombol ikut badge.
  const hasUnread =
    count > 0 || (list.status === "ready" && list.items.some((item) => item.read_at === null));

  let body: ReactNode;
  if (list.status === "loading") {
    body = <LoadingSkeleton variant="lines" rows={3} className="p-4" />;
  } else if (list.status === "error") {
    body = <ErrorState message="Gagal memuat notifikasi." onRetry={() => void load()} />;
  } else if (list.items.length === 0) {
    body = <EmptyState title="Belum ada notifikasi" description="Pemberitahuan baru akan muncul di sini." />;
  } else {
    body = (
      <ul className="divide-y divide-slate-100">
        {list.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => openItem(item)}
              className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at === null ? "bg-indigo-500" : "bg-transparent"}`}
              />
              <span className="min-w-0 space-y-0.5">
                <span
                  className={`block text-sm text-slate-900 ${item.read_at === null ? "font-semibold" : ""}`}
                >
                  {item.title}
                </span>
                <span className="block truncate text-xs text-slate-600">{item.body}</span>
                <span className="block text-[11px] text-slate-400">{formatWib(item.created_at)}</span>
                {item.read_at === null && <span className="sr-only">Belum dibaca</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={bellButton}
        type="button"
        aria-label={bellLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
        className="relative grid h-8 w-8 place-items-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {badge && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        // <dialog> non-modal: tetap di bawah lonceng, tanpa backdrop.
        <dialog
          open
          aria-label="Notifikasi"
          className="absolute left-auto right-0 z-20 mx-0 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifikasi</h2>
            {hasUnread && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">{body}</div>
        </dialog>
      )}
    </div>
  );
}
