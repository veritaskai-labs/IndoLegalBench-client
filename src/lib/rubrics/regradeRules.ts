import type { Role } from "@/types";
import type { GradingRun, RubricVersion } from "@/types/rubric";
import { latestVersion } from "./rubricVersion";

export type RegradeUnavailableReason = "not_admin" | "no_rubric" | "never_graded" | "already_latest" | "in_progress";

export type RegradeAvailability =
  | { available: true; version: RubricVersion }
  | { available: false; reason: RegradeUnavailableReason };

/**
 * Penjelasan di samping tombol yang mati. not_admin tidak ada di sini: peran lain tidak
 * diperlihatkan tombolnya sama sekali, jadi tidak ada yang perlu dijelaskan.
 */
export const REGRADE_UNAVAILABLE_TEXT: Record<Exclude<RegradeUnavailableReason, "not_admin">, string> = {
  no_rubric: "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik.",
  never_graded: "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu.",
  already_latest: "Hasil terbaru sudah memakai versi rubrik terbaru.",
  in_progress: "Penilaian sedang berjalan. Tunggu sampai selesai.",
};

const IN_PROGRESS = new Set<GradingRun["status"]>(["queued", "running"]);

/**
 * Kapan "Nilai ulang dengan versi terbaru" ditawarkan (PBI-14 AC7), dan dengan versi mana.
 * Status sesi sengaja tidak dicek: server yang memutuskan (409), dan syarat sesi manual
 * menyusul di PBI-22. Yang dicek di sini hanya yang bisa diketahui dari rubrik dan riwayat.
 */
export function regradeAvailability(input: {
  role: Role;
  versions: RubricVersion[];
  runs: GradingRun[];
}): RegradeAvailability {
  const { role, versions, runs } = input;
  if (role !== "admin") return { available: false, reason: "not_admin" };

  const newest = latestVersion(versions);
  if (newest === null) return { available: false, reason: "no_rubric" };

  if (runs.some((run) => IN_PROGRESS.has(run.status))) return { available: false, reason: "in_progress" };

  // Hasil lama tetap tersimpan, jadi riwayat bisa berisi banyak run; yang dibandingkan hanya yang terbaru.
  const current = runs.find((run) => run.is_latest);
  if (current === undefined) return { available: false, reason: "never_graded" };

  // Nomor di run itu sendiri, supaya versi yang tidak ada di daftar tidak membuka tombol lagi.
  if (current.rubric_version_no >= newest.version_no) return { available: false, reason: "already_latest" };

  return { available: true, version: newest };
}
