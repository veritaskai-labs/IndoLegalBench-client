"use client";

import { useId, useState } from "react";

/** Posisi teks terhadap ikon: di tengah, atau rata kiri untuk kolom pertama supaya tidak terpotong tepi tabel. */
export type InfoTipAlign = "center" | "start";

const ALIGN: Readonly<Record<InfoTipAlign, string>> = { center: "left-1/2 -translate-x-1/2", start: "left-0" };

/**
 * Ikon info biru yang menjelaskan satu istilah (komentar PO di Figma, 25 Nov). Penjelasannya muncul saat ikon
 * di-hover, difokus keyboard, atau diketuk (layar sentuh tidak punya hover), dan Escape menutupnya tanpa
 * memindahkan fokus (WCAG 1.4.13). Hover milik ikon dan teksnya bersama, jadi penunjuk boleh pindah ke teks
 * (hoverable). Klik hanya membuka, tidak membalik: klik atau ketukan asli mengirim mouseenter dan focus lebih
 * dulu, jadi klik yang membalik langsung menutupnya lagi (review #125). Teksnya selalu menjadi deskripsi tombol
 * lewat aria-describedby, juga saat tertutup. Kandidat komponen bersama SCRUM-343.
 */
export function InfoTip({
  label,
  text,
  align = "center",
}: Readonly<{ label: string; text: string; align?: InfoTipAlign }>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span className="relative inline-flex align-middle">
      {/* The text sits inside the button, so moving the pointer onto it is still hovering the button (WCAG 1.4.13
          hoverable) without hover handlers on a static element. aria-label keeps the button's name short; the
          text is its description. */}
      <button
        type="button"
        aria-label={`Penjelasan ${label}`}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(event) => {
          if (event.key === "Escape") hide();
        }}
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-accent text-[10px] font-semibold leading-none text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">i</span>
        <span
          id={id}
          role="tooltip"
          hidden={!open}
          className={`absolute top-full z-30 mt-2 w-56 ${ALIGN[align]} cursor-auto whitespace-normal rounded-md bg-ink px-2.5 py-2 text-left text-xs font-normal leading-snug text-paper shadow-lg`}
        >
          {text}
        </span>
      </button>
    </span>
  );
}
