const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Geser ke WIB dan baca bagian UTC; null untuk teks yang bukan tanggal. */
function toWib(iso: string): Date | null {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? null : new Date(time + WIB_OFFSET_MS);
}

function dayMonthYear(wib: Date): string {
  return `${pad2(wib.getUTCDate())} ${MONTHS[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
}

/**
 * Tampilkan waktu ISO dalam WIB, misalnya "03 Okt 2026, 14.05 WIB".
 * WIB tetap UTC+7 sepanjang tahun, jadi cukup geser 7 jam dan baca bagian UTC;
 * hasilnya tidak bergantung pada zona waktu browser. Teks yang bukan tanggal dikembalikan apa adanya.
 */
export function formatWib(iso: string): string {
  const wib = toWib(iso);
  if (wib === null) return iso;

  const clock = `${pad2(wib.getUTCHours())}.${pad2(wib.getUTCMinutes())}`;
  return `${dayMonthYear(wib)}, ${clock} WIB`;
}

/**
 * Tanggal WIB saja, misalnya "27 Okt 2026", untuk nilai yang server kirim sebagai tanggal
 * (YYYY-MM-DD) maupun waktu lengkap. Teks yang bukan tanggal dikembalikan apa adanya.
 */
export function formatWibDate(iso: string): string {
  const wib = toWib(iso);
  return wib === null ? iso : dayMonthYear(wib);
}

/**
 * Jam WIB saja, untuk penanda "Diperbarui …" di dasbor (AC2).
 * Teks yang bukan tanggal jadi string kosong supaya penandanya tidak ditampilkan.
 */
export function formatWibClock(iso: string): string {
  const wib = toWib(iso);
  if (wib === null) return "";

  return `${pad2(wib.getUTCHours())}.${pad2(wib.getUTCMinutes())}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Waktu relatif dalam Bahasa Indonesia untuk &lt; 7 hari; lebih dari itu pakai tanggal WIB. */
export function formatRelativeTime(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;

  const diffMs = Date.now() - time;
  if (diffMs < 0) return formatWibDate(iso);
  if (diffMs < MINUTE_MS) return "Baru saja";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} menit yang lalu`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} jam yang lalu`;

  const days = Math.floor(diffMs / DAY_MS);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari yang lalu`;

  return formatWibDate(iso);
}

/**
 * Waktu "Terakhir Kali Diubah" di daftar kasus (SCRUM-381): "40 menit lalu", "5 jam lalu", "Kemarin",
 * "3 hari lalu", dan dari satu minggu ke atas tanggal dengan jam WIB. Dibuat terpisah dari formatRelativeTime
 * karena SuiteList dan halaman suite memakai kata dan batas yang berbeda. Waktu di depan jam browser
 * ditampilkan sebagai tanggal dan jam, bukan hitungan mundur. Teks yang bukan tanggal dikembalikan apa adanya.
 */
export function formatLastModified(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;

  const diffMs = Date.now() - time;
  if (diffMs < 0) return formatWib(iso);
  if (diffMs < MINUTE_MS) return "Baru saja";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} menit lalu`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} jam lalu`;

  const days = Math.floor(diffMs / DAY_MS);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;

  return formatWib(iso);
}
