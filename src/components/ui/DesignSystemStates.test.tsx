import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { Tabs } from "./Tabs";

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog<void>>> = {}) {
  return render(
    <ConfirmDialog
      title="Hapus suite?"
      confirmLabel="Hapus"
      busyLabel="Menghapus…"
      onConfirm={vi.fn().mockResolvedValue(undefined)}
      errorMessage={() => "gagal"}
      onDone={() => {}}
      onClose={() => {}}
      {...props}
    >
      <p>Suite tidak bisa dikembalikan.</p>
    </ConfirmDialog>,
  );
}

describe("ConfirmDialog tone", () => {
  it("styles the confirm button as the primary action by default", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Hapus" })).toHaveClass("bg-ink");
  });

  it("styles the confirm button in danger red for a risky action", () => {
    renderDialog({ destructive: true });

    expect(screen.getByRole("button", { name: "Hapus" })).toHaveClass("bg-danger");
  });

  it("keeps the dismiss button neutral even for a risky action", () => {
    renderDialog({ destructive: true });

    expect(screen.getByRole("button", { name: "Batal" })).toHaveClass("border-line");
  });

  it("still confirms through the shared button", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog({ destructive: true, onConfirm });

    await userEvent.click(screen.getByRole("button", { name: "Hapus" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("state screens use the prototype tokens", () => {
  it("shows the empty state action as the primary button", () => {
    render(<EmptyState title="Belum ada suite" action={{ label: "Buat suite", onClick: () => {} }} />);

    expect(screen.getByRole("button", { name: "Buat suite" })).toHaveClass("bg-ink", "h-9");
  });

  it("shows the retry action of a failed load and calls it", async () => {
    const onRetry = vi.fn();
    render(<ErrorState variant="card" message="Server tidak merespons." onRetry={onRetry} />);

    const retry = screen.getByRole("button", { name: "Coba lagi" });
    await userEvent.click(retry);

    expect(retry).toHaveClass("bg-ink");
    expect(screen.getByRole("alert")).toHaveTextContent("Server tidak merespons.");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("announces loading with a labelled status and an ink spinner", () => {
    const { container } = render(<LoadingState label="Memuat suite…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Memuat suite…");
    expect(container.querySelector(".animate-spin")).toHaveClass("border-t-ink");
  });

  it("marks the active tab with the ink underline", () => {
    render(
      <Tabs
        tabs={[
          { id: "a", label: "Satu" },
          { id: "b", label: "Dua" },
        ]}
        active="a"
        onChange={() => {}}
        label="Bagian"
        idPrefix="t"
      />,
    );

    expect(screen.getByRole("tab", { name: "Satu" })).toHaveClass("border-ink", "text-ink");
    expect(screen.getByRole("tab", { name: "Dua" })).toHaveClass("border-transparent");
  });
});
