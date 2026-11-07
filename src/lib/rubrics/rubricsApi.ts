import { apiFetch } from "@/lib/apiClient";
import type { CreateRubricVersionRequest, RubricVersion, RubricVersionSummary } from "@/types/rubric";

/**
 * Pintu ke server untuk versi rubrik (PBI-14 AC7). Hook bergantung pada interface ini, bukan pada
 * fetch, jadi test hook memakai gateway palsu dan implementasi HTTP-nya bisa diganti tanpa
 * menyentuh hook atau komponen. Nilai ulang lewat GradingGateway, karena itu endpoint penilaian.
 */
export interface RubricsGateway {
  listVersions(): Promise<RubricVersionSummary[]>;
  createVersion(request: CreateRubricVersionRequest): Promise<RubricVersion>;
}

/**
 * Pembuatan memakai silentForbidden: 403 berarti peran berubah saat form terbuka, dan yang
 * menjelaskan adalah form-nya, bukan pengalihan ke /forbidden. Daftar rubrik tidak: halamannya
 * khusus Admin, jadi 403 di sana memang urusan /forbidden.
 */
export const httpRubricsGateway: RubricsGateway = {
  /** GET /admin/rubrics (Admin): semua versi, terbaru di atas. Daftar kosong sebelum v1 diketik. */
  listVersions: () => apiFetch<RubricVersionSummary[]>("/admin/rubrics"),

  /** POST /admin/rubrics (Admin): versi baru, langsung aktif. Versi lama tidak pernah diubah. 422 membawa field yang ditolak. */
  createVersion: (request) =>
    apiFetch<RubricVersion>("/admin/rubrics", { method: "POST", body: JSON.stringify(request), silentForbidden: true }),
};
