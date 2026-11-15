import type { ExtraProps } from "react-markdown";

/** Simpul `pre` dari pohon markdown, seperti yang diterima komponen `pre` milik react-markdown. */
type PreNode = ExtraProps["node"];

/** Kelas yang diberi markdown ke blok kode berpagar ```mermaid. */
const MERMAID_CLASS = "language-mermaid";

/**
 * Isi blok ```mermaid, atau null bila blok itu bukan Mermaid (K-12, SCRUM-295). Dibaca dari pohon
 * sintaks, bukan dari elemen React yang sudah jadi, supaya teksnya persis seperti yang ditulis.
 */
export function mermaidSource(pre: PreNode): string | null {
  const code = pre?.children[0];
  if (code?.type !== "element" || code.tagName !== "code") return null;

  const classes = code.properties.className;
  if (!Array.isArray(classes) || !classes.includes(MERMAID_CLASS)) return null;

  return code.children.map((child) => (child.type === "text" ? child.value : "")).join("");
}
