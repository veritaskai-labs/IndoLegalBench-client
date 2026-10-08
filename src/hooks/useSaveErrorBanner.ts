"use client";

import { useCallback, useState } from "react";
import { mapSaveError, type FieldSaveError } from "@/lib/cases/saveError";

/**
 * Pembagian error simpan yang sama untuk halaman buat dan edit kasus:
 * error milik field dikembalikan ke form, sisanya menjadi banner.
 */
export function useSaveErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  const clear = useCallback(() => setMessage(null), []);

  const handle = useCallback((error: unknown): FieldSaveError | null => {
    const mapped = mapSaveError(error);
    if (mapped.kind === "field") return mapped;
    setMessage(mapped.message);
    return null;
  }, []);

  return { message, clear, handle };
}
