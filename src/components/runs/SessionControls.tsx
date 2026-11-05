"use client";

import { useState } from "react";

import { AcceptAsIsDialog } from "@/components/runs/AcceptAsIsDialog";
import { ClearAcceptAsIsDialog } from "@/components/runs/ClearAcceptAsIsDialog";
import { useToast } from "@/components/ui/Toast";
import { formatWib } from "@/lib/datetime/formatWib";
import { canAcceptAsIs, canClearAcceptAsIs } from "@/lib/runs/sessionAccept";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";

type ControlState = Pick<
  SessionDetail,
  "id" | "label" | "status" | "accepted_as_is_at" | "accepted_as_is_by" | "accepted_as_is_reason"
>;

type OpenDialog = "accept" | "clear" | null;

/**
 * Kontrol sesi di halaman detail (PBI-12, SCRUM-220). Bagian ini baru memuat Terima apa adanya
 * (AC9); Jeda, Batalkan, Lanjutkan dan Coba ulang menyusul di sini setelah SCRUM-216 dan SCRUM-218.
 * Setiap perubahan memuat ulang sesi lewat onChanged, supaya halaman mengikuti data server.
 */
export function SessionControls({
  session,
  role,
  onChanged,
}: Readonly<{ session: ControlState; role: Role | null; onChanged: () => void }>) {
  const { showToast } = useToast();
  const [open, setOpen] = useState<OpenDialog>(null);

  const accepted = session.accepted_as_is_at !== null;
  const showAccept = canAcceptAsIs(session, role);
  if (!accepted && !showAccept) return null;

  function done(message: string) {
    setOpen(null);
    showToast(message);
    onChanged();
  }

  function close(afterError: boolean) {
    setOpen(null);
    if (afterError) onChanged();
  }

  return (
    <>
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
            {canClearAcceptAsIs(session, role) && (
              <button
                type="button"
                onClick={() => setOpen("clear")}
                className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900"
              >
                Hapus tanda
              </button>
            )}
          </div>
        </section>
      )}

      {showAccept && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setOpen("accept")}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Terima apa adanya
          </button>
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
    </>
  );
}
