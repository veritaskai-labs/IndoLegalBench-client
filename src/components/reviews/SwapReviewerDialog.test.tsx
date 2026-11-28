import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

import { SwapReviewerDialog } from "./SwapReviewerDialog";

function props(overrides: Partial<Parameters<typeof SwapReviewerDialog>[0]> = {}) {
  return {
    caseCode: "ILB-PT-0142",
    caseTitle: "Sengketa tanah warisan",
    roundNo: 3,
    currentReviewerId: "u1",
    currentReviewerName: "Roben",
    candidates: [
      { id: "u1", name: "Roben" },
      { id: "u9", name: "Aileen" },
    ],
    pending: false,
    error: null,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe("SwapReviewerDialog", () => {
  // Negatif
  it("keeps the next step closed until a reviewer and a reason are given", async () => {
    const user = userEvent.setup();
    render(<SwapReviewerDialog {...props()} />);

    const next = screen.getByRole("button", { name: "Tinjau penggantian" });
    expect(next).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    expect(next).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "   ");
    expect(next).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "Reviewer cuti");
    expect(next).toBeEnabled();
  });

  // Negatif
  it("leaves the current reviewer out of the candidates", () => {
    render(<SwapReviewerDialog {...props()} />);

    expect(screen.getByRole("option", { name: "Aileen" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Roben" })).not.toBeInTheDocument();
  });

  // Positif
  it("asks for confirmation before replacing", async () => {
    const user = userEvent.setup();
    render(<SwapReviewerDialog {...props()} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "Reviewer cuti");
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));

    const dialog = screen.getByRole("dialog", { name: "Konfirmasi penggantian reviewer" });
    for (const label of ["Sengketa tanah warisan", "ILB-PT-0142", "Ronde 3", "Roben", "Aileen", "Reviewer cuti", "Penilaian reviewer lama tidak dihitung"]) {
      expect(dialog).toHaveTextContent(label);
    }
  });

  // Positif
  it("hands the reviewer and the trimmed reason over on confirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SwapReviewerDialog {...props({ onConfirm })} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    await user.type(
      screen.getByRole("textbox", { name: "Alasan penggantian" }),
      "  Reviewer cuti  ",
    );
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));
    await user.click(screen.getByRole("button", { name: "Ganti reviewer" }));

    expect(onConfirm).toHaveBeenCalledWith({
      new_reviewer_id: "u9",
      reason: "Reviewer cuti",
    });
  });

  // corner
  it("goes back to the form from the confirmation", async () => {
    const user = userEvent.setup();
    render(<SwapReviewerDialog {...props()} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "Reviewer cuti");
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));
    await user.click(screen.getByRole("button", { name: "Kembali" }));

    expect(screen.getByRole("combobox", { name: "Reviewer baru" })).toHaveValue("u9");
    expect(screen.getByRole("textbox", { name: "Alasan penggantian" })).toHaveValue("Reviewer cuti");
  });

  // Negatif
  it("shows the message the server sent back", () => {
    render(
      <SwapReviewerDialog
        {...props({ error: "Penulis kasus tidak boleh jadi reviewer." })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Penulis kasus tidak boleh jadi reviewer.",
    );
  });

  // corner
  it("blocks a second confirm while the first one is still running", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SwapReviewerDialog {...props()} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "Reviewer cuti");
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));

    rerender(<SwapReviewerDialog {...props({ pending: true })} />);

    expect(screen.getByRole("button", { name: "Menyimpan…" })).toBeDisabled();
    const event = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByRole("dialog"), event);
    expect(event.defaultPrevented).toBe(true);
  });

  // Dialog modal: Esc memicu event cancel, dan itu harus menutup lewat onClose.
  it("closes when the dialog is cancelled with Escape", () => {
    const onClose = vi.fn();

    render(
      <SwapReviewerDialog
        caseCode="ILB-PT-0142"
        caseTitle="Sengketa tanah warisan"
        roundNo={3}
        currentReviewerId="u1"
        currentReviewerName="Roben"
        candidates={[{ id: "u9", name: "Aileen" }]}
        pending={false}
        error={null}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: false, cancelable: true }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses English chrome and leaves the case title unchanged", () => {
    render(
      <LocaleProvider locale="en">
        <SwapReviewerDialog {...props()} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "Replace reviewer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
  });
});
