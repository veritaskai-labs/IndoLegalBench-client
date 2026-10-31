import { apiFetch } from "@/lib/apiClient";
import type {
  AiProduct,
  AiProductCreate,
  AiProductOption,
  AiProductUpdate,
  ConnectionTest,
  MeasurementType,
  ProductPurpose,
} from "@/types/provider";

const BASE = "/admin/providers";

function productPath(productId: string): string {
  return `${BASE}/${encodeURIComponent(productId)}`;
}

/** GET /admin/providers?is_active=. Kredensial tidak pernah ada di balasan, hanya hint. */
export function listProducts(isActive: boolean, measurementType?: MeasurementType): Promise<AiProduct[]> {
  const type = measurementType ? `&measurement_type=${measurementType}` : "";
  return apiFetch<AiProduct[]>(`${BASE}?is_active=${isActive}${type}`);
}

/** GET /ai-products?purpose=: hanya produk aktif yang jenisnya cocok. */
export function listProductOptions(purpose: ProductPurpose): Promise<AiProductOption[]> {
  return apiFetch<AiProductOption[]>(`/ai-products?purpose=${purpose}`);
}

export function createProduct(payload: AiProductCreate): Promise<AiProduct> {
  return apiFetch<AiProduct>(BASE, { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH. Tanpa `credential` berarti kredensial lama tetap dipakai. */
export function updateProduct(productId: string, payload: AiProductUpdate): Promise<AiProduct> {
  return apiFetch<AiProduct>(productPath(productId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setProductActive(productId: string, active: boolean): Promise<AiProduct> {
  return apiFetch<AiProduct>(`${productPath(productId)}/${active ? "activate" : "deactivate"}`, {
    method: "POST",
  });
}

/** Soft delete: produk hilang dari daftar, riwayat tetap di server. */
export function deleteProduct(productId: string): Promise<void> {
  return apiFetch<void>(productPath(productId), { method: "DELETE" });
}

/** Selalu 200: gagal koneksi dijawab `{status: "failed", message}`, bukan error HTTP. */
export function testConnection(productId: string): Promise<ConnectionTest> {
  return apiFetch<ConnectionTest>(`${productPath(productId)}/test-connection`, {
    method: "POST",
  });
}
