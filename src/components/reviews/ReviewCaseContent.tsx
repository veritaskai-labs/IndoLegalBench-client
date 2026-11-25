import { CaseSectionList } from "@/components/cases/CaseSectionList";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { reviewCopyToSections } from "@/lib/reviews/reviewCaseSections";
import type { ReviewCopy } from "@/types/review";

/** Kode kasus, pertanyaan, dan tag ada di kepala halaman, jadi tidak diulang di daftar bagian. */
const HEADER_SECTIONS: readonly string[] = ["case_code", "identity.question", "split_tag"];

/**
 * Isi kasus yang ditinjau, hanya baca. Tag dev/test tampil sebagai informasi. Tidak ada kolom isian
 * atau tombol di sini: form penilaian ada di komponen lain.
 */
export function ReviewCaseContent({ copy }: Readonly<{ copy: ReviewCopy }>) {
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

      <CaseSectionList sections={reviewCopyToSections(copy)} omit={HEADER_SECTIONS} />
    </article>
  );
}
