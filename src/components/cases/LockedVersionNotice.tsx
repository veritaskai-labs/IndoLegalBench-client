import { ErrorState } from "@/components/ui/ErrorState";

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
export function LockedVersionNotice({ approved, canStart, pending, error, onStart }: Props) {
  return (
    <section
      aria-label="Versi terkunci"
      className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      {approved ? (
        <p className="text-sm text-amber-900">
          Kasus ini sudah disetujui, jadi tidak bisa diubah langsung. Mengedit akan membuat versi
          baru yang harus ditinjau ulang. Selama itu, versi yang disetujui tetap berlaku.
        </p>
      ) : (
        <p className="text-sm text-amber-900">
          Kasus ini sedang ditinjau, jadi belum bisa diubah.
        </p>
      )}

      {error !== null && <ErrorState message={error} />}

      {approved && canStart && (
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Membuat versi baru…" : "Edit (buat versi baru)"}
        </button>
      )}
    </section>
  );
}
