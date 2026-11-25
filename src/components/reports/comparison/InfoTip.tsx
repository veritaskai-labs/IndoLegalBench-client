"use client";

import { useId, useState } from "react";

/**
 * Ikon info biru yang menjelaskan satu istilah (komentar PO di Figma, 25 Nov). Penjelasannya muncul saat ikon
 * di-hover, difokus keyboard, atau diketuk (layar sentuh tidak punya hover), dan Escape menutupnya tanpa
 * memindahkan fokus (WCAG 1.4.13). Teksnya selalu menjadi deskripsi tombol lewat aria-describedby, juga saat
 * tooltip tertutup, jadi pembaca layar mendengarnya tanpa membuka. Kandidat komponen bersama SCRUM-343.
 */
export function InfoTip({ label, text }: Readonly<{ label: string; text: string }>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Penjelasan ${label}`}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") hide();
        }}
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-accent text-[10px] font-semibold leading-none text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">i</span>
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className="absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 whitespace-normal rounded-md bg-ink px-2.5 py-2 text-left text-xs font-normal leading-snug text-paper shadow-lg"
      >
        {text}
      </span>
    </span>
  );
}
