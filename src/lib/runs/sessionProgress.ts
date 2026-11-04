/**
 * Angka layar progres satu sesi (PBI-12 AC5, AC6, server SCRUM-215).
 *
 * Fungsi murni: tidak memanggil API dan tidak mengenal React, jadi angkanya bisa
 * diuji tanpa merender panel dan tanpa menunggu polling.
 */

const COUNT = new Intl.NumberFormat("id-ID");

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

