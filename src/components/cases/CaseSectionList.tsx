import { SECTION_KEYS, sectionLabel, sectionLines } from "@/lib/cases/versionSections";
import type { VersionSections } from "@/types/caseVersion";

/** Dua baris bisa sama persis (mis. dua pengurang poin sama), jadi kuncinya teks ditambah urutan kemunculan teks itu. */
function keyedLines(lines: string[]): { id: string; line: string }[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const count = (seen.get(line) ?? 0) + 1;
    seen.set(line, count);
    return { id: `${line}#${count}`, line };
  });
}

/**
 * Bagian-bagian kasus sebagai daftar label dan isi, hanya baca. Dipakai halaman review dan
 * detail snapshot di halaman Eksekusi, jadi bagian baru dari server cukup ditambah sekali di
 * SECTION_VIEW (versionSections.ts) dan tampil di keduanya. omit: bagian yang sudah tampil
 * di kepala halaman pemanggil.
 */
export function CaseSectionList({
  sections,
  omit = [],
}: Readonly<{ sections: VersionSections; omit?: readonly string[] }>) {
  return (
    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {SECTION_KEYS.filter((key) => !omit.includes(key)).map((key) => {
        const lines = sectionLines(key, sections);
        return (
          // K-08: label kecil berwarna, isi lebih besar dan gelap, supaya tidak menyatu.
          <div key={key} className="px-4 py-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {sectionLabel(key)}
            </dt>
            <dd className="mt-2 space-y-1 text-base text-slate-900">
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
  );
}
