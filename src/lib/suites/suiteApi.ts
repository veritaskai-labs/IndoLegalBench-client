import { apiFetch } from "@/lib/apiClient";
import type { Suite, SuitePage } from "@/types/suite";

const PAGE_SIZE = 100;

/**
 * GET /suites?status=active. Dipakai pemantauan review untuk menelusuri kasus in_review
 * di seluruh suite. BE membatasi size 100, jadi halaman berikutnya diambil sampai total
 * tercapai — pola yang sama dengan useSuites, tapi di lib supaya bisa dipakai di luar hook itu.
 */
export async function listActiveSuites(): Promise<Suite[]> {
  const collected: Suite[] = [];
  let page = 1;

  for (;;) {
    const result = await apiFetch<SuitePage>(
      `/suites?status=active&page=${page}&size=${PAGE_SIZE}`,
    );
    collected.push(...result.items);

    if (collected.length >= result.total || result.items.length === 0) {
      return collected;
    }
    page += 1;
  }
}