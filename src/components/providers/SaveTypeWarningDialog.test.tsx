import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveTypeWarningDialog } from "./SaveTypeWarningDialog";

describe("SaveTypeWarningDialog (AC3)", () => {
  it("names the type and says it cannot be changed later", () => {
    render(
      <SaveTypeWarningDialog
        measurementType="manual"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Simpan sebagai produk Manual?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Jenis pengukuran tidak bisa diubah setelah produk tersimpan.",
      ),
    ).toBeInTheDocument();
  });

  it("names the automatic type when that is the choice", () => {
    render(
      <SaveTypeWarningDialog
        measurementType="automatic"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Simpan sebagai produk Otomatis?" }),
    ).toBeInTheDocument();
  });

  it("saves when the admin confirms", async () => {
    const onConfirm = vi.fn();
    render(
      <SaveTypeWarningDialog
        measurementType="automatic"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("goes back to the form when the admin cancels", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <SaveTypeWarningDialog
        measurementType="manual"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});