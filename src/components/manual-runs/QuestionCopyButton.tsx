"use client";

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/**
 * Menyalin hanya teks pertanyaan kasus, tanpa instruksi tambahan, supaya pertanyaan ke platform
 * persis sama di setiap percobaan (AC3). Sengaja tidak ada "Salin semua" atau "Salin dan lanjut".
 */
export function QuestionCopyButton({ question, caseCode }: Readonly<{ question: string; caseCode: string }>) {
  const { status, copy } = useCopyToClipboard();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Salin pertanyaan ${caseCode}`}
        onClick={() => void copy(question)}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {status === "copied" ? "Tersalin" : "Salin pertanyaan"}
      </button>
      <span role="status" className="text-xs text-red-700">
        {status === "failed" ? "Gagal menyalin. Pilih teks pertanyaan lalu salin manual." : ""}
      </span>
    </div>
  );
}
