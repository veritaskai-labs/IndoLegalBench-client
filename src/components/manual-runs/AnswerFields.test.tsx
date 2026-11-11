import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnswerDraft } from "@/lib/runs/manualAnswerRules";
import { AnswerFields } from "./AnswerFields";

function draft(overrides: Partial<AnswerDraft> = {}): AnswerDraft {
  return { answerMd: "", platformRefused: false, note: "", obtainedAt: "2026-11-08T10:30", ...overrides };
}

function setup(props: Partial<Parameters<typeof AnswerFields>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <AnswerFields attemptNo={2} draft={draft()} errors={{}} disabled={false} onChange={onChange} {...props} />,
  );
  return { onChange };
}

describe("AnswerFields answer box (AC4)", () => {
  // Positive: the box is labelled by attempt and passes the typed text on.
  it("passes the pasted text to onChange", () => {
    // Arrange
    const { onChange } = setup();

    // Act
    fireEvent.change(screen.getByRole("textbox", { name: "Jawaban Percobaan 2" }), {
      target: { value: "Jawaban **tebal**" },
    });

    // Assert
    expect(onChange).toHaveBeenCalledWith("answerMd", "Jawaban **tebal**");
  });

  // Edge: no character limit, so a 30 page answer can be pasted.
  it("has no character limit", () => {
    // Arrange
    setup();

    // Act
    const box = screen.getByRole("textbox", { name: "Jawaban Percobaan 2" });

    // Assert
    expect(box).not.toHaveAttribute("maxlength");
  });

  // Negative: a read-only box cannot be edited.
  it("is read-only when editing is not allowed", () => {
    // Arrange
    setup({ disabled: true, draft: draft({ answerMd: "Tersimpan" }) });

    // Act
    const box = screen.getByRole("textbox", { name: "Jawaban Percobaan 2" });

    // Assert
    expect(box).toHaveAttribute("readonly");
    expect(box).toHaveValue("Tersimpan");
  });

  // Negative: the validation message is shown and linked to the box.
  it("shows the answer error and marks the box invalid", () => {
    // Arrange
    setup({ errors: { answer: "Jawaban tidak boleh kosong." } });

    // Act
    const box = screen.getByRole("textbox", { name: "Jawaban Percobaan 2" });

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Jawaban tidak boleh kosong.");
    expect(box).toHaveAttribute("aria-invalid", "true");
  });
});

describe("AnswerFields preview (AC4)", () => {
  // Positive: tables and links are kept in the preview.
  it("renders a table and a link in the preview", async () => {
    // Arrange
    setup({ draft: draft({ answerMd: "| a | b |\n|---|---|\n| 1 | 2 |\n\n[Sumber](https://contoh.id/uu)" }) });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Pratinjau" }));

    // Assert
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sumber" })).toHaveAttribute("href", "https://contoh.id/uu");
    expect(screen.queryByRole("textbox", { name: "Jawaban Percobaan 2" })).not.toBeInTheDocument();
  });

  // Negative: an unsafe link from the platform is not clickable.
  it("does not make a javascript link clickable", async () => {
    // Arrange
    setup({ draft: draft({ answerMd: "[klik](javascript:alert(1))" }) });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Pratinjau" }));

    // Assert
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Edge: nothing to preview yet.
  it("says so when there is nothing to preview", async () => {
    // Arrange
    setup();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Pratinjau" }));

    // Assert
    expect(screen.getByText("Belum ada isi untuk dipratinjau.")).toBeInTheDocument();
  });

  // Positive: back to writing keeps the text.
  it("returns to the box with the same text", async () => {
    // Arrange
    setup({ draft: draft({ answerMd: "Isi" }) });
    await userEvent.click(screen.getByRole("button", { name: "Pratinjau" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Tulis" }));

    // Assert
    expect(screen.getByRole("textbox", { name: "Jawaban Percobaan 2" })).toHaveValue("Isi");
  });
});

describe("AnswerFields refusal (AC6)", () => {
  // Positive: ticking the option is reported, and the note field appears instead of the answer box.
  it("reports the refusal option", async () => {
    // Arrange
    const { onChange } = setup();

    // Act
    await userEvent.click(screen.getByRole("checkbox", { name: "Platform menolak menjawab" }));

    // Assert
    expect(onChange).toHaveBeenCalledWith("platformRefused", true);
  });

  it("shows the note field and hides the answer box when the platform refused", () => {
    // Arrange
    setup({ draft: draft({ platformRefused: true, note: "Di luar cakupan" }) });

    // Act
    const note = screen.getByRole("textbox", { name: "Catatan penolakan Percobaan 2" });

    // Assert
    expect(note).toHaveValue("Di luar cakupan");
    expect(screen.queryByRole("textbox", { name: "Jawaban Percobaan 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pratinjau" })).not.toBeInTheDocument();
  });

  it("passes the note on and shows its error", () => {
    // Arrange
    const { onChange } = setup({
      draft: draft({ platformRefused: true }),
      errors: { note: "Catatan wajib diisi bila platform menolak menjawab." },
    });

    // Act
    fireEvent.change(screen.getByRole("textbox", { name: "Catatan penolakan Percobaan 2" }), {
      target: { value: "Ditolak" },
    });

    // Assert
    expect(onChange).toHaveBeenCalledWith("note", "Ditolak");
    expect(screen.getByRole("alert")).toHaveTextContent("Catatan wajib diisi");
  });

  // Negative: the option cannot be changed on a read-only box.
  it("disables the refusal option when read-only", () => {
    // Arrange
    setup({ disabled: true });

    // Act
    const option = screen.getByRole("checkbox", { name: "Platform menolak menjawab" });

    // Assert
    expect(option).toBeDisabled();
  });
});

describe("AnswerFields time (AC7)", () => {
  // Positive: the time field shows the draft time and passes changes on.
  it("shows the time and reports a change", () => {
    // Arrange
    const { onChange } = setup();
    const field = screen.getByLabelText("Tanggal dan jam jawaban diperoleh (WIB)");

    // Act
    fireEvent.change(field, { target: { value: "2026-11-09T08:15" } });

    // Assert
    expect(field).toHaveValue("2026-11-08T10:30");
    expect(onChange).toHaveBeenCalledWith("obtainedAt", "2026-11-09T08:15");
  });

  // Negative: invalid time message.
  it("shows the time error", () => {
    // Arrange
    setup({ errors: { obtainedAt: "Tanggal dan jam jawaban diperoleh tidak valid." } });

    // Act
    const field = screen.getByLabelText("Tanggal dan jam jawaban diperoleh (WIB)");

    // Assert
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("tidak valid");
  });

  it("disables the time field when read-only", () => {
    // Arrange
    setup({ disabled: true });

    // Act
    const field = screen.getByLabelText("Tanggal dan jam jawaban diperoleh (WIB)");

    // Assert
    expect(field).toBeDisabled();
  });
});
