"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";

/**
 * Nama suite untuk breadcrumb. null selama dimuat atau kalau gagal,
 * karena breadcrumb tetap harus tampil meski namanya belum ada.
 */
export function useSuiteName(suiteId: string | null): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!suiteId) return;

    let cancelled = false;

    apiFetch<Suite>(`/suites/${suiteId}`)
      .then((suite) => {
        if (cancelled) return;
        setName(suite.name);
      })
      .catch(() => {
        // Breadcrumb cukup menampilkan "…"; halaman punya error state sendiri.
      });

    return () => {
      cancelled = true;
    };
  }, [suiteId]);

  return name;
}