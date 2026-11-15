/**
 * Tes MermaidDiagram: satu blok ```mermaid sebagai gambar di pratinjau jawaban (PBI-22, K-12,
 * SCRUM-295, TC_99). Renderer diberikan lewat props sebagai mock, jadi tes ini tidak memuat mermaid.js
 * dan bisa mengatur kapan gambar selesai atau gagal.
 * Label tes: Positif = diagram tampil, Negatif = kode tidak bisa digambar, Edge = urutan dan pergantian kode.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MermaidRenderer } from "@/lib/markdown/mermaidRenderer";
import { MermaidDiagram } from "./MermaidDiagram";

const FLOW = "graph TD\n  A --> B";

/** Renderer yang selesainya dikendalikan tes, untuk memeriksa keadaan memuat dan urutan hasil. */
function deferredRenderer() {
  const pending = new Map<string, { resolve: (svg: string) => void; reject: (error: Error) => void }>();
  const renderer = vi.fn<MermaidRenderer>(
    (_id, code) => new Promise<string>((resolve, reject) => pending.set(code, { resolve, reject })),
  );
  return { renderer, pending };
}

describe("MermaidDiagram (K-12, SCRUM-295)", () => {
  // Positif: inti perbaikan K-12, kode Mermaid tampil sebagai gambar dan bukan lagi teks kode.
  it("shows the drawn diagram instead of the code", async () => {
    // Arrange
    const renderer = vi.fn<MermaidRenderer>().mockResolvedValue('<svg data-testid="gambar"><text>A</text></svg>');

    // Act
    render(<MermaidDiagram code={FLOW} render={renderer} />);

    // Assert
    const diagram = await screen.findByRole("img", { name: "Diagram Mermaid" });
    expect(diagram.querySelector("svg")).toBe(screen.getByTestId("gambar"));
    expect(screen.queryByText(/graph TD/)).not.toBeInTheDocument();
    expect(renderer).toHaveBeenCalledWith(expect.stringMatching(/^mermaid-[\w-]+$/), FLOW);
  });

  // Positif: selama mermaid.js diunduh dan menggambar, pengguna melihat keterangan, bukan kotak kosong.
  it("shows a loading note until the diagram is drawn", async () => {
    // Arrange
    const { renderer, pending } = deferredRenderer();

    // Act
    render(<MermaidDiagram code={FLOW} render={renderer} />);

    // Assert
    expect(screen.getByText("Memuat diagram...")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    pending.get(FLOW)?.resolve("<svg />");
    await waitFor(() => expect(screen.queryByText("Memuat diagram...")).not.toBeInTheDocument());
  });

  // Negatif: kode yang salah tidak boleh menghilangkan isi jawaban; teks aslinya tampil dengan keterangan.
  it("shows the original code with a note when the code cannot be drawn", async () => {
    // Arrange
    const renderer = vi.fn<MermaidRenderer>().mockRejectedValue(new Error("Parse error"));

    // Act
    const { container } = render(<MermaidDiagram code={"graf TD\n  A --> B"} render={renderer} />);

    // Assert
    expect(await screen.findByText(/Diagram tidak dapat ditampilkan/)).toBeInTheDocument();
    expect(container.querySelector("pre code")?.textContent).toBe("graf TD\n  A --> B");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // Edge: dua diagram di satu jawaban harus punya id SVG berbeda, kalau tidak gayanya saling menimpa.
  it("gives each diagram on the page its own id", async () => {
    // Arrange
    const renderer = vi.fn<MermaidRenderer>().mockResolvedValue("<svg />");

    // Act
    render(
      <>
        <MermaidDiagram code={FLOW} render={renderer} />
        <MermaidDiagram code="pie" render={renderer} />
      </>,
    );

    // Assert
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    const [firstId, secondId] = renderer.mock.calls.map(([id]) => id);
    expect(firstId).not.toBe(secondId);
  });

  // Edge: saat kode berganti, diagram lama tidak boleh tampil untuk kode baru.
  it("draws again and hides the old diagram when the code changes", async () => {
    // Arrange
    const { renderer, pending } = deferredRenderer();
    const { rerender } = render(<MermaidDiagram code={FLOW} render={renderer} />);
    pending.get(FLOW)?.resolve('<svg data-testid="lama" />');
    await screen.findByTestId("lama");

    // Act
    rerender(<MermaidDiagram code="pie" render={renderer} />);

    // Assert
    expect(screen.queryByTestId("lama")).not.toBeInTheDocument();
    expect(screen.getByText("Memuat diagram...")).toBeInTheDocument();

    pending.get("pie")?.resolve('<svg data-testid="baru" />');
    expect(await screen.findByTestId("baru")).toBeInTheDocument();
  });

  // Edge: hasil kode lama yang datang terlambat (sukses atau gagal) tidak menimpa kode yang sekarang.
  it.each(["resolve", "reject"] as const)("ignores a late %s of the previous code", async (late) => {
    // Arrange
    const { renderer, pending } = deferredRenderer();
    const { rerender } = render(<MermaidDiagram code={FLOW} render={renderer} />);
    rerender(<MermaidDiagram code="pie" render={renderer} />);
    pending.get("pie")?.resolve('<svg data-testid="baru" />');
    await screen.findByTestId("baru");

    // Act
    if (late === "resolve") pending.get(FLOW)?.resolve('<svg data-testid="lama" />');
    else pending.get(FLOW)?.reject(new Error("Parse error"));
    await Promise.resolve();

    // Assert
    expect(screen.getByTestId("baru")).toBeInTheDocument();
    expect(screen.queryByTestId("lama")).not.toBeInTheDocument();
    expect(screen.queryByText(/Diagram tidak dapat ditampilkan/)).not.toBeInTheDocument();
  });

  // Edge: render ulang dengan kode yang sama (halaman polling) tidak menggambar ulang.
  it("does not draw again when it re-renders with the same code", async () => {
    // Arrange
    const renderer = vi.fn<MermaidRenderer>().mockResolvedValue("<svg />");
    const { rerender } = render(<MermaidDiagram code={FLOW} render={renderer} />);
    await screen.findByRole("img");

    // Act
    rerender(<MermaidDiagram code={FLOW} render={renderer} />);

    // Assert
    expect(renderer).toHaveBeenCalledTimes(1);
  });
});
