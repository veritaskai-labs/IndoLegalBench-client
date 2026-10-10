"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compareCaseVersions } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import type { VersionCompare } from "@/types/caseVersion";

type CompareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: VersionCompare }
  | { status: "error"; message: string };

/**
 * Membandingkan dua nomor versi satu kasus saat diminta. Bila pengguna menekan
 * Bandingkan lagi sebelum balasan pertama tiba, hanya balasan permintaan terakhir yang dipakai.
 */
export function useVersionCompare(caseId: string) {
  const [state, setState] = useState<CompareState>({ status: "idle" });
  const latest = useRef(0);

  // Permintaan yang masih berjalan tidak boleh menulis state setelah komponen hilang atau kasus berganti.
  useEffect(() => {
    return () => {
      latest.current += 1;
    };
  }, [caseId]);

  const compare = useCallback(
    async (a: number, b: number) => {
      const request = ++latest.current;
      setState({ status: "loading" });
      try {
        const result = await compareCaseVersions(caseId, a, b);
        if (request === latest.current) setState({ status: "ready", result });
      } catch (error) {
        if (request === latest.current) {
          setState({ status: "error", message: mapVersionError(error, "compare") });
        }
      }
    },
    [caseId],
  );

  return { ...state, compare };
}
