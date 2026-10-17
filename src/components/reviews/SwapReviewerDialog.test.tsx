import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SwapReviewerDialog } from "./SwapReviewerDialog";

function props(overrides: Partial<Parameters<typeof SwapReviewerDialog>[0]> = {}) {
  return {
    caseCode: "ILB-PT-0142",
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

    const next = screen.getByRole("button", { name: "Lanjut" });
    expect(next).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Reviewer baru"), "u9");
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText("Alasan penggantian"), "   ");
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText("Alasan penggantian"), "Reviewer cuti");
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

    await user.selectOptions(screen.getByLabelText("Reviewer baru"), "u9");
    await user.type(screen.getByLabelText("Alasan penggantian"), "Reviewer cuti");
    await user.click(screen.getByRole("button", { name: "Lanjut" }));

    expect(
      screen.getByText(/Ganti Roben dengan Aileen\?/),
    ).toBeInTheDocument();
  });

  // Positif
  it("hands the reviewer and the trimmed reason over on confirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SwapReviewerDialog {...props({ onConfirm })} />);

    await user.selectOptions(screen.getByLabelText("Reviewer baru"), "u9");
    await user.type(
      screen.getByLabelText("Alasan penggantian"),
      "  Reviewer cuti  ",
    );
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Ya, ganti reviewer" }));

    expect(onConfirm).toHaveBeenCalledWith({
      new_reviewer_id: "u9",
      reason: "Reviewer cuti",
    });
  });

  // corner
  it("goes back to the form from the confirmation", async () => {
    const user = userEvent.setup();
    render(<SwapReviewerDialog {...props()} />);

    await user.selectOptions(screen.getByLabelText("Reviewer baru"), "u9");
    await user.type(screen.getByLabelText("Alasan penggantian"), "Reviewer cuti");
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Kembali" }));

    expect(screen.getByLabelText("Reviewer baru")).toHaveValue("u9");
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

    await user.selectOptions(screen.getByLabelText("Reviewer baru"), "u9");
    await user.type(screen.getByLabelText("Alasan penggantian"), "Reviewer cuti");
    await user.click(screen.getByRole("button", { name: "Lanjut" }));

    rerender(<SwapReviewerDialog {...props({ pending: true })} />);

    expect(screen.getByRole("button", { name: "Menyimpan…" })).toBeDisabled();
  });
});