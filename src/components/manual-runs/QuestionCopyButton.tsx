"use client";

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";

const COPY = messages({
  id: {
    label: "Salin pertanyaan {code}",
    copied: "Tersalin",
    idle: "Salin pertanyaan",
    failed: "Gagal menyalin. Pilih teks pertanyaan lalu salin manual.",
  },
  en: {
    label: "Copy question {code}",
    copied: "Copied",
    idle: "Copy question",
    failed: "Could not copy. Select the question text and copy it manually.",
  },
});

/**
 * Menyalin hanya teks pertanyaan kasus, tanpa instruksi tambahan, supaya pertanyaan ke platform
 * persis sama di setiap percobaan (AC3). Sengaja tidak ada "Salin semua" atau "Salin dan lanjut".
 */
export function QuestionCopyButton({ question, caseCode }: Readonly<{ question: string; caseCode: string }>) {
  const text = useText(COPY);
  const { status, copy } = useCopyToClipboard();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={fill(text.label, { code: caseCode })}
        onClick={() => void copy(question)}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {status === "copied" ? text.copied : text.idle}
      </button>
      <output className="text-xs text-red-700">
        {status === "failed" ? text.failed : ""}
      </output>
    </div>
  );
}
