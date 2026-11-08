/**
 * Angka layar progres satu sesi (PBI-12 AC5, AC6, server SCRUM-215).
 *
 * Fungsi murni: tidak memanggil API dan tidak mengenal React, jadi angkanya bisa
 * diuji tanpa merender panel dan tanpa menunggu polling.
 */

import { formatWib } from "@/lib/datetime/formatWib";

const COUNT = new Intl.NumberFormat("id-ID");

/** Satu desimal, sama dengan yang dibulatkan server (progress._percent). */
const PERCENT = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * "240 dari 300" (AC5). Total 0 di panel berarti snapshot belum ada. Daftar sesi
 * sengaja berbeda di kasus ini: lihat formatProgress di sessionRules.
 */
export function callCountText(completed: number, total: number): string {
  if (total === 0) return "Belum ada panggilan";
  return countOfTotal(completed, total);
}

/**
 * Nilai bar progres, 0 sampai 100. Server mengirim Decimal, yang bisa sampai sebagai
 * string ("80.0"), jadi dibaca seperti formatRupiah membacanya. Angka di luar rentang
 * hanya bisa datang dari agregasi yang rusak, dan bar tetap tidak melewati ujungnya.
 */
export function progressBarPercent(value: string | number): number {
  const percent = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/**
 * "1.200 dari 1.500". Satu-satunya tempat angka ini diformat, dipakai panel progres
 * dan daftar sesi, supaya satu sesi terbaca sama di kedua halaman.
 */
export function countOfTotal(completed: number, total: number): string {
  return `${COUNT.format(completed)} dari ${COUNT.format(total)}`;
}

/** "80,0%". Bukan angka berarti agregasinya rusak, jadi tanda hubung, bukan "NaN%". */
export function percentText(value: string | number): string {
  const percent = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(percent)) return "–";
  return `${PERCENT.format(percent)}%`;
}

/** "12 gagal (5,0%)" (AC5). Persennya dari panggilan yang sudah selesai, dihitung server. */
export function failedText(failed: number, percentFailed: string | number): string {
  if (failed === 0) return "Tidak ada kegagalan";
  return `${COUNT.format(failed)} gagal (${percentText(percentFailed)})`;
}

/**
 * Perkiraan sisa waktu dalam kata (AC5). null berarti belum ada panggilan selesai,
 * jadi kecepatannya belum diketahui. Menit dibulatkan ke atas dengan alasan yang
 * sama seperti di server: lebih baik terlalu lama daripada menjanjikan terlalu cepat.
 */
export function remainingTimeText(seconds: number | null): string {
  if (seconds === null) return "Belum bisa diperkirakan";
  if (seconds <= 0) return "Selesai";
  if (seconds < 60) return "kurang dari 1 menit";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `sekitar ${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `sekitar ${hours} jam` : `sekitar ${hours} jam ${rest} menit`;
}

/**
 * Waktu mulai sesi (AC5). null berarti sesi masih antre dan belum berjalan:
 * kolomnya nullable di kontrak (server SCRUM-215), mengikuti measurement_sessions.
 */
export function startedAtText(iso: string | null): string {
  return iso === null ? "Belum mulai" : formatWib(iso);
}

/**
 * Sisa anggaran bulan ini sudah habis. Server menghentikan pengukuran otomatis saat
 * biaya mencapai batas anggaran produk, jadi panel perlu menandainya. Hanya tandanya
 * yang dibaca, bukan nilainya, sehingga Number cukup dan presisi sen tidak terpakai.
 */
export function budgetExhausted(remainingBudgetIdr: string): boolean {
  const remaining = Number(remainingBudgetIdr);
  return Number.isFinite(remaining) && remaining <= 0;
}