import type { VersionSections } from "@/types/caseVersion";

/**
 * Nama bagian kasus untuk riwayat versi. Record dengan key dari kontrak:
 * bagian baru dari server membuat tsc gagal sampai labelnya ditambah.
 * Labelnya sama dengan yang tampil di editor.
 */
const SECTION_LABEL: Record<keyof VersionSections, string> = {
  "identity.title": "Judul",
  "identity.question": "Pertanyaan",
  category: "Kategori",
  case_code: "ID kasus",
  split_tag: "Tag dev/test",
  legal_refs: "Rujukan hukum",
  answer_criteria: "Kriteria jawaban",
  traps: "Jebakan",
};

/** Label satu bagian. Nama yang belum dikenal (server lebih baru dari client) tampil apa adanya. */
export function sectionLabel(name: string): string {
  return Object.hasOwn(SECTION_LABEL, name) ? SECTION_LABEL[name as keyof VersionSections] : name;
}

/**
 * Teks kolom "Perubahan" di riwayat. Versi 1 selalu punya daftar kosong karena
 * tidak ada versi sebelumnya; versi lain dengan daftar kosong berarti tidak ada bagian yang beda.
 */
export function describeChanged(versionNo: number, changed: readonly string[]): string {
  if (changed.length > 0) return changed.map(sectionLabel).join(", ");
  return versionNo === 1 ? "Versi pertama" : "Tidak ada bagian yang berubah";
}
