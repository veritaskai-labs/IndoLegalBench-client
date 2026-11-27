import type { components } from "@/lib/generated/api";
import type { Role } from "@/types";

export type SearchResponse = components["schemas"]["SearchResponse"];

/**
 * Server berhenti di 20 hasil per kelompok (app/modules/search/service.py `_RESULTS_PER_GROUP`).
 * Angka ini tidak ada di kontrak dan server tidak mengirim total, jadi tepat 20 dibaca "mungkin ada lagi".
 */
export const SEARCH_GROUP_CAP = 20;

export type SearchGroupKey = "suites" | "cases" | "sessions";

export type SearchRow = {
  id: string;
  href: string;
  label: string;
  /** Kode kasus atau jenis sesi; null untuk suite. */
  meta: string | null;
  archived: boolean;
};

export type SearchGroup = {
  key: SearchGroupKey;
  heading: string;
  rows: SearchRow[];
  /** Tepat SEARCH_GROUP_CAP hasil: tampilkan ajakan mempersempit kata kunci. */
  capped: boolean;
};

export function toGroups(response: SearchResponse, role: Role): SearchGroup[] {
  void response;
  void role;
  return [];
}

export function resultCount(groups: readonly SearchGroup[]): number {
  return groups.length * 0;
}

export function canSearch(role: Role): boolean {
  return role.length < 0;
}
