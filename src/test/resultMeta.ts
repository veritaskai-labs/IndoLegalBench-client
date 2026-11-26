import { within } from "@testing-library/react";

/**
 * Isi satu label di ringkasan hasil penilaian (Rubrik, Penilai LLM, Dinilai; SCRUM-375 C4), atau null
 * bila label itu tidak tampil. Ringkasannya <dl>, jadi nilainya adalah <dd> tepat setelah <dt>.
 */
export function resultMeta(label: string, container: HTMLElement = document.body): string | null {
  const term = within(container).queryByText(label, { selector: "dt" });
  return term?.nextElementSibling?.textContent ?? null;
}
