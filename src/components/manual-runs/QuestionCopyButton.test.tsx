import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionCopyButton } from "./QuestionCopyButton";

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});

describe("QuestionCopyButton (AC3)", () => {
  // Positive: only the question text is copied, nothing added.
  it("copies exactly the question text", async () => {
    // Arrange
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const question = "Apakah PHK sepihak sah?\n\nJelaskan dasar hukumnya.";
    render(<QuestionCopyButton question={question} caseCode="KASUS-001" />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Salin pertanyaan KASUS-001" }));

    // Assert
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(question);
  });

  // Positive: the user sees that it worked.
  it("shows that the question was copied", async () => {
    // Arrange
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    render(<QuestionCopyButton question="Pertanyaan" caseCode="KASUS-001" />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Salin pertanyaan KASUS-001" }));

    // Assert
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Tersalin"));
  });

  // Negative: a blocked clipboard is reported instead of failing silently.
  it("tells the user when the clipboard is not available", async () => {
    // Arrange
    stubClipboard(vi.fn().mockRejectedValue(new Error("ditolak")));
    render(<QuestionCopyButton question="Pertanyaan" caseCode="KASUS-001" />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Salin pertanyaan KASUS-001" }));

    // Assert
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gagal menyalin. Pilih teks pertanyaan lalu salin manual."));
  });

  // Edge: the label is the one in the ticket, and there is no copy all or copy and continue.
  it("offers a single copy action per case", () => {
    // Arrange
    render(<QuestionCopyButton question="Pertanyaan" caseCode="KASUS-001" />);

    // Act
    const buttons = screen.getAllByRole("button");

    // Assert
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("Salin pertanyaan");
    expect(screen.queryByText(/salin semua|salin dan lanjut/i)).not.toBeInTheDocument();
  });
});
