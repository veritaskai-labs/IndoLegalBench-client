import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { CaseStatus } from "@/types/case";

/**
 * Record, bukan string bebas: status baru di contract membuat tsc gagal sampai labelnya ditambah.
 * "Pasal" and other legal terms are not status names; those stay for SCRUM-358.
 */
const CASE_STATUS_TEXT = messages<Record<CaseStatus, string>>({
  id: {
    draft: "Draft",
    in_review: "Dalam tinjauan",
    needs_revision: "Perlu revisi",
    approved: "Disetujui",
  },
  en: {
    draft: "Draft",
    in_review: "In review",
    needs_revision: "Needs revision",
    approved: "Approved",
  },
});

/** Indonesian names. Dashboard cards still read this until SCRUM-358. */
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = CASE_STATUS_TEXT.id;

export function caseStatusLabel(status: CaseStatus, locale: Locale = DEFAULT_LOCALE): string {
  return text(CASE_STATUS_TEXT, locale)[status];
}

/** Satu sumber warna badge status: editor, tabel suite, dan kartu kasus memakai ini. */
export const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  in_review: "bg-amber-50 text-amber-800 border-amber-200",
  needs_revision: "bg-rose-50 text-rose-800 border-rose-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
};