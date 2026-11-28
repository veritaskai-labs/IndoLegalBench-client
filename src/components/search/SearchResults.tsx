import Link from "next/link";
import { useId, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { GlobalSearchState } from "@/hooks/useGlobalSearch";
import { SEARCH_MAX_CHARS, SEARCH_MIN_CHARS } from "@/lib/search/searchQuery";
import { SEARCH_GROUP_CAP, resultCount, type SearchGroup } from "@/lib/search/searchResults";

type Props = {
  state: GlobalSearchState;
  onRetry: () => void;
  /** Dipanggil saat pengguna memilih hasil, sebelum pindah halaman. */
  onChoose: () => void;
  /** Tombol panah dan Escape di sebuah hasil (diatur oleh kotak cari). */
  onLinkKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

type GroupProps = Pick<Props, "onChoose" | "onLinkKeyDown"> & { group: SearchGroup };

const NOTE = "px-4 py-3 text-sm text-muted";

/** Isi panel hasil pencarian global (SCRUM-352). Hanya menampilkan; logikanya di lib/search dan hook. */
export function SearchResults({ state, onRetry, onChoose, onLinkKeyDown }: Readonly<Props>) {
  switch (state.status) {
    case "idle":
      return null;
    case "tooShort":
      return <p className={NOTE}>Ketik minimal {SEARCH_MIN_CHARS} karakter.</p>;
    case "tooLong":
      return <p className={NOTE}>Kata kunci paling banyak {SEARCH_MAX_CHARS} karakter.</p>;
    case "loading":
      return <output className={`block ${NOTE}`}>Mencari…</output>;
    case "invalid":
      return <p className={NOTE}>Kata kunci tidak valid. Gunakan huruf atau angka.</p>;
    case "failed":
      return (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink">
          <span>Pencarian gagal.</span>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      );
    case "done":
      return state.groups.length === 0 ? (
        <p className={NOTE}>Tidak ada hasil untuk “{state.q}”.</p>
      ) : (
        <>
          <output className="sr-only">{resultCount(state.groups)} hasil</output>
          {state.groups.map((group) => (
            <ResultGroup key={group.key} group={group} onChoose={onChoose} onLinkKeyDown={onLinkKeyDown} />
          ))}
        </>
      );
  }
}

function ResultGroup({ group, onChoose, onLinkKeyDown }: Readonly<GroupProps>) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="border-b border-line-soft py-2 last:border-b-0">
      <h2 id={headingId} className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {group.heading} ({group.rows.length})
      </h2>
      <ul>
        {group.rows.map((row) => (
          <li key={row.id}>
            <Link
              href={row.href}
              onClick={onChoose}
              onKeyDown={onLinkKeyDown}
              className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.label}</span>
                {row.meta !== null && <span className="block truncate text-xs text-muted">{row.meta}</span>}
              </span>
              {row.archived && <Badge>Arsip</Badge>}
            </Link>
          </li>
        ))}
      </ul>
      {group.capped && (
        <p className="px-4 py-1 text-xs text-muted">
          Menampilkan {SEARCH_GROUP_CAP} hasil pertama. Perjelas kata kunci untuk mempersempit.
        </p>
      )}
    </section>
  );
}
