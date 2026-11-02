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
        "Jenis pengukuran tidak bisa diubah lagi setelah produk punya riwayat pengukuran. Uji koneksi tidak dihitung.",
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
  it("warns that the values of the old type will be lost when the type is switched", () => {
    render(
      <SaveTypeWarningDialog
        measurementType="manual"
        switching
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Isian jenis sebelumnya akan hilang setelah disimpan."),
    ).toBeInTheDocument();
  });
  it("uses the native modal when the browser supports it", () => {
    const original = HTMLDialogElement.prototype.showModal;
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.showModal = showModal;

    render(
      <SaveTypeWarningDialog
        measurementType="manual"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(showModal).toHaveBeenCalled();
    HTMLDialogElement.prototype.showModal = original;
  });

  it("sits in the middle of the screen, not in the top-left corner", () => {
    // SCRUM-204 E2E F1. Tailwind's preflight sets every margin to 0, which removes the
    // browser's margin: auto that centres a modal <dialog>. jsdom has no layout, so the
    // class that restores it is the observable part.
    render(
      <SaveTypeWarningDialog
        measurementType="manual"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("m-auto");
  });
});
