"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { searchAll } from "@/lib/search/searchApi";
import { SEARCH_DEBOUNCE_MS, normaliseQuery, type QueryCheck } from "@/lib/search/searchQuery";
import { toGroups, type SearchGroup } from "@/lib/search/searchResults";
import type { Role } from "@/types";

export type GlobalSearchState =
  | { status: "idle" }
  | { status: "tooShort" }
  | { status: "tooLong" }
  | { status: "loading"; q: string }
  | { status: "done"; q: string; groups: SearchGroup[] }
  | { status: "invalid"; q: string }
  | { status: "failed"; q: string };

export type GlobalSearch = {
  query: string;
  setQuery: (value: string) => void;
  /** Enter atau "Coba lagi": kirim sekarang tanpa menunggu jeda. */
  searchNow: () => void;
  state: GlobalSearchState;
};

/** Jawaban terakhir beserta permintaan yang menghasilkannya, supaya jawaban lama tidak pernah tampil. */
type Outcome = { q: string; attempt: number; role: Role } & (
  | { kind: "done"; groups: SearchGroup[] }
  | { kind: "invalid" | "failed" | "signedOut" }
);

function failureKind(error: unknown): "invalid" | "failed" | "signedOut" {
  if (error instanceof ApiError && error.status === 401) return "signedOut";
  if (error instanceof ApiError && error.status === 422) return "invalid";
  return "failed";
}

/**
 * Pencarian global dari header (SCRUM-352). Satu request setelah jeda 300 ms; kata kunci baru
 * membatalkan request yang masih berjalan (AbortController), jadi koneksi dan kerja server untuk
 * kata kunci lama dilepas, bukan hanya hasilnya disembunyikan. Pola sama dengan useLegalRefPreview.
 */
export function useGlobalSearch(role: Role): GlobalSearch {
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const sendNow = useRef(false);
  const check = normaliseQuery(query);
  const q = check.kind === "ok" ? check.q : null;

  useEffect(() => {
    const now = sendNow.current;
    sendNow.current = false;
    if (q === null) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        searchAll(q, controller.signal).then(
          (response) => {
            if (!controller.signal.aborted) {
              setOutcome({ q, attempt, role, kind: "done", groups: toGroups(response, role) });
            }
          },
          (error: unknown) => {
            // Batal karena ketikan baru atau header dilepas bukan kegagalan.
            if (!controller.signal.aborted) setOutcome({ q, attempt, role, kind: failureKind(error) });
          },
        );
      },
      now ? 0 : SEARCH_DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, attempt, role]);

  const searchNow = useCallback(() => {
    sendNow.current = true;
    setAttempt((n) => n + 1);
  }, []);

  return { query, setQuery, searchNow, state: deriveState(check, attempt, role, outcome) };
}

function deriveState(check: QueryCheck, attempt: number, role: Role, outcome: Outcome | null): GlobalSearchState {
  if (check.kind === "empty") return { status: "idle" };
  if (check.kind !== "ok") return { status: check.kind };
  const { q } = check;
  if (outcome === null || outcome.q !== q || outcome.attempt !== attempt || outcome.role !== role) {
    return { status: "loading", q };
  }
  if (outcome.kind === "done") return { status: "done", q, groups: outcome.groups };
  // 401: AuthGuard yang membersihkan layar dan mengarahkan ke login; panel tidak menampilkan apa pun.
  if (outcome.kind === "signedOut") return { status: "idle" };
  return { status: outcome.kind, q };
}
