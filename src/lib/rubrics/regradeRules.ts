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
  | "already_latest";

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
  already_latest: "Hasil terbaru sudah memakai versi rubrik terbaru.",
};

/**
 * Kapan "Nilai ulang dengan versi terbaru" ditawarkan (PBI-14 AC7), dan dengan versi mana.
 * Server tidak membuka daftar run, jadi keputusan diambil dari hasil terbaru (GET /results) dan
 * daftar versi (GET /admin/rubrics). Server tetap yang menolak bila keadaan sudah berubah (409).
 * Label hasil yang tidak berbentuk versi tidak mengunci tombol: server yang menentukan.
 */
export function regradeAvailability(input: {
  role: Role | null;
  session: Pick<SessionDetail, "status" | "archived_at">;
  versions: RubricVersionSummary[];
  latest: SessionGradingResponse | null;
}): RegradeAvailability {
  const { role, session, versions, latest } = input;
  if (role !== "admin") return { available: false, reason: "not_admin" };
  if (!isGradableSession(session)) return { available: false, reason: "session_not_gradable" };

  const newest = latestVersion(versions);
  if (newest === null) return { available: false, reason: "no_rubric" };
  if (latest === null) return { available: false, reason: "never_graded" };

  if (usesNewestOrAbove(latest.rubric_version, newest.version_no)) return { available: false, reason: "already_latest" };
  return { available: true, version: newest };
}

/** Label "v2" dibaca sebagai nomor; label lain dianggap lebih lama supaya tombol tidak terkunci. */
function usesNewestOrAbove(label: string, newestNo: number): boolean {
  const match = /^v(\d+)$/.exec(label);
  if (match === null) return false;
  return Number(match[1]) >= newestNo;
}
