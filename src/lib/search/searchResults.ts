import type { components } from "@/lib/generated/api";
import { MEASUREMENT_TYPE_LABEL } from "@/lib/providers/format";
import type { Role } from "@/types";
import { SESSION_ROUTE, caseHref, suiteHref } from "./searchHref";

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
  const groups: SearchGroup[] = [
    group(
      "suites",
      "Suite",
      response.suites.map((hit) => ({ ...base(hit), href: suiteHref(hit.id), meta: null })),
    ),
    group(
      "cases",
      "Kasus",
      response.cases.map((hit) => ({
        ...base(hit),
        href: caseHref(hit.id, role),
        // Kasus tanpa judul diberi label kode kasus oleh server; jangan tampilkan dua kali.
        meta: hit.case_code === hit.label ? null : hit.case_code,
      })),
    ),
    group(
      "sessions",
      "Sesi pengukuran",
      response.sessions.map((hit) => ({
        ...base(hit),
        href: SESSION_ROUTE[hit.destination](hit.id),
        meta: MEASUREMENT_TYPE_LABEL[hit.session_type],
      })),
    ),
  ];
  return groups.filter((g) => g.rows.length > 0);
}

function base(hit: components["schemas"]["SearchHit"]): Pick<SearchRow, "id" | "label" | "archived"> {
  return { id: hit.id, label: hit.label, archived: hit.archived };
}

function group(key: SearchGroupKey, heading: string, rows: SearchRow[]): SearchGroup {
  return { key, heading, rows, capped: rows.length === SEARCH_GROUP_CAP };
}

export function resultCount(groups: readonly SearchGroup[]): number {
  return groups.reduce((sum, g) => sum + g.rows.length, 0);
}

/**
 * Viewer tidak boleh melihat isi kasus test (PBI-16), dan server selalu menjawab kosong untuk Viewer.
 * Kotak yang tidak pernah memberi hasil hanya membingungkan, jadi kotaknya tidak ditampilkan (PO, 27 Nov).
 */
export function canSearch(role: Role): boolean {
  return role !== "viewer";
}
