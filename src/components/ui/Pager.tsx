type Props = {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
};

export function Pager({ page, lastPage, onPageChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
      <span>
        Halaman {page} dari {lastPage}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
