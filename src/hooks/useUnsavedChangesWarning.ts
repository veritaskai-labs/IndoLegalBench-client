"use client";

import { useEffect } from "react";

/**
 * Minta browser mengonfirmasi sebelum reload, tutup tab, atau pindah situs
 * selama ada perubahan yang belum disimpan. Navigasi lewat <Link> di dalam
 * aplikasi tidak tertangkap; App Router tidak menyediakan cara resmi untuk itu.
 */
export function useUnsavedChangesWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
