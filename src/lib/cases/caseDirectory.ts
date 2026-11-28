import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";
import type { CaseStatus } from "@/types/case";

export type CaseDirectoryRow = components["schemas"]["CaseListItem"];

type CaseSortKey = components["schemas"]["CaseSortKey"];

/**
 * Kolom tabel yang boleh diurutkan, dipetakan ke nilai `sort` di API. Kolom Aksi tidak ada di sini. Nama kolom
 * Suite di tabel (suite_name) berbeda dari nama di API (suite); tes membandingkan nilainya dengan CaseSortKey
 * di contract/openapi.json.
 */
export const SORT_KEY_OF = {
  case_code: "case_code",
  title: "title",
  suite_name: "suite",
  split_tag: "split_tag",
  status: "status",
  updated_at: "updated_at",
} as const satisfies Record<string, CaseSortKey>;

export type CaseSortColumn = keyof typeof SORT_KEY_OF;

export type CaseDirectorySort = { key: CaseSortColumn; direction: "asc" | "desc" };

/** Daftar dibuka dengan perubahan terbaru di atas, sama dengan bawaan server. */
export const DEFAULT_CASE_SORT: CaseDirectorySort = { key: "updated_at", direction: "desc" };

export type CaseDirectoryQuery = {
  q: string;
  status: CaseStatus | "";
  suiteId: string;
  page: number;
  /** Tanpa urutan, server memakai urutan bawaannya. */
  sort?: CaseDirectorySort;
};

export function listDirectoryCases({ q, status, suiteId, page, sort }: CaseDirectoryQuery) {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  const keyword = q.trim();
  if (keyword) query.set("q", keyword);
  if (status) query.set("status", status);
  if (suiteId) query.set("suite_id", suiteId);
  if (sort) {
    query.set("sort", SORT_KEY_OF[sort.key]);
    query.set("order", sort.direction);
  }
  return apiFetch<components["schemas"]["CasePage"]>(`/cases?${query}`);
}
