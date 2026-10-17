import type {
  AssignmentStatus,
  RoundDecision,
  RoundStatus,
  VerdictDecision,
  VerdictView,
} from "@/types/reviewAdmin";

/** Record<RoundStatus, string>: kalau server menambah status baru, tsc gagal sampai labelnya diisi. */
export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  awaiting_assignment: "Menunggu penugasan",
  open: "Sedang dinilai",
  decided: "Sudah diputuskan",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  active: "Aktif",
  replaced: "Diganti",
  void: "Dibatalkan",
};

export const VERDICT_DECISION_LABEL: Record<VerdictDecision, string> = {
  approve: "Setuju",
  revise: "Minta revisi",
};

export const ROUND_DECISION_LABEL: Record<RoundDecision, string> = {
  approved: "Disetujui",
  revise: "Perlu revisi",
};

/** AC3 meminta status penilaian sudah atau belum, jadi null pun punya kata-katanya sendiri. */
export function verdictLabel(
  verdict: VerdictView | null | undefined,
): string {
  return verdict ? VERDICT_DECISION_LABEL[verdict.decision] : "Belum menilai";
}