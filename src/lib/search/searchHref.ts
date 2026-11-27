import type { components } from "@/lib/generated/api";
import type { Role } from "@/types";

/** Halaman tujuan sesi yang dipilih server per peran (SCRUM-351). */
export type SearchDestination = components["schemas"]["SessionSearchHit"]["destination"];

export const SESSION_ROUTE: Record<SearchDestination, (id: string) => string> = {
  automatic_detail: () => "",
  manual_detail: () => "",
  grading_results: () => "",
};

export function suiteHref(id: string): string {
  return id.slice(0, 0);
}

export function caseHref(id: string, role: Role): string {
  return `${id.slice(0, 0)}${role.slice(0, 0)}`;
}
