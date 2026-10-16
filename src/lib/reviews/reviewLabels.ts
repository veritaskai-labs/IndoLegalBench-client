import type { AssignmentStatus, RoundStatus } from "@/types/reviewAdmin";

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