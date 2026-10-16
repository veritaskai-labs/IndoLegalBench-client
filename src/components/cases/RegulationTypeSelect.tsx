"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { searchRegulationTypes } from "@/lib/cases/regulationTypeSearch";
import type { RegulationType } from "@/types/regulationType";
import { CONTROL_CLASS, describedBy, ErrorText, FieldLabel, HintText } from "./fields";

/** Daftar resmi lebih dari 260 jenis: tampilkan sebagian dan minta pengguna mempersempit. */
export const MAX_VISIBLE_OPTIONS = 50;

type Props = {
  label: string;
  /** Jenis aktif dari useRegulationTypes, diurutkan server. Muat sekali di bagian rujukan. */
  types: readonly RegulationType[];
  /** Kode jenis yang dipilih, atau "" bila belum ada. */
  value: string;
  onChange: (code: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Ref ke elemen input, supaya form bisa memindahkan fokus ke field ini saat ada error. */
  inputRef?: Ref<HTMLInputElement>;
};

/** Indeks opsi yang disorot setelah satu panah. Berputar di ujung, dan -1 berarti belum ada. */
function stepActive(key: "ArrowDown" | "ArrowUp", current: number, count: number): number {
  if (key === "ArrowDown") return (current + 1) % count;
  return current <= 0 ? count - 1 : current - 1;
}

function statusMessage(total: number, matches: number): string | undefined {
  if (total === 0) return "Belum ada jenis peraturan yang tersedia.";
  if (matches === 0) return "Jenis peraturan tidak ditemukan.";
  if (matches > MAX_VISIBLE_OPTIONS) {
    return `Menampilkan ${MAX_VISIBLE_OPTIONS} dari ${matches} jenis. Ketik untuk mempersempit.`;
  }
  return undefined;
}

/**
 * Combobox jenis peraturan yang bisa dicari (pola ARIA combobox dengan listbox). Terkendali:
 * nilai hanya berubah saat pengguna memilih, bukan saat mengetik. Mengosongkan kolom lalu
 * keluar menghapus pilihan; keluar dengan teks yang tidak dipilih mengembalikan label terpilih.
 */
export function RegulationTypeSelect({
  label,
  types,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  disabled = false,
  inputRef,
}: Readonly<Props>) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = useCallback((code: string) => `${id}-option-${code}`, [id]);

  const [open, setOpen] = useState(false);
  /** Teks yang sedang diketik, atau null bila pengguna tidak sedang mengedit. */
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Kode yang tidak ada di daftar (jenis yang sudah dinonaktifkan) ditampilkan apa adanya.
  const chosenText = types.find((type) => type.code === value)?.label ?? value;
  const matches = useMemo(() => searchRegulationTypes(types, query ?? ""), [types, query]);
  const visible = matches.slice(0, MAX_VISIBLE_OPTIONS);
  const message = open ? statusMessage(types.length, matches.length) : undefined;
  const showList = open && visible.length > 0;
  const activeCode = showList ? visible[activeIndex]?.code : undefined;

  useEffect(() => {
    if (activeCode === undefined) return;
    document.getElementById(optionId(activeCode))?.scrollIntoView?.({ block: "nearest" });
  }, [activeCode, optionId]);

  function close() {
    setOpen(false);
    setQuery(null);
    setActiveIndex(-1);
  }

  function choose(code: string) {
    onChange(code);
    close();
  }

  /** Panah pertama pada daftar tertutup hanya membukanya, panah berikutnya memindahkan sorotan. */
  function moveHighlight(key: "ArrowDown" | "ArrowUp") {
    if (!open) setOpen(true);
    else if (visible.length > 0) setActiveIndex(stepActive(key, activeIndex, visible.length));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(event.key);
        break;
      case "Enter":
        // Saat terbuka, Enter hanya untuk memilih: jangan ikut mengirim form.
        if (!open) break;
        event.preventDefault();
        if (activeCode !== undefined) choose(activeCode);
        break;
      case "Escape":
        if (!open) break;
        event.preventDefault();
        close();
        break;
    }
  }

  function handleBlur() {
    const cleared = query !== null && query.trim() === "" && value !== "";
    close();
    if (cleared) onChange("");
    onBlur?.();
  }

  return (
    <div className="relative">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint !== undefined && <HintText id={`${id}-hint`} text={hint} />}
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={activeCode === undefined ? undefined : optionId(activeCode)}
        {...describedBy(id, hint, error)}
        disabled={disabled}
        placeholder={placeholder}
        value={query ?? chosenText}
        onClick={() => !disabled && setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={CONTROL_CLASS}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-300 bg-white py-1 text-sm shadow-lg"
        >
          {visible.map((type, index) => (
            <li
              key={type.code}
              id={optionId(type.code)}
              role="option"
              aria-selected={type.code === value}
              // mousedown di opsi tidak boleh memindahkan fokus, kalau tidak onBlur menutup daftar
              // sebelum klik sempat memilih.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(type.code)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${
                index === activeIndex ? "bg-slate-100" : ""
              } ${type.code === value ? "font-medium" : ""}`}
            >
              <span>{type.label}</span>
              {type.singkatan !== null && (
                <span className="text-xs text-slate-500">{type.singkatan}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {message !== undefined && (
        <output className="mt-1 block text-xs text-slate-500">{message}</output>
      )}
      {error !== undefined && <ErrorText id={`${id}-error`} message={error} />}
    </div>
  );
}
