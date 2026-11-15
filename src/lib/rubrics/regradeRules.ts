import { isGradableSession } from "@/lib/grading/gradingRules";
import type { Role } from "@/types";
import type { SessionGradingResponse } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";
import type { RubricVersionSummary } from "@/types/rubric";
import { latestVersion } from "./rubricVersion";

export type RegradeUnavailableReason =
  | "not_admin"
  | "session_not_gradable"
  | "no_rubric"
  | "never_graded"
  | "grading_in_progress";

export type RegradeAvailability =
  | { available: true; version: RubricVersionSummary }
  | { available: false; reason: RegradeUnavailableReason };

/**
 * Penjelasan di samping tombol yang mati. not_admin tidak ada di sini: peran lain tidak
 * diperlihatkan tombolnya sama sekali, jadi tidak ada yang perlu dijelaskan.
 */
export const REGRADE_UNAVAILABLE_TEXT: Record<Exclude<RegradeUnavailableReason, "not_admin">, string> = {
  session_not_gradable: "Sesi ini belum bisa dinilai ulang. Hanya sesi yang berjalan atau sudah selesai, dan belum diarsipkan.",
  no_rubric: "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik.",
  never_graded: "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu.",
  // K-13 (SCRUM-285): server menjawab 409 GRADING_IN_PROGRESS selama ada run yang antre atau berjalan.
  grading_in_progress: "Penilaian sesi ini sedang berjalan di latar belakang. Nilai ulang bisa dipakai lagi setelah selesai.",
};

/**
 * Kapan "Nilai ulang" ditawarkan (PBI-14 AC7), dan versi mana yang dipilih lebih dulu. Hasil yang
 * sudah memakai versi terbaru tetap boleh dinilai ulang, karena Admin bisa memilih LLM judge lain
 * untuk jawaban yang sama (feedback UAT K-17/K-18). Server tetap yang menolak (409/422).
 */
export function regradeAvailability(input: {
  role: Role | null;
  session: Pick<SessionDetail, "status" | "archived_at">;
  versions: RubricVersionSummary[];
  latest: SessionGradingResponse | null;
  /** Ada run yang antre atau berjalan di latar belakang (K-13). */
  gradingActive?: boolean;
}): RegradeAvailability {
  const { role, session, versions, latest, gradingActive = false } = input;
  if (role !== "admin") return { available: false, reason: "not_admin" };
  if (!isGradableSession(session)) return { available: false, reason: "session_not_gradable" };

  const newest = latestVersion(versions);
  if (newest === null) return { available: false, reason: "no_rubric" };
  if (latest === null) return { available: false, reason: "never_graded" };
  if (gradingActive) return { available: false, reason: "grading_in_progress" };
  return { available: true, version: newest };
}
