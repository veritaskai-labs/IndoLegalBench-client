import { Button } from "./Button";

type Props = {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
};

export function Pager({ page, lastPage, onPageChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>
        Halaman {page} dari {lastPage}
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Sebelumnya
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
