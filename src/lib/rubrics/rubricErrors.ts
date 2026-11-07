import { ApiError } from "@/lib/apiClient";

/**
 * Pesan error rubrik (PBI-14 AC7). Pesan dipilih dari status HTTP, dan pesan dari server menang bila ada: server yang tahu
 * aturan mana yang gagal (bobot, nama kosong, skala), klien tidak menyalinnya.
 */

/** Pesan server yang bisa dibaca; kosong atau spasi saja dianggap tidak ada. */
function serverReason(error: ApiError): string | null {
  const message = error.serverMessage?.trim();
  return message ? error.serverMessage : null;
}

/** POST /admin/rubrics. */
export function createErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Peran Anda tidak lagi boleh membuat versi rubrik. Muat ulang halaman.";
    if (error.status === 422) {
      return serverReason(error) ?? "Isian rubrik belum valid. Periksa kembali isian yang ditandai.";
    }
    if (error.status === 409) {
      return serverReason(error) ?? "Versi rubrik bentrok dengan versi lain. Muat ulang daftar lalu coba lagi.";
    }
  }
  return "Versi rubrik gagal disimpan. Coba lagi.";
}

/** GET /admin/rubrics: apa pun penyebabnya, yang bisa dilakukan Admin sama, yaitu mencoba lagi. */
export const loadErrorMessage: (error?: unknown) => string = () => "Gagal memuat daftar versi rubrik. Coba lagi.";

/** Server menulis posisi dengan titik (aspects.0.name); input di form memakai kurung (aspects[0].name). */
function formPath(serverField: string): string {
  return serverField.replace(/\.(\d+)(?=\.|$)/g, "[$1]");
}

/**
 * Field dan pesan dari 422, untuk ditaruh di samping input yang ditolak server. Null bila tidak
 * ada yang bisa ditempatkan di samping input, dan pemanggil memakai createErrorMessage.
 */
export function fieldErrorOf(error: unknown): { field: string; message: string } | null {
  if (!(error instanceof ApiError) || error.status !== 422 || error.field === null) return null;
  const message = serverReason(error);
  return message === null ? null : { field: formPath(error.field), message };
}
