import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { SECTION_KEYS, sectionLabel, sectionLines } from "@/lib/cases/versionSections";
import { reviewCopyToSections } from "@/lib/reviews/reviewCaseSections";
import type { ReviewCopy } from "@/types/review";

/** Kode kasus, pertanyaan, dan tag ada di kepala halaman, jadi tidak diulang di daftar bagian. */
const HEADER_SECTIONS: readonly string[] = ["case_code", "identity.question", "split_tag"];
const BODY_SECTIONS = SECTION_KEYS.filter((key) => !HEADER_SECTIONS.includes(key));

/** Dua baris bisa sama persis (mis. dua jebakan sama), jadi kuncinya teks ditambah urutan kemunculan teks itu. */
function keyedLines(lines: string[]): { id: string; line: string }[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const count = (seen.get(line) ?? 0) + 1;
    seen.set(line, count);
    return { id: `${line}#${count}`, line };
  });
}

/**
 * Isi kasus yang ditinjau, hanya baca. Tag dev/test tampil sebagai informasi. Tidak ada kolom isian
 * atau tombol di sini: form penilaian ada di komponen lain.
 */
export function ReviewCaseContent({ copy }: Readonly<{ copy: ReviewCopy }>) {
  const sections = reviewCopyToSections(copy);

  return (
    <article aria-label="Isi kasus" className="space-y-5">
      <header className="space-y-2">
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-slate-500">{copy.case_code}</span>
          <span className="text-slate-500">Versi {copy.version_no}</span>
          <SplitTagBadge tag={copy.split_tag} infoOnly />
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
                  keyedLines(lines).map(({ id, line }) => (
                    <p key={id} className="whitespace-pre-wrap">
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
