/**
 * Tautan hasil di dalam panel pencarian, urut seperti di layar. null = panel belum terpasang;
 * menerima null di sini membuat komponen tidak perlu cabang yang tidak pernah terjadi.
 */
export function resultLinks(panel: ParentNode | null): HTMLAnchorElement[] {
  return panel === null ? [] : Array.from(panel.querySelectorAll("a"));
}
