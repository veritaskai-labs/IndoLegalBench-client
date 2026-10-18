const MAX_SHOWN = 99;

/** Teks badge lonceng; null berarti badge tidak ditampilkan. */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count);
}
