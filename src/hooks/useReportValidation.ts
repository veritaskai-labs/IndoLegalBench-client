"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import type { ReportValidateRequest, ReportValidation } from "@/types/reports";

/** Jeda setelah pilihan terakhir berubah, supaya beberapa klik beruntun hanya mengirim satu permintaan. */
export const VALIDATE_DELAY_MS = 300;

const FAILED = "Pemeriksaan pilihan gagal. Coba lagi.";
const SESSIONS_GONE = "Sebagian sesi sudah tidak tersedia. Muat ulang daftar sesi lalu pilih lagi.";

const errorText = (error: unknown) => (error instanceof ApiError && error.status === 404 ? SESSIONS_GONE : FAILED);

function statusOf(current: Settled | null): ReportValidationState["status"] {
  if (current === null) return "checking";
  return current.message === null ? "ready" : "error";
}

export interface ReportValidationState {
  /**
   * Jawaban terakhir dari server. Tetap ada selama jawaban berikutnya dalam perjalanan supaya jenis nilai
   * tidak berkedip; null sebelum jawaban pertama dan setelah pemeriksaan gagal (jawaban lama tidak lagi
   * menggambarkan pilihan ini).
   */
  verdict: ReportValidation | null;
  status: "checking" | "ready" | "error";
  message: string | null;
  reload: () => void;
}

interface Settled {
  key: string;
  verdict: ReportValidation | null;
  message: string | null;
}

/**
 * Menanyakan POST /reports/validate tiap pilihan sesi berubah (SCRUM-366). Aturannya ada di server; hook ini
 * hanya mengatur waktu: jeda, membuang balasan yang terlambat, dan memuat ulang. Permintaan dibaca lewat ref
 * supaya pemanggil tidak perlu membungkusnya dengan useMemo; kuncinya isi permintaan itu sendiri.
 */
export function useReportValidation(
  request: ReportValidateRequest,
  gateway: Pick<ReportsGateway, "validate">,
  delayMs: number = VALIDATE_DELAY_MS,
  enabled = true,
): ReportValidationState {
  void enabled;
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const latest = useRef({ request, gateway });
  const key = `${JSON.stringify(request)}|${nonce}`;

  useEffect(() => {
    latest.current = { request, gateway };
  });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      latest.current.gateway.validate(latest.current.request).then(
        (verdict) => {
          if (!cancelled) setSettled({ key, verdict, message: null });
        },
        (error: unknown) => {
          if (!cancelled) setSettled({ key, verdict: null, message: errorText(error) });
        },
      );
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, delayMs]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const current = settled?.key === key ? settled : null;
  return { verdict: settled?.verdict ?? null, status: statusOf(current), message: current?.message ?? null, reload };
}
