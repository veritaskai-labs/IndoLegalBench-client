import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import type { ImportSummary } from "@/types/caseImport";

/**
 * Panggilan API impor CSV (PBI-4 SCRUM-340, server SCRUM-338). Halaman dan form memakai interface ini,
 * bukan apiFetch langsung, supaya bentuk panggilan (misalnya bila impor kelak menjadi pekerjaan latar)
 * hanya berubah di satu tempat.
 */
export interface ImportGateway {
  /** Template CSV dari server (header saja, UTF-8 dengan BOM). */
  downloadTemplate(): Promise<Blob>;
  /** Unggah satu berkas CSV (multipart, field "file"). 201 berisi ringkasan; 422 berarti seluruh berkas ditolak. */
  uploadCsv(file: File): Promise<ImportSummary>;
  /** Buka lagi ringkasan satu impor. */
  readSummary(batchId: string): Promise<ImportSummary>;
}

/**
 * Nama berkas template, sama dengan TEMPLATE_FILE_NAME di import_router.py server. API berbeda origin dan
 * Content-Disposition tidak termasuk expose_headers CORS server, jadi browser tidak memberi nama itu ke JS.
 */
export const TEMPLATE_FILE_NAME = "template-impor-kasus.csv";

/** Satu field "file", sesuai requestBody multipart di kontrak. */
function csvForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export const importGateway: ImportGateway = {
  downloadTemplate: () => apiFetchBlob("/case-imports/template"),
  uploadCsv: (file) => apiFetch<ImportSummary>("/case-imports", { method: "POST", body: csvForm(file) }),
  readSummary: (batchId) => apiFetch<ImportSummary>(`/case-imports/${encodeURIComponent(batchId)}`),
};
