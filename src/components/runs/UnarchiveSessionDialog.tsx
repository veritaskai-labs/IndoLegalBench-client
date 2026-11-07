import type { SessionListItem } from "@/types/measurement";

type Props = Readonly<{
  session: Pick<SessionListItem, "id" | "label">;
  onUnarchived: () => void;
  onClose: (afterError: boolean) => void;
}>;

// Kerangka kosong untuk commit red; perilakunya ditulis di commit green.
export function UnarchiveSessionDialog(props: Props) {
  void props;
  return null;
}
