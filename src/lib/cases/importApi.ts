import { apiFetchBlob } from "@/lib/apiClient";

/**
 * Panggilan API impor CSV (PBI-4 SCRUM-340, server SCRUM-338). Halaman dan form memakai interface ini,
 * bukan apiFetch langsung, supaya bentuk panggilan (misalnya bila impor kelak menjadi pekerjaan latar)
 * hanya berubah di satu tempat.
 */
export interface ImportGateway {
  /** Template CSV dari server (header saja, UTF-8 dengan BOM). */
  downloadTemplate(): Promise<Blob>;
}

/**
 * Nama berkas template, sama dengan TEMPLATE_FILE_NAME di import_router.py server. API berbeda origin dan
 * Content-Disposition tidak termasuk expose_headers CORS server, jadi browser tidak memberi nama itu ke JS.
 */
export const TEMPLATE_FILE_NAME = "template-impor-kasus.csv";

export const importGateway: ImportGateway = {
  downloadTemplate: () => apiFetchBlob("/case-imports/template"),
};
