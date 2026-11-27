"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import type { Role } from "@/types";
import { SearchResults } from "./SearchResults";

/**
 * Kotak cari di header (SCRUM-352, PBI-20 AC1). Laptop: kotak di tengah header, hasil di panel di
 * bawahnya. HP: tombol kaca pembesar membuka baris cari selebar layar dengan tombol Batal.
 * Hasil berupa daftar tautan biasa, jadi Tab dan Enter bekerja tanpa role ARIA tambahan.
 */
export function GlobalSearch({ role }: Readonly<{ role: Role }>) {
  const search = useGlobalSearch(role);
  const pathname = usePathname();
  // Terbuka hanya di halaman tempat ia dibuka, jadi pindah halaman menutupnya (sama dengan lonceng).
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [phoneOpenOn, setPhoneOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const phoneOpen = phoneOpenOn === pathname;
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const magnifier = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpenOn(null);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  // Baris cari di HP baru ada setelah render, jadi fokus dipindah sesudahnya.
  useEffect(() => {
    if (phoneOpen) input.current?.focus();
  }, [phoneOpen]);

  function close() {
    setOpenOn(null);
    if (phoneOpen) {
      setPhoneOpenOn(null);
      search.setQuery("");
      magnifier.current?.focus();
    } else {
      input.current?.focus();
    }
  }

  function choose() {
    setOpenOn(null);
    setPhoneOpenOn(null);
    search.setQuery("");
  }

  function openOnPhone() {
    setPhoneOpenOn(pathname);
    setOpenOn(pathname);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpenOn(pathname);
    search.searchNow();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    // The only links inside the box are the results.
    const links = Array.from(event.currentTarget.querySelectorAll("a"));
    if (links.length === 0) return;
    event.preventDefault();
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      links[Math.min(at + 1, links.length - 1)]?.focus();
    } else if (at <= 0) {
      input.current?.focus();
    } else {
      links[at - 1]?.focus();
    }
  }

  const showPanel = open && search.state.status !== "idle";

  return (
    <div ref={wrapper} onKeyDown={onKeyDown} className="ml-auto md:ml-0 md:max-w-md md:flex-1">
      <button
        ref={magnifier}
        type="button"
        aria-label="Cari"
        aria-expanded={phoneOpen}
        aria-controls={inputId}
        onClick={openOnPhone}
        className="grid h-9 w-9 place-items-center rounded-control text-ink hover:bg-surface md:hidden"
      >
        <Icon name="cari" size={18} />
      </button>

      <search
        className={`${
          phoneOpen ? "fixed inset-x-0 top-0 z-40 flex h-14 border-b border-line-soft bg-paper px-4" : "hidden"
        } items-center gap-2 md:relative md:flex md:h-auto md:border-0 md:bg-transparent md:px-0`}
      >
        <form onSubmit={submit} className="relative flex-1">
          <label htmlFor={inputId} className="sr-only">
            Cari suite, kasus, dan sesi
          </label>
          <Icon name="cari" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            id={inputId}
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Cari suite, kasus, sesi…"
            value={search.query}
            onChange={(event) => {
              search.setQuery(event.target.value);
              setOpenOn(pathname);
            }}
            onFocus={() => setOpenOn(pathname)}
            aria-controls={panelId}
            className="h-9 w-full rounded-control border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-subtle"
          />
        </form>
        {phoneOpen && (
          <button
            type="button"
            onClick={close}
            className="h-9 shrink-0 rounded-control px-2 text-sm font-medium text-ink hover:bg-surface md:hidden"
          >
            Batal
          </button>
        )}

        <div
          id={panelId}
          hidden={!showPanel}
          className="fixed inset-x-0 top-14 bottom-0 overflow-y-auto bg-paper md:absolute md:inset-x-0 md:top-full md:bottom-auto md:mt-2 md:max-h-[70vh] md:rounded-control md:border md:border-line-soft md:shadow-lg"
        >
          {showPanel && <SearchResults state={search.state} onRetry={search.searchNow} onChoose={choose} />}
        </div>
      </search>
    </div>
  );
}
