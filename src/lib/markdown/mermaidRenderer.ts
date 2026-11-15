/** Mengubah kode Mermaid menjadi SVG. Menolak (reject) bila kodenya tidak bisa digambar. */
export type MermaidRenderer = (id: string, code: string) => Promise<string>;

/** Bagian mermaid.js yang dipakai di sini; cukup sempit supaya mudah diganti di tes. */
export type MermaidLibrary = Readonly<{
  initialize: (config: { startOnLoad: boolean; securityLevel: "strict"; suppressErrorRendering: boolean }) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
}>;

/**
 * Membuat renderer dari cara memuat pustakanya. Pustaka baru dimuat saat diagram pertama tampil dan
 * hanya diatur sekali:
 * - securityLevel "strict": tag HTML di dalam label ditampilkan sebagai teks dan aksi klik dimatikan,
 *   karena kode diagram berasal dari jawaban AI yang ditempel pengguna.
 * - suppressErrorRendering: kode yang salah cukup melempar galat; mermaid tidak menyisipkan gambar
 *   "Syntax error" miliknya ke halaman.
 */
export function createMermaidRenderer(load: () => Promise<MermaidLibrary>): MermaidRenderer {
  let loading: Promise<MermaidLibrary> | null = null;

  function library(): Promise<MermaidLibrary> {
    loading ??= load()
      .then((mermaid) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true });
        return mermaid;
      })
      .catch((error: unknown) => {
        // Unduhan yang gagal (jaringan putus) tidak disimpan, supaya diagram berikutnya mencoba lagi.
        loading = null;
        throw error;
      });
    return loading;
  }

  return async (id, code) => {
    const mermaid = await library();
    const { svg } = await mermaid.render(id, code);
    return svg;
  };
}

/**
 * Renderer bawaan (K-12, SCRUM-295). mermaid.js berukuran besar, jadi diunduh terpisah lewat
 * import() dan tidak ikut bundel halaman yang tidak menampilkan diagram.
 */
export const renderMermaid: MermaidRenderer = createMermaidRenderer(async () => (await import("mermaid")).default);
