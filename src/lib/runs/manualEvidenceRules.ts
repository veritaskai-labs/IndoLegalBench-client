/** Batas bukti per jawaban (AC7). Server memeriksa lagi dengan 409 EVIDENCE_LIMIT_REACHED. */
export const MAX_EVIDENCE_PER_ANSWER = 3;

export const EVIDENCE_LIMIT_MESSAGE = `Bukti sudah mencapai batas ${MAX_EVIDENCE_PER_ANSWER} per jawaban. Hapus satu bukti untuk menambah yang baru.`;

const ALLOWED_FILE_TYPES: readonly string[] = ["image/png", "image/jpeg", "application/pdf"];

export type EvidenceInput = { kind: "file"; file: File } | { kind: "link"; url: string };
type EvidenceKind = EvidenceInput["kind"];

/**
 * Satu aturan per jenis bukti. Menambah jenis baru berarti menambah satu entri di tabel ini,
 * alur validateEvidence tidak berubah. Ukuran berkas sengaja tidak diperiksa di sini: batas
 * teknisnya diatur tim di server dan dijawab 413.
 */
const KIND_RULES: { [K in EvidenceKind]: (input: Extract<EvidenceInput, { kind: K }>) => string | null } = {
  file: ({ file }) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) return "Hanya berkas PNG, JPG, atau PDF yang boleh diunggah.";
    if (file.size === 0) return "Berkas kosong. Pilih tangkapan layar yang benar.";
    return null;
  },
  link: ({ url }) => {
    const text = url.trim();
    if (text === "") return "Tautan bukti wajib diisi.";
    return URL.canParse(text) && /^https?:$/.test(new URL(text).protocol)
      ? null
      : "Tautan bukti harus diawali http:// atau https://.";
  },
};

/** Null count berarti peran ini tidak boleh melihat bukti, jadi tidak ada yang bisa ditambah. */
export function canAddEvidence(count: number | null): boolean {
  return count !== null && count < MAX_EVIDENCE_PER_ANSWER;
}

/** Pesan galat untuk bukti yang akan ditambah, atau null bila boleh dikirim ke server. */
export function validateEvidence(input: EvidenceInput, currentCount: number): string | null {
  if (!canAddEvidence(currentCount)) return EVIDENCE_LIMIT_MESSAGE;
  const rule = KIND_RULES[input.kind] as (value: EvidenceInput) => string | null;
  return rule(input);
}

/** Tautan bukti hanya bisa diklik bila http atau https; ini pagar kedua di belakang pemeriksaan server. */
export function safeEvidenceHref(url: string | null): string | null {
  if (url === null || !URL.canParse(url)) return null;
  return /^https?:$/.test(new URL(url).protocol) ? url : null;
}

/** Ukuran berkas bukti yang mudah dibaca, misalnya "1,5 KB". Tautan (tanpa ukuran) jadi teks kosong. */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const [value, unit] = bytes < 1024 * 1024 ? [bytes / 1024, "KB"] : [bytes / (1024 * 1024), "MB"];
  return `${String(Math.round(value * 10) / 10).replace(".", ",")} ${unit}`;
}
