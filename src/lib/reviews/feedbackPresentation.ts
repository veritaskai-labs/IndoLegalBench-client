import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { CaseStatus } from "@/types/case";

export type FeedbackPresentation = {
  /** Teks komentar tidak ditulis di halaman; komentar dan thread dibuka lewat tombol. */
  commentInDrawer: boolean;
  launcherLabel: string;
  /** Bila ada, panel diskusi hanya dibaca: keterangan ini menggantikan form balasan. */
  readOnlyNotice: string | null;
};

const COPY = messages({
  id: {
    open: "Buka diskusi komentar",
    reply: "Balas komentar",
    view: "Lihat komentar",
    approvedNotice: "Kasus sudah disetujui. Komentar dan thread hanya dapat dibaca.",
  },
  en: {
    open: "Open comment discussion",
    reply: "Reply to comment",
    view: "View comment",
    approvedNotice: "The case is approved. Comments and the thread are read-only.",
  },
});

/** status null berarti kasus belum dimuat. */
export function feedbackPresentation(status: CaseStatus | null, locale: Locale = DEFAULT_LOCALE): FeedbackPresentation {
  const copy = text(COPY, locale);
  if (status === "needs_revision") return { commentInDrawer: false, launcherLabel: copy.reply, readOnlyNotice: null };
  if (status === "approved") {
    return { commentInDrawer: true, launcherLabel: copy.view, readOnlyNotice: copy.approvedNotice };
  }
  return { commentInDrawer: false, launcherLabel: copy.open, readOnlyNotice: null };
}
