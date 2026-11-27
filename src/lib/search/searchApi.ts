import type { SearchResponse } from "./searchResults";

/**
 * GET /search (SCRUM-351). Server menyaring hasil per peran dan berhenti di 20 per kelompok.
 * signal membatalkan request lama saat pengguna mengetik lagi.
 */
export async function searchAll(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  void signal;
  throw new Error(`not implemented: ${q.length}`);
}
