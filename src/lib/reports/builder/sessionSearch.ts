import type { EligibleSession } from "@/types/reports";

import { matchesFilter } from "./builderSelection";
import type { MeasurementFilter } from "./builderTypes";

/** Tab field sesi (SCRUM-365): "Valid" = eligible dari server, "Tidak valid" = sisanya beserta alasannya. */
export type SessionTab = "valid" | "invalid";

export type SessionSearch = {
  measurement: MeasurementFilter;
  query: string;
  tab: SessionTab;
  /** Produk yang dipilih di dropdown; kosong berarti semua produk. */
  productIds: readonly string[];
};

export type SessionSearchResult = {
  shown: EligibleSession[];
  /** Jumlah per tab setelah pencarian dan filter, untuk label tab. */
  counts: Record<SessionTab, number>;
};

export type ProductOption = { id: string; name: string };

/**
 * Aturan pencarian sama dengan server SCRUM-361 (#159 EligibleSessionQuery): nama sesi, id sesi, atau nama
 * produk, tanpa membedakan huruf besar/kecil, dan teks kosong berarti tidak mencari. includes() memperlakukan
 * % dan _ sebagai teks biasa, sama seperti server.
 */
function matchesQuery(session: EligibleSession, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return [session.label, session.session_id, session.product_name].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

function matchesProducts(session: EligibleSession, productIds: readonly string[]): boolean {
  return productIds.length === 0 || productIds.includes(session.product_id);
}

const tabOf = (session: EligibleSession): SessionTab => (session.eligible ? "valid" : "invalid");

/**
 * Sesi yang tampil di field sesi (SCRUM-365, PBI-15 AC1, AC4, AC5). Daftar dimuat sekali lalu disaring di sini,
 * bukan lewat parameter q/validity/product server, karena filter produk boleh lebih dari satu sedangkan server
 * hanya menerima satu product, dan supaya sesi terpilih tidak pernah hilang dari state saat tab atau filter
 * berganti. Filter jenis pengukuran (AC5) tetap ada dan digabung dengan AND.
 */
export function searchSessions(sessions: readonly EligibleSession[], search: SessionSearch): SessionSearchResult {
  const found = sessions.filter(
    (session) =>
      matchesFilter(session, search.measurement) &&
      matchesQuery(session, search.query) &&
      matchesProducts(session, search.productIds),
  );
  const counts: Record<SessionTab, number> = { valid: 0, invalid: 0 };
  for (const session of found) counts[tabOf(session)] += 1;
  return { shown: found.filter((session) => tabOf(session) === search.tab), counts };
}

/** Pilihan dropdown produk: setiap produk sekali, urut nama, dari semua sesi (valid atau tidak). */
export function productOptions(sessions: readonly EligibleSession[]): ProductOption[] {
  const byId = new Map<string, string>();
  for (const session of sessions) byId.set(session.product_id, session.product_name);
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Teks tombol filter produk (SCRUM-365, dipakai ulang SCRUM-368): "Produk: semua" bila tidak ada yang dipilih
 * (filter tidak aktif), selain itu jumlah produk yang dipilih.
 */
export function productFilterLabel(chosen: number): string {
  return chosen === 0 ? "Produk: semua" : `Produk: ${chosen} dipilih`;
}
