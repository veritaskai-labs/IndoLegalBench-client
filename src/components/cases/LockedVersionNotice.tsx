"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const COPY = messages({
  id: {
    region: "Versi terkunci",
    approved:
      "Kasus ini sudah disetujui, jadi tidak bisa diubah langsung. Mengedit akan membuat versi baru yang harus ditinjau ulang. Selama itu, versi yang disetujui tetap berlaku.",
    inReview: "Kasus ini sedang ditinjau, jadi belum bisa diubah.",
    pending: "Membuat versi baru…",
    start: "Edit (buat versi baru)",
  },
  en: {
    region: "Locked version",
    approved:
      "This case is approved, so it cannot be edited directly. Editing starts a new version that has to be reviewed again. Until then, the approved version stays in effect.",
    inReview: "This case is in review, so it cannot be edited yet.",
    pending: "Starting a new version…",
    start: "Edit (start a new version)",
  },
});

type Props = {
  /** Kasus berstatus disetujui; selain itu yang terkunci hanyalah kasus dalam tinjauan. */
  approved: boolean;
  /** Tombol hanya ada bila pengguna boleh membuat versi baru. */
  canStart: boolean;
  pending: boolean;
  error: string | null;
  onStart: () => void;
};

/** Penjelasan kenapa form terkunci, dan jalan keluarnya untuk kasus yang disetujui. */
export function LockedVersionNotice({ approved, canStart, pending, error, onStart }: Readonly<Props>) {
  const copy = useText(COPY);
  return (
    <section
      aria-label={copy.region}
      className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      {approved ? (
        <p className="text-sm text-amber-900">{copy.approved}</p>
      ) : (
        <p className="text-sm text-amber-900">{copy.inReview}</p>
      )}

      {error !== null && <ErrorState message={error} />}

      {approved && canStart && (
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? copy.pending : copy.start}
        </button>
      )}
    </section>
  );
}
