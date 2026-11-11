"use client";

import { useCallback, useState } from "react";

/**
 * Mencatat kotak jawaban mana yang punya perubahan belum tersimpan. Halaman memakai anyDirty untuk
 * useUnsavedChangesWarning, jadi satu peringatan cukup untuk semua kotak di halaman.
 */
export function useDirtyRegistry() {
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set());

  const report = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return { anyDirty: dirtyIds.size > 0, report };
}
