/**
 * Tes renderer Mermaid untuk pratinjau diagram (PBI-22, K-12, SCRUM-295). Pustaka mermaid diganti
 * mock, jadi yang diuji hanya aturan kita: dimuat saat dipakai, diatur sekali dengan mode aman, dan
 * galatnya diteruskan ke pemanggil. jsdom juga tidak bisa menggambar SVG asli.
 * Label tes: Positif = diagram tergambar, Negatif = kode atau unduhan gagal, Edge = pemakaian berulang.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));

vi.mock("mermaid", () => ({ default: mermaid }));

import { createMermaidRenderer, renderMermaid, type MermaidLibrary } from "./mermaidRenderer";

/** Pustaka tiruan dengan cara muat yang bisa dihitung dan dibuat gagal. */
function fakeLibrary() {
  const library = {
    initialize: vi.fn<MermaidLibrary["initialize"]>(),
    render: vi.fn<MermaidLibrary["render"]>().mockResolvedValue({ svg: "<svg />" }),
  };
  const load = vi.fn<() => Promise<MermaidLibrary>>().mockResolvedValue(library);
  return { library, load };
}

describe("createMermaidRenderer (K-12, SCRUM-295)", () => {
  // Positif: kode yang benar menghasilkan SVG dari mermaid, dengan id dan kode yang diteruskan utuh.
  it("returns the svg that mermaid draws for the code", async () => {
    // Arrange
    const { library, load } = fakeLibrary();
    library.render.mockResolvedValue({ svg: "<svg>alur</svg>" });
    const render = createMermaidRenderer(load);

    // Act
    const svg = await render("mermaid-1", "graph TD\n  A --> B");

    // Assert
    expect(svg).toBe("<svg>alur</svg>");
    expect(library.render).toHaveBeenCalledWith("mermaid-1", "graph TD\n  A --> B");
  });

  // Positif: mode "strict" wajib, karena kode diagram berasal dari jawaban AI yang ditempel pengguna.
  it("configures mermaid in strict mode without auto start or its own error drawing", async () => {
    // Arrange
    const { library, load } = fakeLibrary();
    const render = createMermaidRenderer(load);

    // Act
    await render("mermaid-1", "graph TD");

    // Assert
    expect(library.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
    });
  });

  // Edge: pustaka yang besar tidak dimuat sebelum ada diagram yang perlu digambar.
  it("does not load the library until a diagram is drawn", () => {
    // Arrange
    const { load } = fakeLibrary();

    // Act
    createMermaidRenderer(load);

    // Assert
    expect(load).not.toHaveBeenCalled();
  });

  // Edge: satu jawaban bisa berisi beberapa diagram; pustaka cukup dimuat dan diatur sekali.
  it("loads and configures mermaid only once for several diagrams", async () => {
    // Arrange
    const { library, load } = fakeLibrary();
    const render = createMermaidRenderer(load);

    // Act
    await Promise.all([render("mermaid-1", "graph TD"), render("mermaid-2", "graph LR")]);
    await render("mermaid-3", "pie");

    // Assert
    expect(load).toHaveBeenCalledTimes(1);
    expect(library.initialize).toHaveBeenCalledTimes(1);
    expect(library.render).toHaveBeenCalledTimes(3);
  });

  // Negatif: kode Mermaid yang salah harus menolak, supaya komponen bisa menampilkan teks aslinya.
  it("rejects when mermaid cannot draw the code", async () => {
    // Arrange
    const { library, load } = fakeLibrary();
    library.render.mockRejectedValue(new Error("Parse error on line 1"));
    const render = createMermaidRenderer(load);

    // Act
    const attempt = render("mermaid-1", "bukan diagram");

    // Assert
    await expect(attempt).rejects.toThrow("Parse error on line 1");
  });

  // Negatif lalu positif: unduhan yang gagal tidak disimpan, jadi diagram berikutnya mencoba lagi.
  it("rejects when the library fails to load and tries again on the next diagram", async () => {
    // Arrange
    const { library, load } = fakeLibrary();
    load.mockRejectedValueOnce(new Error("gagal mengunduh mermaid"));
    library.render.mockResolvedValue({ svg: "<svg>pulih</svg>" });
    const render = createMermaidRenderer(load);

    // Act
    const failed = render("mermaid-1", "graph TD");
    await expect(failed).rejects.toThrow("gagal mengunduh mermaid");
    const svg = await render("mermaid-2", "graph TD");

    // Assert
    expect(svg).toBe("<svg>pulih</svg>");
    expect(load).toHaveBeenCalledTimes(2);
    expect(library.initialize).toHaveBeenCalledTimes(1);
  });
});

describe("renderMermaid (renderer bawaan)", () => {
  beforeEach(() => {
    mermaid.initialize.mockReset();
    mermaid.render.mockReset();
  });

  // Positif: renderer bawaan memakai paket mermaid (di sini mock) lewat import() yang ditunda.
  it("draws with the mermaid package", async () => {
    // Arrange
    mermaid.render.mockResolvedValue({ svg: "<svg>paket</svg>", diagramType: "flowchart" });

    // Act
    const svg = await renderMermaid("mermaid-1", "graph TD");

    // Assert
    expect(svg).toBe("<svg>paket</svg>");
    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: "strict" }));
  });
});
