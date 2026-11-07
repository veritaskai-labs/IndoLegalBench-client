import type { components } from "@/lib/generated/api";

/**
 * Tipe rubrik berversi (PBI-14, SCRUM-228), alias dari kontrak server (contract/openapi.json)
 * seperti types/measurement.ts, jadi perubahan model di server membuat tsc gagal di sini.
 */

/** Jalur penilaian satu aspek (D6): aturan deterministik atau penilai LLM. */
export type GraderPath = components["schemas"]["GraderPath"];

/** Satu baris GET /admin/rubrics: tanpa prompt penilai, aspek, dan level. */
export type RubricVersionSummary = components["schemas"]["RubricVersionSummary"];

/** GET /admin/rubrics/{id} dan hasil POST /admin/rubrics: isi lengkap satu versi. */
export type RubricVersion = components["schemas"]["RubricVersionRead"];

/** POST /admin/rubrics: versi baru. Versi yang sudah ada tidak pernah diubah (immutable). */
export type CreateRubricVersionRequest = components["schemas"]["RubricVersionCreate"];

/** Aspek dan level seperti dikirim saat membuat versi; deskriptor ikut level, dirujuk lewat nama aspek. */
export type RubricAspectInput = components["schemas"]["RubricAspectIn"];
export type RubricLevelInput = components["schemas"]["RubricLevelIn"];
export type RubricDescriptorInput = components["schemas"]["RubricDescriptorIn"];
