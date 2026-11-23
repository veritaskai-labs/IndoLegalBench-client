/**
 * Panggilan API impor CSV (PBI-4 SCRUM-340, server SCRUM-338). Halaman dan form memakai interface ini,
 * bukan apiFetch langsung, supaya bentuk panggilan (misalnya bila impor kelak menjadi pekerjaan latar)
 * hanya berubah di satu tempat.
 */
export interface ImportGateway {
  /** Template CSV dari server (header saja, UTF-8 dengan BOM). */
  downloadTemplate(): Promise<Blob>;
}

/** Nama berkas template. */
export const TEMPLATE_FILE_NAME = "";

export const importGateway: ImportGateway = {
  downloadTemplate: () => Promise.reject(new Error("not implemented")),
};
