/** Satu syarat isian: nama yang ditampilkan ke pengguna dan apakah sudah terpenuhi. */
export type Requirement = readonly [label: string, met: boolean];

/** Kalimat alasan tombol mati dari syarat yang belum terpenuhi, atau null bila semuanya terpenuhi. */
export function missingRequirementsText(requirements: readonly Requirement[]): string | null {
  const missing = requirements.filter(([, met]) => !met).map(([label]) => label);
  if (missing.length === 0) return null;
  return `Lengkapi dulu: ${joinWithDan(missing)}.`;
}

function joinWithDan(items: readonly string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items.at(-1)}`;
}
