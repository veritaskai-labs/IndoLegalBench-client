import type { Role } from "@/types";
import type { MeasurementType, ProductPurpose } from "@/types/provider";

/** Satu tujuan pilihan hanya menampilkan satu jenis produk (AC7). */
export const PURPOSE_TYPE: Record<ProductPurpose, MeasurementType> = {
  automatic_run: "automatic",
  manual_entry: "manual",
};

/** Sama dengan server (D10); peran lain dijawab 403. */
const PURPOSE_ROLES: Record<ProductPurpose, readonly Role[]> = {
  automatic_run: ["admin", "developer_ai"],
  manual_entry: ["admin", "contributor"],
};

/** Mencegah permintaan yang pasti 403, karena 403 memindahkan ke /forbidden. */
export function canUsePurpose(role: Role | null, purpose: ProductPurpose): boolean {
  return role !== null && PURPOSE_ROLES[purpose].includes(role);
}
