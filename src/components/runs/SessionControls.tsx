"use client";

import Link from "next/link";
import { useState } from "react";

import { AcceptAsIsDialog } from "@/components/runs/AcceptAsIsDialog";
import { CancelSessionDialog } from "@/components/runs/CancelSessionDialog";
import { ClearAcceptAsIsDialog } from "@/components/runs/ClearAcceptAsIsDialog";
import { ConfirmResumeDialog } from "@/components/runs/ConfirmResumeDialog";
import { RetryFailedDialog } from "@/components/runs/RetryFailedDialog";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import { formatWib } from "@/lib/datetime/formatWib";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { canAcceptAsIs, canClearAcceptAsIs } from "@/lib/runs/sessionAccept";
import { canCancel, canPause, canResume, canRetry, controlErrorMessage, failedCases } from "@/lib/runs/sessionControl";
import { pauseSession, resumeSession } from "@/lib/runs/sessionControlApi";
import type { Role } from "@/types";
import type { SessionCaseResult, SessionDetail } from "@/types/measurement";

type ControlState = Pick<
  SessionDetail,
  | "id"
  | "label"
  | "status"
  | "progress"
  | "archived_at"
  | "accepted_as_is_at"
  | "accepted_as_is_by"
  | "accepted_as_is_reason"
  | "resumed_after_long_pause"
  | "model_version_unverified"
  | "resume_error_code"
  | "created_by"
> & { cases: ReadonlyArray<Pick<SessionCaseResult, "snapshot_item_id" | "case_code" | "title" | "masked" | "attempts">> };

type OpenDialog = "accept" | "clear" | "cancel" | "confirm-resume" | "retry" | null;

const COPY = messages({
  id: {
    pause: "Jeda",
    resume: "Lanjutkan",
    cancel: "Batalkan",
    retry: "Coba ulang yang gagal",
    accept: "Terima apa adanya",
    paused: "Sesi “{label}” dijeda",
    resumed: "Sesi “{label}” dilanjutkan",
    accepted: "Sesi “{label}” diterima apa adanya",
    cleared: "Tanda terima apa adanya pada “{label}” dihapus",
    cancelled: "Sesi “{label}” dibatalkan",
    retried: "Percobaan yang gagal pada “{label}” dicoba ulang",
    versionChanged: "Versi model produk berubah setelah sesi dilanjutkan, jadi sesi dihentikan dan tidak bisa dilanjutkan lagi.",
    newSession: "Buat sesi baru",
    longPause: "Dilanjutkan setelah jeda panjang: jeda sesi ini melebihi batas hari yang ditetapkan.",
    unverified: "Versi model belum terverifikasi saat sesi dilanjutkan.",
    acceptedRegion: "Diterima apa adanya",
    acceptedTitle: "Diterima apa adanya",
    removeMark: "Hapus tanda",
  },
  en: {
    pause: "Pause",
    resume: "Resume",
    cancel: "Cancel",
    retry: "Retry failed calls",
    accept: "Accept as-is",
    paused: "Session “{label}” paused",
    resumed: "Session “{label}” resumed",
    accepted: "Session “{label}” accepted as-is",
    cleared: "The accepted-as-is mark on “{label}” was removed",
    cancelled: "Session “{label}” cancelled",
    retried: "Failed attempts on “{label}” were retried",
    versionChanged: "The product's model version changed after the session was resumed, so the session was stopped and cannot be resumed again.",
    newSession: "Create a new session",
    longPause: "Resumed after a long pause: this session's pause exceeded the set number of days.",
    unverified: "The model version was not verified when the session was resumed.",
    acceptedRegion: "Accepted as-is",
    acceptedTitle: "Accepted as-is",
    removeMark: "Remove mark",
  },
});

/**
 * Kontrol sesi di halaman detail (PBI-12, SCRUM-220): Coba ulang yang gagal (AC3), Jeda, Batalkan,
 * Lanjutkan (AC7, AC8) dan Terima apa adanya (AC9), beserta penandanya. Jeda dan Lanjutkan langsung
 * jalan; aksi lain meminta konfirmasi. Setiap perubahan memuat ulang sesi lewat onChanged.
 * viewerId dibutuhkan Coba ulang: Developer AI hanya boleh pada sesi yang ia buat (server#99).
 * Aksi langsung yang ditolak tidak memuat ulang, supaya alasannya tetap terbaca.
 */
export function SessionControls({
  session,
  role,
  viewerId,
  onChanged,
}: Readonly<{ session: ControlState; role: Role | null; viewerId: string | null; onChanged: () => void }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const { showToast } = useToast();
  const [open, setOpen] = useState<OpenDialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = {
    pause: canPause(session, role),
    cancel: canCancel(session, role),
    resume: canResume(session, role),
    accept: canAcceptAsIs(session, role),
    retry: canRetry(session, role === null || viewerId === null ? null : { id: viewerId, role }),
  };
  const hasAction = Object.values(actions).some(Boolean);
  if (!hasAction && !hasNotice(session)) return null;

  function done(message: string) {
    setOpen(null);
    showToast(message);
    onChanged();
  }

  function close(afterError: boolean) {
    setOpen(null);
    if (afterError) onChanged();
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      done(message);
    } catch (failure) {
      // server#102: tanpa versi yang pernah dilaporkan, Admin harus mengonfirmasi dulu.
      if (failure instanceof ApiError && failure.code === "MODEL_VERSION_CONFIRMATION_REQUIRED") setOpen("confirm-resume");
      else setError(controlErrorMessage(failure, locale));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SessionNotices session={session} canClear={canClearAcceptAsIs(session, role)} onClear={() => setOpen("clear")} />

      {hasAction && (
        <div className="space-y-2">
          <div className="flex flex-wrap justify-end gap-2">
            {actions.pause && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => pauseSession(session.id), fill(copy.paused, { label: session.label }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                {copy.pause}
              </button>
            )}
            {actions.resume && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => resumeSession(session.id), fill(copy.resumed, { label: session.label }))}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {copy.resume}
              </button>
            )}
            {actions.cancel && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen("cancel")}
                className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                {copy.cancel}
              </button>
            )}
            {actions.retry && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen("retry")}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                {copy.retry}
              </button>
            )}
            {actions.accept && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen("accept")}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {copy.accept}
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-right text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}

      {open === "accept" && (
        <AcceptAsIsDialog
          session={session}
          onAccepted={() => done(fill(copy.accepted, { label: session.label }))}
          onClose={close}
        />
      )}
      {open === "clear" && (
        <ClearAcceptAsIsDialog
          session={session}
          onCleared={() => done(fill(copy.cleared, { label: session.label }))}
          onClose={close}
        />
      )}
      {open === "cancel" && (
        <CancelSessionDialog session={session} onCancelled={() => done(fill(copy.cancelled, { label: session.label }))} onClose={close} />
      )}
      {open === "retry" && (
        <RetryFailedDialog
          session={session}
          failed={failedCases(session.cases)}
          onRetried={() => done(fill(copy.retried, { label: session.label }))}
          onClose={close}
        />
      )}
      {open === "confirm-resume" && (
        <ConfirmResumeDialog session={session} onResumed={() => done(fill(copy.resumed, { label: session.label }))} onClose={close} />
      )}
    </>
  );
}

function hasNotice(session: ControlState): boolean {
  return (
    session.accepted_as_is_at !== null ||
    session.resumed_after_long_pause ||
    session.model_version_unverified ||
    session.resume_error_code !== null
  );
}

/** Penanda untuk semua yang bisa membuka detail: terima apa adanya (AC9) dan penanda Lanjutkan (AC8). */
function SessionNotices({
  session,
  canClear,
  onClear,
}: Readonly<{ session: ControlState; canClear: boolean; onClear: () => void }>) {
  const copy = useText(COPY);
  return (
    <>
      {session.resume_error_code === "MODEL_VERSION_CHANGED" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.versionChanged}{" "}
          <Link href="/runs/new" className="font-medium underline">
            {copy.newSession}
          </Link>
        </p>
      )}
      {session.resumed_after_long_pause && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {copy.longPause}
        </p>
      )}
      {session.model_version_unverified && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {copy.unverified}
        </p>
      )}
      {session.accepted_as_is_at !== null && (
        <section
          aria-label={copy.acceptedRegion}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">{copy.acceptedTitle}</p>
              <p>{formatWib(session.accepted_as_is_at)}</p>
              <p className="whitespace-pre-line">{session.accepted_as_is_reason}</p>
            </div>
            {canClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900"
              >
                {copy.removeMark}
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
