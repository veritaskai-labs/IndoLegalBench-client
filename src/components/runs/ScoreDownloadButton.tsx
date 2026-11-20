"use client";

import { useId, useRef, useState } from "react";

import { useSessionResults } from "@/hooks/useSessionResults";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { saveBlob } from "@/lib/browserDownload";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import {
  scoreDownloadDecision,
  type ScoreDownloadSession,
  type ScoreGrading,
} from "@/lib/runs/scoreDownload";
import { httpScoreDownload, type ScoreDownload } from "@/lib/runs/scoreDownloadApi";

type Session = ScoreDownloadSession & { id: string };

const DOWNLOAD_FAILED = "Permintaan gagal. Coba lagi.";

/** Kalimat 409 yang memang ditulis untuk pengguna. Kode lain tidak ditampilkan. */
const DOWNLOAD_REFUSAL = new Set([
  "SESSION_ARCHIVED",
  "SESSION_NOT_FINISHED",
  "SESSION_CANCELLED",
  "SESSION_RUN_FAILED",
  "SESSION_NOT_ACCEPTED_AS_IS",
  "SESSION_NOT_GRADED",
  "SCORE_FILE_NO_VISIBLE_CASES",
]);

function failureText(error: unknown): string {
  if (error instanceof ApiError && error.serverMessage !== null && DOWNLOAD_REFUSAL.has(error.code)) {
    return error.serverMessage;
  }
  return DOWNLOAD_FAILED;
}

function gradingOf(results: AsyncResource<unknown>): ScoreGrading {
  if (results.status !== "ready") return "unknown";
  if (results.data === null) return "ungraded";
  return "graded";
}

/**
 * Unduh skor di baris judul detail sesi (SCRUM-329). Tombol yang tidak layak tetap
 * ada, dalam keadaan mati, dengan satu kalimat di sampingnya. Berkasnya datang dari
 * server. Tombol tidak membaca jawaban atau skor yang sedang ditampilkan.
 */
export function ScoreDownloadButton({
  session,
  grading,
  download = httpScoreDownload.download,
}: Readonly<{
  session: Session;
  grading: ScoreGrading;
  download?: ScoreDownload["download"];
}>) {
  const reasonId = useId();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const decision = scoreDownloadDecision(session, grading);
  const reason = decision.eligible ? null : decision.reason;

  async function onClick() {
    if (!decision.eligible || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const file = await download(session.id);
      saveBlob(file.blob, file.fileName);
    } catch (error: unknown) {
      setFailure(failureText(error));
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
      {failure !== null && (
        <p role="alert" className="text-sm text-red-700">
          {failure}
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
export function SessionScoreDownload({
  session,
  gateway,
}: Readonly<{ session: Session; gateway?: GradingGateway }>) {
  const results = useSessionResults(session.id, gateway);
  return <ScoreDownloadButton session={session} grading={gradingOf(results)} />;
}
