import type { ReportValidation, ReportViolation, ReportWarning, ScoreScope } from "@/types/reports";

/**
 * Alasan sebuah jenis nilai tidak bisa dipilih bila irisan kasus sesi terpilih tidak memuat kasusnya
 * (PBI-15 AC14). Ditulis sebagai tabel supaya jenis nilai baru cukup satu baris, bukan cabang `if` baru.
 * Server hanya mengirim jenis nilai yang tersedia, bukan alasannya, jadi kalimatnya ada di sini.
 */
export const SCOPE_UNAVAILABLE: Readonly<Record<ScoreScope, string>> = {
  test: "Tidak tersedia: sesi terpilih tidak punya kasus test yang sama.",
  dev: "Tidak tersedia: sesi terpilih tidak punya kasus dev yang sama.",
  dev_test: "Tidak tersedia: Dev + Test butuh kasus dev dan test sekaligus pada kasus yang sama.",
};

/** Alasan bila belum ada yang ditawarkan karena sesinya belum cukup, bukan karena irisan kasusnya kosong. */
export const SCOPE_WAITING = "Pilih sesi dulu, lalu pilihan ini diperiksa.";

/** Jawaban validate yang sudah dipilah untuk tampilan: pelanggaran umum, per sesi, dan peringatan. */
export interface ValidationView {
  /** Pelanggaran pilihan, syarat, dan irisan kasus; tampil di atas daftar sesi. */
  general: ReportViolation[];
  /** Pelanggaran satu sesi, ditempel ke baris sesinya. */
  bySession: ReadonlyMap<string, ReportViolation[]>;
  /** Penanda yang tidak memblokir (percobaan berbeda, rentang manual, versi model, uji coba). */
  warnings: ReportWarning[];
  /** Ada pelanggaran: tombol Buat laporan harus nonaktif. */
  blocking: boolean;
}

export interface ScopeOption {
  scope: ScoreScope;
  disabled: boolean;
  /** Keterangan di samping opsi yang nonaktif; null untuk opsi yang bisa dipilih. */
  reason: string | null;
}

/**
 * Pilah jawaban validate. Bergantung pada daftar `violations`, bukan hanya `valid`, supaya tombol
 * tidak pernah aktif selama masih ada pelanggaran. Pelanggaran sesi tanpa session_id tidak bisa
 * ditempel ke satu baris, jadi dianggap umum agar tidak hilang. null (belum ada jawaban) tidak memblokir:
 * server tetap memeriksa ulang saat submit.
 */
export function validationView(validation: ReportValidation | null): ValidationView {
  if (validation === null) return { general: [], bySession: new Map(), warnings: [], blocking: false };
  const general: ReportViolation[] = [];
  const bySession = new Map<string, ReportViolation[]>();
  for (const violation of validation.violations) {
    const sessionId = violation.kind === "session" ? violation.session_id : null;
    if (sessionId === null || sessionId === undefined) {
      general.push(violation);
    } else {
      bySession.set(sessionId, [...(bySession.get(sessionId) ?? []), violation]);
    }
  }
  return {
    general,
    bySession,
    warnings: validation.warnings,
    blocking: !validation.valid || validation.violations.length > 0,
  };
}

/**
 * Opsi jenis nilai untuk peran ini beserta statusnya menurut server (AC14). Daftar `allowed` dari
 * peran tetap menjadi batas atas: Viewer tidak pernah melihat Dev walau server menjawab lain.
 * Bila server tidak menawarkan apa pun, alasannya tergantung penyebabnya: irisan kasus kosong
 * (ada pelanggaran case_slice) atau sesi belum cukup dipilih.
 */
export function scopeOptions(allowed: readonly ScoreScope[], validation: ReportValidation | null): ScopeOption[] {
  if (validation === null) return allowed.map((scope) => ({ scope, disabled: false, reason: null }));
  const offered = new Set<ScoreScope>(validation.available_scopes);
  const sliceIsEmpty = validation.violations.some((violation) => violation.kind === "case_slice");
  return allowed.map((scope) => {
    if (offered.has(scope)) return { scope, disabled: false, reason: null };
    const reason = offered.size === 0 && !sliceIsEmpty ? SCOPE_WAITING : SCOPE_UNAVAILABLE[scope];
    return { scope, disabled: true, reason };
  });
}

/**
 * Jenis nilai yang dipakai form: yang sekarang bila masih tersedia, bila tidak pindah ke opsi tersedia
 * pertama, dan bila tidak ada yang tersedia tetap yang sekarang (tombol tetap mati lewat pelanggaran).
 */
export function chooseScope(current: ScoreScope, options: readonly ScopeOption[]): ScoreScope {
  const enabled = options.filter((option) => !option.disabled);
  if (enabled.some((option) => option.scope === current)) return current;
  return enabled[0]?.scope ?? current;
}
