"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AsyncResource } from "@/hooks/useAsyncResource";
import { listSessions } from "@/lib/runs/runsApi";
import { shouldPollSessions } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

/** AC6: kolom progres daftar diperbarui kira-kira tiap 5 detik, sama dengan panel progres. */
export const SESSIONS_POLL_MS = 5000;

const MESSAGE = "Gagal memuat sesi pengukuran. Coba lagi.";

/**
 * Daftar sesi di halaman Eksekusi (PBI-11 AC10): daftar utama, atau daftar arsip bila archived true.
 * Kunci berbeda per daftar, jadi balasan satu daftar tidak pernah tampil di daftar lainnya.
 * 403 sudah dialihkan ke /forbidden oleh apiFetch.
 *
 * Daftar utama ditanya ulang tiap 5 detik selama ada sesi yang antre atau berjalan (SCRUM-266).
 * Baris terakhir tetap tampil selama panggilan berikutnya berjalan atau gagal, jadi tabel tidak
 * berkedip ke skeleton. Daftar arsip tidak di-poll: semua sesinya sudah berakhir.
 */
export function useSessions(archived = false): AsyncResource<SessionListItem[]> & { reload: () => void } {
  const key = archived ? "measurement-sessions-archived" : "measurement-sessions";
  const [settled, setSettled] = useState<{ key: string; state: AsyncResource<SessionListItem[]> } | null>(null);
  const current = useRef(key);
  const withRows = useRef<string | null>(null);

  const read = useCallback(() => {
    listSessions(archived)
      .then((data) => {
        if (current.current !== key) return;
        withRows.current = key;
        setSettled({ key, state: { status: "ready", data } });
      })
      .catch(() => {
        if (current.current !== key || withRows.current === key) return;
        setSettled({ key, state: { status: "error", message: MESSAGE } });
      });
  }, [archived, key]);

  useEffect(() => {
    current.current = key;
    read();
    return () => {
      current.current = "";
    };
  }, [key, read]);

  const state: AsyncResource<SessionListItem[]> = settled?.key === key ? settled.state : { status: "loading" };
  const poll = !archived && state.status === "ready" && shouldPollSessions(state.data);

  useEffect(() => {
    if (!poll) return;
    const timer = setInterval(read, SESSIONS_POLL_MS);
    return () => clearInterval(timer);
  }, [poll, read]);

  return { ...state, reload: read };
}
