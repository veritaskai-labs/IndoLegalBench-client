import type { CaseStatus } from "@/types/case";

export type FeedbackPresentation = {
  /** Teks komentar tidak ditulis di halaman; komentar dan thread dibuka lewat tombol. */
  commentInDrawer: boolean;
  launcherLabel: string;
  /** Bila ada, panel diskusi hanya dibaca: keterangan ini menggantikan form balasan. */
  readOnlyNotice: string | null;
};

const DEFAULT_PRESENTATION: FeedbackPresentation = {
  commentInDrawer: false,
  launcherLabel: "Buka diskusi komentar",
  readOnlyNotice: null,
};

/** Satu tempat yang menentukan tampilan catatan peninjau per status kasus, supaya status baru cukup satu baris. */
const BY_STATUS: Partial<Record<CaseStatus, FeedbackPresentation>> = {
  needs_revision: { commentInDrawer: false, launcherLabel: "Balas komentar", readOnlyNotice: null },
  approved: {
    commentInDrawer: true,
    launcherLabel: "Lihat komentar",
    readOnlyNotice: "Kasus sudah disetujui. Komentar dan thread hanya dapat dibaca.",
  },
};

/** status null berarti kasus belum dimuat. */
export function feedbackPresentation(status: CaseStatus | null): FeedbackPresentation {
  return (status !== null && BY_STATUS[status]) || DEFAULT_PRESENTATION;
}
