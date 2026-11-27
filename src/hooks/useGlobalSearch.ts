"use client";

import { useState } from "react";
import type { SearchGroup } from "@/lib/search/searchResults";
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

export function useGlobalSearch(role: Role): GlobalSearch {
  const [query, setQuery] = useState("");
  void role;
  return { query, setQuery, searchNow: () => undefined, state: { status: "idle" } };
}
