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
      else setError(controlErrorMessage(failure));
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
                onClick={() => run(() => pauseSession(session.id), `Sesi “${session.label}” dijeda`)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                Jeda
              </button>
            )}
            {actions.resume && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => resumeSession(session.id), `Sesi “${session.label}” dilanjutkan`)}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Lanjutkan
              </button>
            )}
            {actions.cancel && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen("cancel")}
                className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                Batalkan
              </button>
            )}
            {actions.retry && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen("retry")}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                Coba ulang yang gagal
              </button>
            )}
            {actions.accept && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen("accept")}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Terima apa adanya
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
          onAccepted={() => done(`Sesi “${session.label}” diterima apa adanya`)}
          onClose={close}
        />
      )}
      {open === "clear" && (
        <ClearAcceptAsIsDialog
          session={session}
          onCleared={() => done(`Tanda terima apa adanya pada “${session.label}” dihapus`)}
          onClose={close}
        />
      )}
      {open === "cancel" && (
        <CancelSessionDialog session={session} onCancelled={() => done(`Sesi “${session.label}” dibatalkan`)} onClose={close} />
      )}
      {open === "retry" && (
        <RetryFailedDialog
          session={session}
          failed={failedCases(session.cases)}
          onRetried={() => done(`Percobaan yang gagal pada “${session.label}” dicoba ulang`)}
          onClose={close}
        />
      )}
      {open === "confirm-resume" && (
        <ConfirmResumeDialog session={session} onResumed={() => done(`Sesi “${session.label}” dilanjutkan`)} onClose={close} />
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
  return (
    <>
      {session.resume_error_code === "MODEL_VERSION_CHANGED" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Versi model produk berubah setelah sesi dilanjutkan, jadi sesi dihentikan dan tidak bisa dilanjutkan lagi.{" "}
          <Link href="/runs/new" className="font-medium underline">
            Buat sesi baru
          </Link>
        </p>
      )}
      {session.resumed_after_long_pause && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Dilanjutkan setelah jeda panjang: jeda sesi ini melebihi batas hari yang ditetapkan.
        </p>
      )}
      {session.model_version_unverified && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Versi model belum terverifikasi saat sesi dilanjutkan.
        </p>
      )}
      {session.accepted_as_is_at !== null && (
        <section
          aria-label="Diterima apa adanya"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">Diterima apa adanya</p>
              <p>{formatWib(session.accepted_as_is_at)}</p>
              <p className="whitespace-pre-line">{session.accepted_as_is_reason}</p>
            </div>
            {canClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900"
              >
                Hapus tanda
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
