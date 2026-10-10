import type { SnapshotsState } from "@/hooks/useSnapshots";

type Props = {
  state: SnapshotsState;
  page: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
};

export function SnapshotList(props: Props) {
  void props;
  return null;
}
