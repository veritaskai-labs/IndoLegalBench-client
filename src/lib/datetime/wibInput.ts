const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Bentuk nilai <input type="datetime-local">, dengan detik opsional. */
const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad2 = (value: number) => String(value).padStart(2, "0");

/**
 * Nilai kolom tanggal-jam dibaca sebagai WIB (selaras dengan formatWib) dan dikirim ke server
 * sebagai ISO UTC. Nilai kosong, salah bentuk, atau tanggal yang tidak ada (bulan 13) jadi null.
 */
export function wibInputToIso(input: string): string | null {
  const match = INPUT_PATTERN.exec(input);
  if (match === null) return null;

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  const date = new Date(asUtc - WIB_OFFSET_MS);
  // Date.UTC menggulung tanggal yang tidak ada (31 Feb jadi Mar), jadi cocokkan balik bagiannya.
  const rolled = new Date(asUtc);
  const valid =
    rolled.getUTCMonth() === month - 1 &&
    rolled.getUTCDate() === day &&
    rolled.getUTCHours() === hour &&
    rolled.getUTCMinutes() === minute;
  return valid ? date.toISOString() : null;
}

/** Kebalikannya: waktu ISO ditampilkan di kolom tanggal-jam dalam WIB; bukan tanggal jadi kosong. */
export function isoToWibInput(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";

  const wib = new Date(time + WIB_OFFSET_MS);
  const date = `${wib.getUTCFullYear()}-${pad2(wib.getUTCMonth() + 1)}-${pad2(wib.getUTCDate())}`;
  return `${date}T${pad2(wib.getUTCHours())}:${pad2(wib.getUTCMinutes())}`;
}

/** Isian awal "tanggal dan jam jawaban diperoleh": sekarang, dalam WIB. */
export function nowWibInput(now: Date = new Date()): string {
  return isoToWibInput(now.toISOString());
}
