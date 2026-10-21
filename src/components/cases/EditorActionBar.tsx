import type { ReactNode } from "react";

type Props = {
  saving: boolean;
  /** Aksi lain yang berdampingan dengan Simpan draf, misalnya Ajukan review. */
  children?: ReactNode;
};

/**
 * Bar aksi editor kasus: Simpan draf dan aksi lain berdampingan, menempel di bawah layar
 * saat halaman digulir (temuan Ka Steven). Hanya tata letak; form dan halaman yang
 * memegang logikanya.
 */
export function EditorActionBar({ saving, children }: Readonly<Props>) {
  return (
    <div className="sticky bottom-0 z-10 rounded-t-md border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(15,23,42,0.06)]">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">Aksi kasus</legend>
        <div className="flex flex-wrap items-end justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Simpan draf
          </button>
          {children}
        </div>
      </fieldset>
    </div>
  );
}
