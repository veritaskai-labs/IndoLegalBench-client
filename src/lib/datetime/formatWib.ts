const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const pad2 = (value: number) => String(value).padStart(2, "0");

/**
 * Tampilkan waktu ISO dalam WIB, misalnya "03 Okt 2026, 14.05 WIB".
 * WIB tetap UTC+7 sepanjang tahun, jadi cukup geser 7 jam dan baca bagian UTC;
 * hasilnya tidak bergantung pada zona waktu browser. Teks yang bukan tanggal dikembalikan apa adanya.
 */
export function formatWib(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;

  const wib = new Date(time + WIB_OFFSET_MS);
  const date = `${pad2(wib.getUTCDate())} ${MONTHS[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
  const clock = `${pad2(wib.getUTCHours())}.${pad2(wib.getUTCMinutes())}`;
  return `${date}, ${clock} WIB`;
}
