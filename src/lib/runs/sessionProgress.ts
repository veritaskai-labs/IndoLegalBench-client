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

/**
 * "3 dari 60 (5,0%)" di bawah label Panggilan gagal (AC5, SCRUM-266 K3). Penyebutnya panggilan
 * yang sudah selesai, karena persen dari server (percent_failed) juga dihitung atas itu; memakai
 * total panggilan akan membuat jumlah dan persennya tidak cocok. Gagal tetap per panggilan (AC4).
 */
export function failedText(failed: number, completedCalls: number, percentFailed: string | number): string {
  if (failed === 0) return "Tidak ada kegagalan";
  return `${countOfTotal(failed, completedCalls)} (${percentText(percentFailed)})`;
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
/**
 * "7 dari 20 (35%)" di bawah label Kasus selesai (SCRUM-266 K3). Kasus dihitung selesai oleh server
 * (SCRUM-265): semua pengulangannya sudah diproses. Total 0 berarti snapshot belum ada.
 */
export function casesDoneText(completed: number, total: number, percent: number): string {
  if (total === 0) return "Belum ada kasus";
  return `${countOfTotal(completed, total)} (${wholePercentText(percent)})`;
}

/**
 * Persen kasus selesai sebagai bilangan bulat 0 sampai 100, untuk teks dan bar. Server sudah
 * membulatkan ke bawah dan membatasinya; di sini dijaga lagi supaya angka yang rusak tidak
 * menggambar bar melewati ujungnya, dan 100 hanya tampil saat memang semua selesai.
 */
export function wholePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.floor(value)));
}

/** "35%", tanpa desimal (SCRUM-266). */
export function wholePercentText(value: number): string {
  return `${wholePercent(value)}%`;
}

/**
 * Kolom Progres daftar sesi (SCRUM-266): "7 dari 20 kasus · 35%". Tanpa teks "Belum ada"
 * supaya setiap baris punya bentuk yang sama; sesi antre ditangani formatProgress.
 */
export function casesDoneSummary(completed: number, total: number, percent: number): string {
  return `${countOfTotal(completed, total)} kasus · ${wholePercentText(percent)}`;
}
