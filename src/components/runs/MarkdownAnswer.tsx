import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Skema tautan yang boleh diklik. Selain ini (javascript:, data:, vbscript:) targetnya dibuang. */
const SAFE_LINK_PROTOCOL = /^(https?:|mailto:)/i;

function safeUrl(url: string): string {
  return SAFE_LINK_PROTOCOL.test(url.trim()) ? url : "";
}

/**
 * Gaya per elemen. Hanya elemen di daftar ini yang diberi gaya; menambah elemen markdown berarti
 * menambah satu entri, alur render tidak berubah.
 */
const ELEMENTS: Components = {
  h1: ({ children }) => <h1 className="mt-3 text-base font-semibold text-slate-900 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 text-sm font-semibold text-slate-900 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-sm font-semibold text-slate-900 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="mt-2 border-l-4 border-slate-200 pl-3 text-slate-600">{children}</blockquote>,
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-md bg-slate-100 p-3 font-mono text-xs whitespace-pre">{children}</pre>
  ),
  code: ({ children, className }) => <code className={className ?? "rounded bg-slate-100 px-1 font-mono text-xs"}>{children}</code>,
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-2 py-1 align-top">{children}</td>,
  // urlTransform mengosongkan tautan yang tidak aman; href kosong akan membuka halaman ini lagi.
  a: ({ children, href }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  // Gambar jarak jauh tidak dimuat: itu bisa jadi pelacak. Yang tampil hanya teks alternatifnya.
  img: ({ alt }) => <span className="text-slate-500">{alt}</span>,
};

/**
 * Jawaban mentah AI sebagai tampilan terformat (PBI-11 AC8). Teks di database tidak diubah.
 * Aman dari XSS karena react-markdown membangun elemen React dari pohon sintaks markdown, tanpa
 * dangerouslySetInnerHTML dan tanpa plugin rehype-raw: HTML mentah dari AI tampil sebagai teks
 * apa adanya, tidak pernah menjadi elemen.
 */
function MarkdownAnswerBase({ source }: Readonly<{ source: string }>) {
  return (
    <div className="px-3 py-2 text-sm break-words text-slate-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={ELEMENTS} urlTransform={safeUrl}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Halaman sesi polling tiap 5 detik dan memberi objek baru ke setiap percobaan. Props di sini
 * hanya `source`, jadi memo mencegah jawaban yang tidak berubah diparse ulang.
 */
export const MarkdownAnswer = memo(MarkdownAnswerBase);
