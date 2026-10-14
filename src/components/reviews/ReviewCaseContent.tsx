import { SECTION_KEYS, sectionLabel, sectionLines } from "@/lib/cases/versionSections";
import { reviewCopyToSections } from "@/lib/reviews/reviewCaseSections";
import type { ReviewCopy } from "@/types/review";

/** Kode kasus dan pertanyaan ada di kepala halaman, jadi tidak diulang di daftar bagian. */
const HEADER_SECTIONS: readonly string[] = ["case_code", "identity.question"];
const BODY_SECTIONS = SECTION_KEYS.filter((key) => !HEADER_SECTIONS.includes(key));

/**
 * Isi kasus yang ditinjau, hanya baca. Tag dev/test tampil sebagai informasi. Tidak ada kolom isian
 * atau tombol di sini: form penilaian ada di komponen lain.
 */
export function ReviewCaseContent({ copy }: { copy: ReviewCopy }) {
  const sections = reviewCopyToSections(copy);

  return (
    <article aria-label="Isi kasus" className="space-y-5">
      <header className="space-y-2">
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-slate-500">{copy.case_code}</span>
          <span className="text-slate-500">Versi {copy.version_no}</span>
        </p>
        <h1 className="text-xl font-semibold text-slate-900">{copy.identity.question}</h1>
      </header>

      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {BODY_SECTIONS.map((key) => {
          const lines = sectionLines(key, sections);
          return (
            <div key={key} className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {sectionLabel(key)}
              </dt>
              <dd className="mt-1 space-y-1 text-sm text-slate-800">
                {lines.length === 0 ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  lines.map((line, index) => (
                    <p key={index} className="whitespace-pre-wrap">
                      {line}
                    </p>
                  ))
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
