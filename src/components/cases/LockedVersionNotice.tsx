type Props = {
  approved: boolean;
  canStart: boolean;
  pending: boolean;
  error: string | null;
  onStart: () => void;
};

export function LockedVersionNotice(props: Props) {
  void props;
  return null;
}
