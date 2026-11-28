"use client";

import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";

const COPY = messages({
  id: {
    title: "Panduan mengisi jawaban",
    copy: "Klik tombol \"Salin pertanyaan\" pada kasus. Yang tersalin hanya teks pertanyaan.",
    open: "Buka platform dan mulai percakapan baru untuk setiap percobaan.",
    pasteQuestion: "Tempel teks pertanyaan persis sama pada setiap percobaan. Jangan menambah atau mengubah kalimat.",
    copyAnswer: "Salin seluruh isi jawaban platform apa adanya, termasuk penafian dan saran lanjutan.",
    pasteAnswer: "Tempel jawaban di kotak percobaan yang sesuai pada kartu kasus, lalu klik Simpan.",
  },
  en: {
    title: "Guide to filling in answers",
    copy: "Click the \"Copy question\" button on the case. Only the question text is copied.",
    open: "Open the platform and start a new conversation for each attempt.",
    pasteQuestion: "Paste the question text exactly the same on every attempt. Do not add or change the wording.",
    copyAnswer: "Copy the platform's entire answer as it is, including disclaimers and follow-up suggestions.",
    pasteAnswer: "Paste the answer into the matching attempt box on the case card, then click Save.",
  },
});

/**
 * Panduan tetap di layar pengisian (AC3): cara bertanya ke platform dan cara menyalin.
 * Tidak ada template unduh atau unggah; semuanya ditempel langsung di kartu kasus.
 */
export function CopyGuide() {
  const copy = useText(COPY);
  const steps = [copy.copy, copy.open, copy.pasteQuestion, copy.copyAnswer, copy.pasteAnswer];
  return (
    <section aria-labelledby="copy-guide-title" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      <h2 id="copy-guide-title" className="text-sm font-semibold text-slate-900">
        {copy.title}
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
