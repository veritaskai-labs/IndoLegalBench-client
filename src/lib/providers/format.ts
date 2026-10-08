import type { ProviderType } from "@/types/provider";

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  openai_compatible: "OpenAI-compatible",
  gemini_interactions: "Gemini Interactions",
  anthropic_messages: "Anthropic Messages",
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

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
