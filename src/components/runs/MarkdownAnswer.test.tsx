import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownAnswer } from "./MarkdownAnswer";

describe("MarkdownAnswer (PBI-11 AC8, jawaban mentah dirender dari markdown)", () => {
  // Positive: elemen yang diminta tiket
  it("renders headings, bold and italic text", () => {
    // Arrange
    const source = "## Dasar hukum\n\nIni **penting** dan *perlu dicatat*.";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Dasar hukum" })).toBeInTheDocument();
    expect(screen.getByText("penting").tagName).toBe("STRONG");
    expect(screen.getByText("perlu dicatat").tagName).toBe("EM");
  });

  it("renders bullet and numbered lists as list items", () => {
    // Arrange
    const source = "- satu\n- dua\n\n1. pertama\n2. kedua";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    expect(within(lists[0]).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["satu", "dua"]);
    expect(within(lists[1]).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["pertama", "kedua"]);
  });

  it("renders a table with header and body cells", () => {
    // Arrange
    const source = "| Pasal | Isi |\n| --- | --- |\n| 1 | Ketentuan umum |";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Pasal", "Isi"]);
    expect(screen.getAllByRole("cell").map((td) => td.textContent)).toEqual(["1", "Ketentuan umum"]);
  });

  it("renders a fenced code block inside pre and code", () => {
    // Arrange
    const source = "```\nSELECT 1;\n```";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    const code = container.querySelector("pre code");
    expect(code?.textContent).toBe("SELECT 1;\n");
  });

  it("wraps a table so a wide table scrolls inside its box on a phone", () => {
    // Arrange
    const source = "| a | b |\n| --- | --- |\n| 1 | 2 |";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
  });

  // Negative: sanitasi (XSS)
  it("never creates a script element from raw html", () => {
    // Arrange
    const source = "Halo <script>window.__pwned = true</script> dunia";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("never creates an element with an inline event handler", () => {
    // Arrange
    const source = '<img src="x" onerror="alert(1)"> <b onclick="alert(2)">klik</b>';

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror], [onclick]")).toBeNull();
  });

  it("does not create an iframe from raw html", () => {
    // Arrange
    const source = '<iframe src="https://evil.example"></iframe>';

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("drops a javascript: link target but keeps the link text", () => {
    // Arrange
    const source = "[klik saya](javascript:alert(1))";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(screen.getByText("klik saya")).toBeInTheDocument();
  });

  it("drops a data: link target", () => {
    // Arrange
    const source = "[unduh](data:text/html;base64,PHNjcmlwdD4=)";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector('a[href^="data"]')).toBeNull();
  });

  it("does not load remote images, it shows the alt text instead", () => {
    // Arrange
    const source = "![grafik putusan](https://tracker.example/pixel.png)";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("grafik putusan")).toBeInTheDocument();
  });

  it("renders a blocked link as plain text, not as an anchor that reopens this page", () => {
    // Arrange
    const source = "[klik saya](javascript:alert(1)) dan [proto](//evil.example/x)";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("klik saya").tagName).toBe("SPAN");
    expect(screen.getByText("proto").tagName).toBe("SPAN");
  });

  // Positive: tautan aman
  it("opens an https link in a new tab without leaking the opener", () => {
    // Arrange
    const source = "[JDIH](https://jdih.example/uu-1)";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    const link = screen.getByRole("link", { name: "JDIH" });
    expect(link).toHaveAttribute("href", "https://jdih.example/uu-1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps a mailto link", () => {
    // Arrange
    const source = "[hubungi](mailto:legal@veritask.example)";

    // Act
    render(<MarkdownAnswer source={source} />);

    // Assert
    expect(screen.getByRole("link", { name: "hubungi" })).toHaveAttribute("href", "mailto:legal@veritask.example");
  });

  // Edge
  it("shows raw html tags as literal text so the answer is shown as the AI wrote it", () => {
    // Arrange
    const source = "Isi <nama pihak> dan <br> lalu <script>alert(1)</script> serta 5 < 7";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.textContent).toBe("Isi <nama pihak> dan <br> lalu <script>alert(1)</script> serta 5 < 7");
    expect(container.querySelector("script, br")).toBeNull();
  });

  it("renders plain text without markdown as one paragraph", () => {
    // Arrange
    const source = "Jawaban singkat tanpa markup.";

    // Act
    const { container } = render(<MarkdownAnswer source={source} />);

    // Assert
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.textContent).toBe("Jawaban singkat tanpa markup.");
  });
});
