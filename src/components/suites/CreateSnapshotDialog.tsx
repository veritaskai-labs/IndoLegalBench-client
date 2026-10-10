import type { SnapshotRead } from "@/types/snapshot";

type Props = {
  suiteId: string;
  onClose: () => void;
  onCreated: (snapshot: SnapshotRead) => void;
};

export function CreateSnapshotDialog(props: Props) {
  void props;
  return null;
}
