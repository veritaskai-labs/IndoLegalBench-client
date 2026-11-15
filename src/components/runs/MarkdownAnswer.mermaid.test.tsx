/**
 * Tes MarkdownAnswer untuk blok Mermaid (PBI-22, K-12, SCRUM-295, TC_99): jawaban berisi diagram
 * tampil sebagai gambar di pratinjau, riwayat, dan detail sesi, karena ketiganya memakai komponen ini.
 * Renderer mermaid di-mock (jsdom tidak bisa menggambar SVG); berkas terpisah dari MarkdownAnswer.test
 * supaya mock ini tidak ikut ke tes markdown lain.
 * Label tes: Positif = blok Mermaid jadi diagram, Negatif = yang bukan Mermaid tetap teks, Edge = campuran dan keamanan.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renderMermaid = vi.hoisted(() => vi.fn());

vi.mock("@/lib/markdown/mermaidRenderer", () => ({ renderMermaid }));

import { AnswerFields } from "@/components/manual-runs/AnswerFields";
import { MarkdownAnswer } from "./MarkdownAnswer";

const DIAGRAM = "```mermaid\ngraph TD\n  A[Gugatan] --> B[Putusan]\n```";

describe("MarkdownAnswer mermaid blocks (K-12, SCRUM-295)", () => {
  beforeEach(() => {
    renderMermaid.mockReset();
    renderMermaid.mockResolvedValue('<svg data-testid="gambar" />');
  });

  // Positif: blok ```mermaid diserahkan ke mermaid dan tampil sebagai gambar, bukan teks kode.
  it("renders a mermaid block as a diagram", async () => {
    // Arrange
    const source = `Alur perkara:\n\n${DIAGRAM}`;

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(await screen.findByRole("img", { name: "Diagram Mermaid" })).toContainElement(screen.getByTestId("gambar"));
    expect(renderMermaid).toHaveBeenCalledWith(expect.any(String), "graph TD\n  A[Gugatan] --> B[Putusan]\n");
    expect(container.querySelector("pre")).toBeNull();
    expect(screen.getByText("Alur perkara:")).toBeInTheDocument();
  });

  // Positif: skenario TC_99, tab Pratinjau di form jawaban manual menampilkan diagramnya.
  it("shows the diagram in the answer form preview", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnswerFields
        attemptNo={1}
        draft={{ answerMd: DIAGRAM, platformRefused: false, note: "", obtainedAt: "2026-11-08T10:30" }}
        errors={{}}
        disabled={false}
        onChange={vi.fn()}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Pratinjau" }));

    // Assert
    expect(await screen.findByRole("img", { name: "Diagram Mermaid" })).toBeInTheDocument();
  });

  // Negatif: blok kode bahasa lain tidak pernah dikirim ke mermaid dan tetap tampil sebagai kode.
  it("keeps a non-mermaid code block as code", () => {
    // Arrange
    const source = "```sql\nSELECT 1;\n```";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector("pre code")?.textContent).toBe("SELECT 1;\n");
    expect(renderMermaid).not.toHaveBeenCalled();
  });

  // Negatif: kata `mermaid` sebagai kode sebaris bukan blok diagram.
  it("keeps inline code that mentions mermaid as text", () => {
    // Arrange
    const source = "Pakai format `mermaid` untuk diagram.";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    expect(screen.getByText("mermaid").tagName).toBe("CODE");
    expect(renderMermaid).not.toHaveBeenCalled();
  });

  // Negatif: kode Mermaid yang salah tampil sebagai teks aslinya, isi jawaban tidak hilang.
  it("falls back to the code when mermaid rejects it", async () => {
    // Arrange
    renderMermaid.mockRejectedValue(new Error("Parse error"));
    const source = "```mermaid\nbukan diagram\n```";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(await screen.findByText(/Diagram tidak dapat ditampilkan/)).toBeInTheDocument();
    expect(container.querySelector("pre code")?.textContent).toBe("bukan diagram\n");
  });

  // Edge: satu jawaban dengan dua diagram dan satu blok kode biasa, masing-masing diperlakukan sendiri.
  it("renders every mermaid block in an answer and leaves other blocks alone", async () => {
    // Arrange
    const source = `${DIAGRAM}\n\n\`\`\`python\nprint(1)\n\`\`\`\n\n\`\`\`mermaid\npie\n  "a": 1\n\`\`\``;

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    await waitFor(() => expect(screen.getAllByRole("img", { name: "Diagram Mermaid" })).toHaveLength(2));
    expect(renderMermaid).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll("pre")).toHaveLength(1);
  });

  // Edge (keamanan): HTML mentah di dalam blok diteruskan ke mermaid sebagai teks, tidak pernah jadi elemen di sini.
  it("passes raw html inside a mermaid block to mermaid as text only", async () => {
    // Arrange
    const source = "```mermaid\ngraph TD\n  A[<script>window.__pwned = true</script>]\n```";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    await screen.findByRole("img", { name: "Diagram Mermaid" });
    expect(renderMermaid).toHaveBeenCalledWith(expect.any(String), "graph TD\n  A[<script>window.__pwned = true</script>]\n");
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});
