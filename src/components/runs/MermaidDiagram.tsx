"use client";

import { useEffect, useId, useState } from "react";

import { renderMermaid, type MermaidRenderer } from "@/lib/markdown/mermaidRenderer";

/** Hasil menggambar satu kode. `svg` null berarti kodenya tidak bisa digambar. */
type Outcome = Readonly<{ code: string; svg: string | null }>;

/** mermaid memakai id ini sebagai id elemen SVG, jadi hanya huruf, angka, garis bawah dan tanda hubung. */
function svgId(reactId: string): string {
  return `mermaid-${reactId.replace(/[^\w-]/g, "")}`;
}

/**
 * Satu blok ```mermaid sebagai gambar diagram (K-12, SCRUM-295). Sebelumnya blok ini tampil sebagai
 * teks kode sehingga sulit dibaca dan dinilai. Kode yang tidak bisa digambar tetap tampil sebagai
 * teks dengan keterangan, jadi isi jawaban tidak pernah hilang.
 */
export function MermaidDiagram({
  code,
  render = renderMermaid,
}: Readonly<{ code: string; render?: MermaidRenderer }>) {
  const id = svgId(useId());
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let stale = false;
    render(id, code).then(
      (svg) => {
        if (!stale) setOutcome({ code, svg });
      },
      () => {
        if (!stale) setOutcome({ code, svg: null });
      },
    );
    // Hasil untuk kode lama tidak boleh menimpa kode yang sekarang tampil.
    return () => {
      stale = true;
    };
  }, [id, code, render]);

  // Hasil milik kode sebelumnya dianggap belum ada, jadi diagram lama tidak tampil untuk kode baru.
  const current = outcome?.code === code ? outcome : null;

  if (current === null) {
    return <p className="mt-2 text-xs text-slate-500">Memuat diagram...</p>;
  }

  if (current.svg === null) {
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-amber-700">Diagram tidak dapat ditampilkan. Periksa penulisan kode Mermaid di bawah ini.</p>
        <pre className="overflow-x-auto rounded-md bg-slate-100 p-3 font-mono text-xs whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Diagram Mermaid"
      className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-white p-3 [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full"
      // SVG ini buatan mermaid dengan securityLevel "strict" (sudah disaring DOMPurify), bukan teks
      // mentah dari jawaban. Ini satu-satunya tempat HTML disisipkan langsung di tampilan jawaban.
      dangerouslySetInnerHTML={{ __html: current.svg }}
    />
  );
}
