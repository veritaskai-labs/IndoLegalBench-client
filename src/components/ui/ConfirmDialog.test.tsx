import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

type Props = Partial<Parameters<typeof ConfirmDialog>[0]>;

function renderDialog(props: Props = {}) {
  const handlers = {
    onConfirm: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onDone: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <ConfirmDialog
      title="Arsipkan sesi?"
      confirmLabel="Arsipkan"
      busyLabel="Mengarsipkan…"
      errorMessage={() => "Gagal. Coba lagi."}
      {...handlers}
      {...props}
    >
      <p>Datanya tidak dihapus.</p>
    </ConfirmDialog>,
  );
  return { ...handlers, ...props, dialog: within(screen.getByRole("dialog", { name: "Arsipkan sesi?" })) };
}

function pressEscape() {
  const event = new Event("cancel", { cancelable: true });
  act(() => {
    screen.getByRole("dialog").dispatchEvent(event);
  });
  return event;
}

describe("ConfirmDialog (shared by Arsipkan, Batalkan and Terima apa adanya)", () => {
  it("names the dialog by its title and shows the body", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText("Datanya tidak dihapus.")).toBeInTheDocument();
  });

  it("runs the action once, then hands its result on", async () => {
    const user = userEvent.setup();
    const { dialog, onDone, onClose, onConfirm } = renderDialog({
      onConfirm: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: "s-1" }),
    });

    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: "s-1" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  // Negative
  it("closes on Batal without running the action", async () => {
    const user = userEvent.setup();
    const { dialog, onConfirm, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("closes on Escape through the page state, not the browser", () => {
    const { onConfirm, onClose } = renderDialog();

    const event = pressEscape();

    expect(event.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // Corner: a double click or Escape while the request runs must not send twice or drop its result.
  it("locks both buttons and Escape while the action runs", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { dialog, onClose, onDone } = renderDialog({ onConfirm });

    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));
    await user.click(dialog.getByRole("button", { name: "Mengarsipkan…" }));
    pressEscape();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(dialog.getByRole("button", { name: "Mengarsipkan…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  // Negative: the server refused; the reason stays in the dialog and closing asks for a reload.
  it("shows why it failed and tells the caller on close that it failed", async () => {
    const user = userEvent.setup();
    const failure = new Error("409");
    const errorMessage = vi.fn(() => "Sesi ini sudah diarsipkan.");
    const { dialog, onDone, onClose } = renderDialog({
      onConfirm: vi.fn().mockRejectedValue(failure),
      errorMessage,
    });

    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi ini sudah diarsipkan.");
    expect(errorMessage).toHaveBeenCalledWith(failure);
    expect(onDone).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  // Edge: a network blip; the second try clears the old message and succeeds.
  it("lets the user try again after a failure", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<() => Promise<void>>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(undefined);
    const { dialog, onDone } = renderDialog({ onConfirm });

    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));
    await dialog.findByRole("alert");
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Batalkan sesi: "Batal" next to "Batalkan sesi" reads like the same action.
  it("names the dismiss button as the caller asks, and keeps Tutup after a failure", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog({ dismissLabel: "Kembali", onConfirm: vi.fn().mockRejectedValue(new Error("x")) });

    expect(dialog.getByRole("button", { name: "Kembali" })).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));
    expect(await dialog.findByRole("button", { name: "Tutup" })).toBeInTheDocument();
  });

  // Edge: Terima apa adanya keeps the button off until a reason is written.
  it("keeps the action off while the caller says it cannot run yet", async () => {
    const user = userEvent.setup();
    const { dialog, onConfirm } = renderDialog({ confirmDisabled: true });

    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    expect(dialog.getByRole("button", { name: "Arsipkan" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // jsdom has no showModal; a real browser opens it as a modal (focus trap, Escape).
  it("opens with showModal when the browser has it", () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { value: showModal, configurable: true });
    try {
      renderDialog();

      expect(showModal).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
  });
});
