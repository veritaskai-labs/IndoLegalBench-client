import { messages } from "./locale";

/**
 * Words shared by the case, review, product and measurement screens
 * (buttons, empty and error states, the pager). Other modules use the same
 * controls, so these words follow the language too. Their own sentences stay
 * for SCRUM-358.
 */
export const CHROME = messages({
  id: {
    optional: "Opsional",
    cancel: "Batal",
    close: "Tutup",
    previous: "Sebelumnya",
    next: "Berikutnya",
    page: "Halaman {page} dari {last}",
    emptyTitle: "Tidak ada data ditemukan",
    emptyDescription: "Belum ada item yang terdaftar atau sesuai kriteria pencarian.",
    errorMessage: "Terjadi kesalahan saat memuat data.",
    errorTitle: "Gagal Memuat Data",
    retry: "Coba lagi",
    loading: "Memuat…",
  },
  en: {
    optional: "Optional",
    cancel: "Cancel",
    close: "Close",
    previous: "Previous",
    next: "Next",
    page: "Page {page} of {last}",
    emptyTitle: "No data found",
    emptyDescription: "Nothing is listed yet, or nothing matches the search.",
    errorMessage: "Something went wrong while loading the data.",
    errorTitle: "Could not load data",
    retry: "Try again",
    loading: "Loading…",
  },
});
