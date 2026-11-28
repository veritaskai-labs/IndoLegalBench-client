import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

/** Batas bukti per jawaban (AC7). Server memeriksa lagi dengan 409 EVIDENCE_LIMIT_REACHED. */
export const MAX_EVIDENCE_PER_ANSWER = 3;

const EVIDENCE_TEXT = messages({
  id: {
    type: "Hanya berkas PNG, JPG, atau PDF yang boleh diunggah.",
    empty: "Berkas kosong. Pilih tangkapan layar yang benar.",
    linkRequired: "Tautan bukti wajib diisi.",
    linkProtocol: "Tautan bukti harus diawali http:// atau https://.",
    limit: `Bukti sudah mencapai batas ${MAX_EVIDENCE_PER_ANSWER} per jawaban. Hapus satu bukti untuk menambah yang baru.`,
  },
  en: {
    type: "Only PNG, JPG, or PDF files can be uploaded.",
    empty: "The file is empty. Choose the correct screenshot.",
    linkRequired: "An evidence link is required.",
    linkProtocol: "An evidence link must start with http:// or https://.",
    limit: `Evidence has reached the limit of ${MAX_EVIDENCE_PER_ANSWER} per answer. Delete one piece of evidence to add another.`,
  },
});

export const EVIDENCE_LIMIT_MESSAGE = EVIDENCE_TEXT.id.limit;

export function evidenceMessage(issue: keyof typeof EVIDENCE_TEXT.id, locale: Locale = DEFAULT_LOCALE): string {
  return text(EVIDENCE_TEXT, locale)[issue];
}

const ALLOWED_FILE_TYPES: readonly string[] = ["image/png", "image/jpeg", "application/pdf"];
/** Tipe kosong atau generik: server memeriksa isi berkas (magic bytes), jadi client tidak menolaknya. */
const GENERIC_FILE_TYPES: readonly string[] = ["", "application/octet-stream"];

export type EvidenceInput = { kind: "file"; file: File } | { kind: "link"; url: string };
type EvidenceKind = EvidenceInput["kind"];

/**
 * Satu aturan per jenis bukti. Menambah jenis baru berarti menambah satu entri di tabel ini,
 * alur validateEvidence tidak berubah. Ukuran berkas sengaja tidak diperiksa di sini: batas
 * teknisnya diatur tim di server dan dijawab 413.
 */
type EvidenceIssue = keyof typeof EVIDENCE_TEXT.id;

const KIND_RULES: { [K in EvidenceKind]: (input: Extract<EvidenceInput, { kind: K }>) => EvidenceIssue | null } = {
  file: ({ file }) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !GENERIC_FILE_TYPES.includes(file.type)) return "type";
    if (file.size === 0) return "empty";
    return null;
  },
  link: ({ url }) => {
    const trimmed = url.trim();
    if (trimmed === "") return "linkRequired";
    return safeEvidenceHref(trimmed) === null ? "linkProtocol" : null;
  },
};

/** Null count berarti peran ini tidak boleh melihat bukti, jadi tidak ada yang bisa ditambah. */
export function canAddEvidence(count: number | null): boolean {
  return count !== null && count < MAX_EVIDENCE_PER_ANSWER;
}

/** Pesan galat untuk bukti yang akan ditambah, atau null bila boleh dikirim ke server. */
export function validateEvidence(input: EvidenceInput, currentCount: number, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!canAddEvidence(currentCount)) return evidenceMessage("limit", locale);
  const rule = KIND_RULES[input.kind] as (value: EvidenceInput) => EvidenceIssue | null;
  const issue = rule(input);
  return issue === null ? null : evidenceMessage(issue, locale);
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
