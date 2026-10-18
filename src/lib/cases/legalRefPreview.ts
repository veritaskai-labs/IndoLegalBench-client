// Pratinjau rujukan hukum saat mengetik (PBI-21 AC6, AC8, AC10; SCRUM-162).
//
// Logika murni: tidak ada React dan tidak ada pemanggilan API. Teks dan error
// datang dari server (POST /legal-refs/preview); modul ini hanya memilih di
// mana hasil itu tampil. Jawaban server bisa tiba setelah Author mengetik lagi,
// jadi hasil hanya ditampilkan di bawah rujukan yang isinya masih sama dengan
// yang dikirim.

import { toLegalRefPayload, type LegalRefPayload } from "./caseFormMapping";
import type { LegalRefFormValues, LegalRefLinkFormValues } from "./legalRefForm";
import type { LegalRefPreviewItem } from "./legalRefPreviewApi";
import { fieldErrorText, mapServerFieldError, type SaveError } from "./saveError";

/** Yang tampil untuk satu rujukan: teks dari server, atau error pertamanya. */
export type CitationPreview = { text: string | null; error: SaveError | null };

/** Pratinjau semua rujukan di form, dan apakah request terakhir gagal dimuat. */
export type PreviewState = { previews: (CitationPreview | null)[]; failed: boolean };

/** Jawaban server beserta isi tiap rujukan saat request itu dikirim. */
export type PreviewResult = { sent: readonly string[]; items: readonly LegalRefPreviewItem[] };

/** Payload pratinjau (sama dengan payload simpan) dan kunci isi tiap rujukan. */
export function buildPreviewRequest(refs: readonly LegalRefFormValues[]): {
  payload: LegalRefPayload[];
  sent: string[];
} {
  const payload = refs.map(toLegalRefPayload);
  return { payload, sent: payload.map((item) => JSON.stringify(item)) };
}

/**
 * Pratinjau untuk tiap rujukan di form sekarang. Null bila belum ada jawaban, bila rujukan itu
 * berubah, bertambah, atau bergeser sejak request dikirim, atau bila rujukan itu belum diisi sama
 * sekali (baris baru tidak langsung penuh error, sama seperti validasi saat mengetik).
 */
export function alignPreviews(
  refs: readonly LegalRefFormValues[],
  result: PreviewResult | null,
): (CitationPreview | null)[] {
  const { sent } = buildPreviewRequest(refs);
  return refs.map((ref, index) => {
    const item = result?.items[index];
    if (item === undefined || result?.sent[index] !== sent[index] || !hasInput(ref)) return null;
    return toCitationPreview(ref, item);
  });
}

/** Isian link yang diketik Author. Bentuk dan penghubung punya nilai bawaan, jadi tidak dihitung. */
const LINK_INPUTS = [
  "regulation_type",
  "number",
  "year",
  "about",
  "pasal",
  "angka",
  "ayat",
  "huruf",
] as const;

function linkHasInput(link: LegalRefLinkFormValues): boolean {
  return LINK_INPUTS.some((name) => link[name].trim() !== "");
}

function hasInput(ref: LegalRefFormValues): boolean {
  if (ref.kind === "free_text") return ref.free_text.trim() !== "";
  return ref.links.some(linkHasInput);
}

const LINK_IN_FIELD = /^legal_refs\[\d+\]\.links\[(\d+)\]/;

/** Error di dalam peraturan rangkaian yang belum diisi: belum ditampilkan, sama seperti baris baru. */
function inEmptyLink(ref: LegalRefFormValues, field: string | null | undefined): boolean {
  const match = LINK_IN_FIELD.exec(field ?? "");
  const link = match === null ? undefined : ref.links[Number(match[1])];
  return link !== undefined && !linkHasInput(link);
}

function toCitationPreview(ref: LegalRefFormValues, item: LegalRefPreviewItem): CitationPreview {
  return {
    // Teks Bebas tidak diberi pratinjau: isinya sama persis dengan yang diketik (keputusan PO 9).
    text: ref.kind === "free_text" ? null : item.display_text,
    error:
      item.error === null || inEmptyLink(ref, item.error.field)
        ? null
        : mapServerFieldError(item.error.code, item.error.message, item.error.field),
  };
}

/** Error pratinjau yang punya field di form, per path, dengan teks seperti error simpan. */
export function previewFieldErrors(
  previews: readonly (CitationPreview | null)[],
): Map<string, string> {
  const errors = new Map<string, string>();
  for (const preview of previews) {
    if (preview?.error?.kind === "field") errors.set(preview.error.path, fieldErrorText(preview.error));
  }
  return errors;
}
