"use client";

import { useId } from "react";
import { MarkdownAnswer } from "@/components/runs/MarkdownAnswer";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { openAsModal } from "@/components/ui/ConfirmDialog";
import { useAnswerHistory } from "@/hooks/useAnswerHistory";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { toHistoryVersions, type HistoryVersion } from "@/lib/runs/answerHistoryView";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";

const COPY = messages({
  id: {
    refused: "Platform menolak menjawab",
    note: "Catatan: {note}",
    empty: "Jawaban kosong.",
    none: "Jawaban ini belum pernah ditimpa, jadi belum ada versi sebelumnya.",
    filled: "Diisi oleh {who} pada {when}",
    obtained: "Diperoleh dari platform: {when}",
    overwritten: "Ditimpa oleh {who} pada {when}",
    title: "Riwayat Percobaan {n}",
    loading: "Memuat riwayat…",
  },
  en: {
    refused: "Platform refused to answer",
    note: "Note: {note}",
    empty: "Empty answer.",
    none: "This answer has never been overwritten, so there is no earlier version.",
    filled: "Filled in by {who} on {when}",
    obtained: "Obtained from the platform: {when}",
    overwritten: "Overwritten by {who} on {when}",
    title: "History for attempt {n}",
    loading: "Loading history…",
  },
});

function VersionAnswer({ version }: Readonly<{ version: HistoryVersion }>) {
  const copy = useText(COPY);
  if (version.refused) {
    return (
      <div className="px-3 py-2 text-sm text-slate-800">
        <p className="font-medium">{copy.refused}</p>
        {version.note && <p className="mt-1">{fill(copy.note, { note: version.note })}</p>}
      </div>
    );
  }
  if (version.answerMd === null) return <p className="px-3 py-2 text-sm text-slate-500">{copy.empty}</p>;
  return <MarkdownAnswer source={version.answerMd} />;
}

function VersionList({ entries, currentUserId }: Readonly<{ entries: ManualAnswerHistoryEntry[]; currentUserId: string | null }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const versions = toHistoryVersions(entries, currentUserId, locale);
  if (versions.length === 0) {
    return <p className="text-sm text-slate-600">{copy.none}</p>;
  }
  return (
    <ol className="space-y-4">
      {versions.map((version) => (
        <li key={version.key} className="rounded-md border border-slate-200">
          <div className="space-y-0.5 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <h3 className="text-sm font-semibold text-slate-900">{version.title}</h3>
            <p>{fill(copy.filled, { who: version.filledBy, when: version.filledAt })}</p>
            {version.obtainedAt && <p>{fill(copy.obtained, { when: version.obtainedAt })}</p>}
            <p>{fill(copy.overwritten, { who: version.overwrittenBy, when: version.overwrittenAt })}</p>
          </div>
          <VersionAnswer version={version} />
        </li>
      ))}
    </ol>
  );
}

/**
 * Riwayat satu jawaban (AC5): versi lama yang tetap tersimpan setelah ditimpa. Boleh dilihat semua
 * yang bisa membuka sesi. Dipasang hanya saat dibuka, jadi data dimuat saat tombol Riwayat ditekan.
 */
export function AnswerHistoryDialog({
  gateway,
  sessionId,
  snapshotItemId,
  attemptNo,
  currentUserId,
  onClose,
}: Readonly<{
  gateway: ManualAnswerGateway;
  sessionId: string;
  snapshotItemId: string;
  attemptNo: number;
  currentUserId: string | null;
  onClose: () => void;
}>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const titleId = useId();
  const history = useAnswerHistory(gateway, sessionId, snapshotItemId, attemptNo);

  return (
    <dialog
      ref={openAsModal}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby={titleId}
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id={titleId} className="text-base font-medium">
        {fill(copy.title, { n: attemptNo })}
      </h2>
      <div className="mt-4">
        {history.status === "loading" && <LoadingState label={copy.loading} />}
        {history.status === "error" && <ErrorState variant="card" message={history.message} onRetry={history.reload} />}
        {history.status === "ready" && <VersionList entries={history.data} currentUserId={currentUserId} />}
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          {chrome.close}
        </button>
      </div>
    </dialog>
  );
}
