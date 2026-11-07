import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/** Berapa lama pesan "Tersalin" atau "Gagal" tampil sebelum tombol kembali seperti semula. */
const RESET_AFTER_MS = 2000;

/**
 * Menyalin teks ke clipboard dan melaporkan hasilnya. Clipboard tidak tersedia di konteks tidak
 * aman (http) atau bisa ditolak browser; keduanya jadi status "failed", bukan exception.
 */
export function useCopyToClipboard(): { status: CopyStatus; copy: (text: string) => Promise<void> } {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copy = useCallback(async (text: string) => {
    let next: CopyStatus = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = "failed";
    }
    setStatus(next);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), RESET_AFTER_MS);
  }, []);

  return { status, copy };
}
