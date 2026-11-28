/**
 * Angka layar progres satu sesi (PBI-12 AC5, AC6, server SCRUM-215).
 *
 * Fungsi murni: tidak memanggil API dan tidak mengenal React, jadi angkanya bisa
 * diuji tanpa merender panel dan tanpa menunggu polling.
 */

import { formatWib } from "@/lib/datetime/formatWib";
import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";

const COUNT = new Intl.NumberFormat("id-ID");

const OF_TOTAL = messages({
  id: "{completed} dari {total}",
  en: "{completed} of {total}",
});

const CALLS_NONE = messages({
  id: "Belum ada panggilan",
  en: "No calls yet",
});

const FAILURES_NONE = messages({
  id: "Tidak ada kegagalan",
  en: "No failures",
});

const CASES_NONE = messages({
  id: "Belum ada kasus",
  en: "No cases yet",
});

const CASES_SUMMARY = messages({
  id: "{count} kasus · {percent}",
  en: "{count} cases · {percent}",
});

const REMAINING = messages({
  id: {
    unknown: "Belum bisa diperkirakan",
    done: "Selesai",
    underMinute: "kurang dari 1 menit",
    minute: "sekitar {minutes} menit",
    minutes: "sekitar {minutes} menit",
    hour: "sekitar {hours} jam",
    hours: "sekitar {hours} jam",
    hoursMinutes: "sekitar {hours} jam {rest} menit",
  },
  en: {
    unknown: "Cannot estimate yet",
    done: "Done",
    underMinute: "less than 1 minute",
    minute: "about {minutes} minute",
    minutes: "about {minutes} minutes",
    hour: "about {hours} hour",
    hours: "about {hours} hours",
    hoursMinutes: "about {hours} hours {rest} minutes",
  },
});

const NOT_STARTED = messages({
  id: "Belum mulai",
  en: "Not started",
});

/** Satu desimal, sama dengan yang dibulatkan server (progress._percent). */
const PERCENT = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * "240 dari 300" (AC5). Total 0 di panel berarti snapshot belum ada. Daftar sesi
 * sengaja berbeda di kasus ini: lihat formatProgress di sessionRules.
 */
export function callCountText(completed: number, total: number, locale: Locale = DEFAULT_LOCALE): string {
  if (total === 0) return text(CALLS_NONE, locale);
  return countOfTotal(completed, total, locale);
}

/**
 * "1.200 dari 1.500". Satu-satunya tempat angka ini diformat, dipakai panel progres
 * dan daftar sesi, supaya satu sesi terbaca sama di kedua halaman.
 */
export function countOfTotal(completed: number, total: number, locale: Locale = DEFAULT_LOCALE): string {
  return fill(text(OF_TOTAL, locale), { completed: COUNT.format(completed), total: COUNT.format(total) });
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
export function failedText(
  failed: number,
  completedCalls: number,
  percentFailed: string | number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (failed === 0) return text(FAILURES_NONE, locale);
  return `${countOfTotal(failed, completedCalls, locale)} (${percentText(percentFailed)})`;
}

/**
 * Perkiraan sisa waktu dalam kata (AC5). null berarti belum ada panggilan selesai,
 * jadi kecepatannya belum diketahui. Menit dibulatkan ke atas dengan alasan yang
 * sama seperti di server: lebih baik terlalu lama daripada menjanjikan terlalu cepat.
 */
export function remainingTimeText(seconds: number | null, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(REMAINING, locale);
  if (seconds === null) return copy.unknown;
  if (seconds <= 0) return copy.done;
  if (seconds < 60) return copy.underMinute;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return fill(minutes === 1 ? copy.minute : copy.minutes, { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return fill(hours === 1 ? copy.hour : copy.hours, { hours });
  return fill(copy.hoursMinutes, { hours, rest });
}

/**
 * Waktu mulai sesi (AC5). null berarti sesi masih antre dan belum berjalan:
 * kolomnya nullable di kontrak (server SCRUM-215), mengikuti measurement_sessions.
 */
export function startedAtText(iso: string | null, locale: Locale = DEFAULT_LOCALE): string {
  return iso === null ? text(NOT_STARTED, locale) : formatWib(iso);
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
export function casesDoneText(completed: number, total: number, percent: number, locale: Locale = DEFAULT_LOCALE): string {
  if (total === 0) return text(CASES_NONE, locale);
  return `${countOfTotal(completed, total, locale)} (${wholePercentText(percent)})`;
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
export function casesDoneSummary(completed: number, total: number, percent: number, locale: Locale = DEFAULT_LOCALE): string {
  return fill(text(CASES_SUMMARY, locale), {
    count: countOfTotal(completed, total, locale),
    percent: wholePercentText(percent),
  });
}
