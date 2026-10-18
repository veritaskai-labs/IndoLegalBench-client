// Bentuk rujukan hukum di form editor kasus (PBI-21, AC4).
//
// Logika murni: tidak ada React dan tidak ada pemanggilan API. Bentuk ada di
// tiap link, bukan di rujukan, karena satu rangkaian bisa berbeda kedalaman:
// "Pasal 156 UU 13/2003 jo. Pasal II Angka 5 UU 6/2023" memakai pasal di
// link pertama dan pasal + angka di link kedua. Teks Bebas adalah jenis
// rujukan (kind), bukan bentuk link, dan hanya ditawarkan di link pertama.
//
// Daftar field per bentuk hanya mengatur apa yang tampil. Server tetap yang
// memutuskan isian mana yang sah.

import type { components } from "@/lib/generated/api";

export type LinkForm = components["schemas"]["LegalRefLinkWrite"]["form"];
export type LinkConnector = components["schemas"]["LegalRefLinkWrite"]["connector"];
export type RefKind = components["schemas"]["LegalRefWrite"]["kind"];
export type RefMode = LinkForm | "free_text";

/** Field di luar jenis, nomor, tahun, dan tentang, yang bergantung pada bentuk link. */
export type LinkExtraField = "pasal" | "angka" | "ayat" | "huruf";

/** Satu link di form. Semua isian berupa string dari input. */
export type LegalRefLinkFormValues = {
  form: LinkForm;
  connector: LinkConnector;
  /** Kode dari daftar jenis peraturan, bukan label. */
  regulation_type: string;
  number: string;
  year: string;
  about: string;
  pasal: string;
  angka: string;
  ayat: string;
  huruf: string;
};

/** Satu rujukan di form: terstruktur (punya link) atau teks bebas. */
export type LegalRefFormValues = {
  kind: RefKind;
  free_text: string;
  links: LegalRefLinkFormValues[];
};

/** Urutan di sini adalah urutan tampil. Bentuk baru cukup menambah satu baris. */
const FORM_FIELDS: Record<LinkForm, readonly LinkExtraField[]> = {
  name_only: [],
  pasal: ["pasal", "ayat", "huruf"],
  pasal_angka: ["pasal", "angka", "ayat", "huruf"],
};

const EXTRA_FIELDS: readonly LinkExtraField[] = ["pasal", "angka", "ayat", "huruf"];

export const LINK_FORM_OPTIONS: readonly { value: LinkForm; label: string }[] = [
  { value: "name_only", label: "Nama Peraturan saja" },
  { value: "pasal", label: "Pasal" },
  { value: "pasal_angka", label: "Pasal + Angka" },
];

/** Pilihan di link pertama: empat bentuk AC4, Teks Bebas terakhir. */
export const REF_MODE_OPTIONS: readonly { value: RefMode; label: string }[] = [
  ...LINK_FORM_OPTIONS,
  { value: "free_text", label: "Teks Bebas" },
];

const DEFAULT_FORM: LinkForm = "pasal";

/** Penghubung yang bisa dipilih untuk peraturan ke-2 dan seterusnya (AC6). */
export type ChainConnector = Exclude<LinkConnector, "none">;

export const CONNECTOR_OPTIONS: readonly { value: ChainConnector; label: string }[] = [
  { value: "jo", label: "jo." },
  { value: "jis", label: "jis." },
];

export function visibleLinkFields(form: LinkForm): readonly LinkExtraField[] {
  return FORM_FIELDS[form];
}

export function emptyLink(
  form: LinkForm = DEFAULT_FORM,
  connector: LinkConnector = "none",
): LegalRefLinkFormValues {
  return {
    form,
    connector,
    regulation_type: "",
    number: "",
    year: "",
    about: "",
    pasal: "",
    angka: "",
    ayat: "",
    huruf: "",
  };
}

export function emptyLegalRef(): LegalRefFormValues {
  return { kind: "structured", free_text: "", links: [emptyLink()] };
}

/** Bentuk yang sedang dipilih di link pertama, atau free_text untuk teks bebas. */
export function refMode(ref: LegalRefFormValues): RefMode {
  if (ref.kind === "free_text") return "free_text";
  return ref.links[0]?.form ?? DEFAULT_FORM;
}

/** Ganti bentuk satu link dan kosongkan field yang tidak dipakai bentuk barunya. */
export function changeLinkForm(
  link: LegalRefLinkFormValues,
  form: LinkForm,
): LegalRefLinkFormValues {
  if (link.form === form) return link;
  const kept = FORM_FIELDS[form];
  const cleared = Object.fromEntries(
    EXTRA_FIELDS.filter((field) => !kept.includes(field)).map((field) => [field, ""]),
  );
  return { ...link, ...cleared, form };
}

/**
 * Ganti pilihan bentuk di link pertama. Dari terstruktur ke teks bebas link
 * dibuang, dari teks bebas ke terstruktur mulai satu link kosong, dan di dalam
 * terstruktur hanya link pertama yang berubah.
 */
export function changeRefMode(ref: LegalRefFormValues, mode: RefMode): LegalRefFormValues {
  if (mode === "free_text") {
    return ref.kind === "free_text" ? ref : { kind: "free_text", free_text: "", links: [] };
  }
  if (ref.kind === "free_text") {
    return { kind: "structured", free_text: "", links: [emptyLink(mode)] };
  }
  const [first, ...rest] = ref.links;
  if (first === undefined) return { ...ref, links: [emptyLink(mode)] };
  return { ...ref, links: [changeLinkForm(first, mode), ...rest] };
}

/** Peraturan baru dalam rangkaian: bentuk Pasal, disambung jo. (keputusan PO 18 Okt, no. 5). */
export function chainedLink(): LegalRefLinkFormValues {
  return emptyLink(DEFAULT_FORM, "jo");
}

/** Peraturan pertama adalah pokok rujukan; hanya peraturan ke-2 dan seterusnya yang bisa dihapus. */
export function canRemoveLink(linkIndex: number): boolean {
  return linkIndex > 0;
}

/** Pindah ke Teks Bebas membuang rangkaian, jadi rangkaian dua peraturan atau lebih ditanyakan dulu. */
export function needsFreeTextConfirm(ref: LegalRefFormValues, mode: RefMode): boolean {
  return mode === "free_text" && ref.kind === "structured" && ref.links.length > 1;
}
