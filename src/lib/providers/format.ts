import type { MeasurementType, ProviderType } from "@/types/provider";

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  openai_compatible: "OpenAI-compatible",
  gemini_interactions: "Gemini Interactions",
  anthropic_messages: "Anthropic Messages",
};

export const MEASUREMENT_TYPE_LABEL: Record<MeasurementType, string> = {
  automatic: "Otomatis",
  manual: "Manual",
};

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Server mengirim Decimal sebagai string ("1500000.00"). */
export function formatRupiah(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? RUPIAH.format(amount) : String(value);
}

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * Sisa anggaran, dibulatkan ke bawah ke rupiah (keputusan PO, 3 Nov): angka yang tampil
 * tidak pernah lebih besar dari sisa sebenarnya. Dihitung dari teks dengan BigInt, bukan
 * Number, supaya nilai Numeric(18,2) di atas 2^53 tidak meleset. Server tetap menyimpan sen.
 */
export function formatRupiahDown(value: string): string {
  const match = DECIMAL.exec(value);
  if (!match) return value;
  const [, sign, whole, fraction = ""] = match;
  const rupiah = BigInt(whole);
  if (sign !== "-") return RUPIAH.format(rupiah);
  // Negatif: ke bawah berarti menjauh dari nol bila ada sen (-0,50 menjadi -1).
  const hasCents = /[1-9]/.test(fraction);
  return RUPIAH.format(-rupiah - BigInt(hasCents ? 1 : 0));
}

/** Ambil angka dari isian "1.500.000" atau "Rp 1.500.000". Kosong berarti null. */
export function parseRupiahInput(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

/** Tampilkan isian budget dengan titik ribuan saat diketik. */
export function formatRupiahInput(text: string): string {
  const amount = parseRupiahInput(text);
  return amount === null ? "" : new Intl.NumberFormat("id-ID").format(amount);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
