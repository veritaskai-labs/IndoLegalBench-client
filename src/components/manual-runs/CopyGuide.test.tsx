import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CopyGuide } from "./CopyGuide";

describe("CopyGuide (AC3)", () => {
  // Positive: how to ask the platform, as in the ticket.
  it("explains how to ask the platform", () => {
    // Arrange / Act
    render(<CopyGuide />);

    // Assert
    expect(screen.getByRole("heading", { name: "Panduan mengisi jawaban" })).toBeInTheDocument();
    expect(screen.getByText(/percakapan baru untuk setiap percobaan/i)).toBeInTheDocument();
    expect(screen.getByText(/teks pertanyaan persis sama/i)).toBeInTheDocument();
  });

  // Positive: how to copy the question and the answer.
  it("explains how to copy the question and paste the whole answer", () => {
    // Arrange / Act
    render(<CopyGuide />);

    // Assert
    expect(screen.getByText(/tombol "Salin pertanyaan"/i)).toBeInTheDocument();
    expect(screen.getByText(/seluruh isi jawaban platform apa adanya/i)).toBeInTheDocument();
    expect(screen.getByText(/penafian dan saran lanjutan/i)).toBeInTheDocument();
  });

  // Edge: the steps are an ordered list so the order is clear to assistive tech too.
  it("shows the steps as an ordered list", () => {
    // Arrange / Act
    render(<CopyGuide />);

    // Assert
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(4);
  });

  // Negative: no template download or upload, no extra instruction added to the question (AC3).
  it("does not offer a template download or upload", () => {
    // Arrange / Act
    render(<CopyGuide />);

    // Assert
    expect(screen.queryByText(/unduh|unggah template|template/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
