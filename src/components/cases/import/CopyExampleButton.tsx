"use client";

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/**
 * Menyalin contoh isi sel satu kolom apa adanya, supaya bisa ditempel ke Google Sheets (SCRUM-380).
 * Bila clipboard ditolak atau tidak ada, pengguna diminta menyalin manual; contohnya tetap tampil di halaman.
 */
export function CopyExampleButton({ fieldName, text }: Readonly<{ fieldName: string; text: string }>) {
  const { status, copy } = useCopyToClipboard();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label={`Salin contoh ${fieldName}`}
        onClick={() => void copy(text)}
        className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface"
      >
        {status === "copied" ? "Tersalin" : "Salin"}
      </button>
      <output className="text-xs text-red-700">
        {status === "failed" ? "Gagal menyalin. Pilih contoh lalu salin manual." : ""}
      </output>
    </div>
  );
}
