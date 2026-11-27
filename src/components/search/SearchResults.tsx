import type { GlobalSearchState } from "@/hooks/useGlobalSearch";

type Props = {
  state: GlobalSearchState;
  onRetry: () => void;
  /** Dipanggil saat pengguna memilih hasil, sebelum pindah halaman. */
  onChoose: () => void;
};

export function SearchResults(props: Readonly<Props>) {
  void props;
  return null;
}
