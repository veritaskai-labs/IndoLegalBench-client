"use client";

import { useId, useRef, useState } from "react";

import { useSessionResults } from "@/hooks/useSessionResults";
import { saveBlob } from "@/lib/browserDownload";
import {
  scoreDownloadDecision,
  type ScoreDownloadSession,
  type ScoreGrading,
} from "@/lib/runs/scoreDownload";
import { pendingScoreDownload, type ScoreDownload } from "@/lib/runs/scoreDownloadApi";

type Session = ScoreDownloadSession & { id: string };

const DOWNLOAD_FAILED = "Permintaan gagal. Coba lagi.";

/**
 * Unduh skor di baris judul detail sesi (SCRUM-329). Tombol yang tidak layak tetap
 * ada, dalam keadaan mati, dengan satu kalimat di sampingnya. Berkasnya datang dari
 * download; bawaan saat ini placeholder SCRUM-327 dan tidak membaca isi sesi.
 */
export function ScoreDownloadButton({
  session,
  grading,
  download = pendingScoreDownload.download,
}: Readonly<{
  session: Session;
  grading: ScoreGrading;
  download?: ScoreDownload["download"];
}>) {
  const reasonId = useId();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const decision = scoreDownloadDecision(session, grading);
  const reason = decision.eligible ? null : decision.reason;

  async function onClick() {
    if (!decision.eligible || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const file = await download(session.id);
      saveBlob(file.blob, file.fileName);
    } catch {
      setFailed(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {reason !== null && (
        <p id={reasonId} className="text-sm text-slate-600">
          {reason}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-red-700">
          {DOWNLOAD_FAILED}
        </p>
      )}
      <button
        type="button"
        disabled={!decision.eligible || busy}
        aria-describedby={reason === null ? undefined : reasonId}
        onClick={() => void onClick()}
        className={
          decision.eligible
            ? "rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500"
        }
      >
        Unduh skor
      </button>
    </div>
  );
}

/** Menempelkan tombol ke hasil penilaian yang sama dengan bagian Hasil penilaian. */
export function SessionScoreDownload({ session }: Readonly<{ session: Session }>) {
  const results = useSessionResults(session.id);
  const grading: ScoreGrading =
    results.status !== "ready" ? "unknown" : results.data === null ? "ungraded" : "graded";
  return <ScoreDownloadButton session={session} grading={grading} />;
}
