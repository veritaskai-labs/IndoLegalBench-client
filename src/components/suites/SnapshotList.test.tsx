import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SnapshotsState } from "@/hooks/useSnapshots";
import { makeSnapshotPage, makeSnapshotSummary } from "@/test/snapshotFixtures";
import { SnapshotList } from "./SnapshotList";

const noop = () => undefined;

function renderList(state: SnapshotsState, overrides: Partial<Parameters<typeof SnapshotList>[0]> = {}) {
  return render(
    <SnapshotList
      state={state}
      page={1}
      onPageChange={noop}
      onRetry={noop}
      selectedId={null}
      onSelect={noop}
      {...overrides}
    />,
  );
}

describe("SnapshotList", () => {
  // Positive: AC5, one row per timestamp.
  it("lists each snapshot by its time with the author and the number of cases", () => {
    // Arrange
    const page = makeSnapshotPage([
      makeSnapshotSummary({ id: "s2", created_at: "2026-10-04T08:30:00Z", author: { id: "u2", name: "Adra" }, case_count: 5 }),
      makeSnapshotSummary({ id: "s1", created_at: "2026-10-03T07:05:00Z", case_count: 2 }),
    ]);

    // Act
    renderList({ status: "ready", page });

    // Assert
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Snapshot 04 Okt 2026, 15.30 WIB")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Oleh Adra · 5 kasus")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Snapshot 03 Okt 2026, 14.05 WIB")).toBeInTheDocument();
  });

  it("asks to open the contents of the chosen snapshot", async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderList({ status: "ready", page: makeSnapshotPage([makeSnapshotSummary({ id: "s1" })]) }, { onSelect });

    // Act
    await user.click(screen.getByRole("button", { name: "Lihat isi Snapshot 03 Okt 2026, 14.05 WIB" }));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("marks the open snapshot and offers to close it", () => {
    // Arrange / Act
    renderList(
      { status: "ready", page: makeSnapshotPage([makeSnapshotSummary({ id: "s1" })]) },
      { selectedId: "s1" },
    );

    // Assert
    const button = screen.getByRole("button", { name: "Tutup isi Snapshot 03 Okt 2026, 14.05 WIB" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveTextContent("Tutup isi");
  });

  // States
  it("shows a loading state", () => {
    // Arrange / Act
    renderList({ status: "loading" });

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Memuat snapshot…");
  });

  it("shows an empty state when the suite has no snapshot", () => {
    // Arrange / Act
    renderList({ status: "ready", page: makeSnapshotPage([]) });

    // Assert
    expect(screen.getByText("Belum ada snapshot")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the error with a retry button", async () => {
    // Arrange
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderList({ status: "error", message: "Gagal memuat daftar snapshot." }, { onRetry });

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat daftar snapshot.");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Paging
  it("shows no paging when everything fits on one page", () => {
    // Arrange / Act
    renderList({ status: "ready", page: makeSnapshotPage([makeSnapshotSummary()]) });

    // Assert
    expect(screen.queryByRole("navigation", { name: "Halaman snapshot" })).not.toBeInTheDocument();
  });

  it("pages forward and backward and disables the buttons at the ends", async () => {
    // Arrange
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const state: SnapshotsState = {
      status: "ready",
      page: makeSnapshotPage([makeSnapshotSummary()], { total: 25, page: 2 }),
    };
    renderList(state, { page: 2, onPageChange });

    // Act
    await user.click(screen.getByRole("button", { name: "Berikutnya" }));
    await user.click(screen.getByRole("button", { name: "Sebelumnya" }));

    // Assert
    expect(screen.getByText("Halaman 2 dari 3")).toBeInTheDocument();
    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
  });

  // Edge: the page count follows the size the server answered with, not a number the client assumes.
  it("counts pages with the size the server used", () => {
    // Arrange
    const state: SnapshotsState = {
      status: "ready",
      page: makeSnapshotPage([makeSnapshotSummary()], { total: 11, size: 5 }),
    };

    // Act
    renderList(state, { page: 1 });

    // Assert
    expect(screen.getByText("Halaman 1 dari 3")).toBeInTheDocument();
  });

  it("disables Sebelumnya on the first page and Berikutnya on the last", () => {
    // Arrange
    const state: SnapshotsState = {
      status: "ready",
      page: makeSnapshotPage([makeSnapshotSummary()], { total: 11 }),
    };

    // Act
    const disabled = () =>
      ["Sebelumnya", "Berikutnya"].map(
        (name) => (screen.getByRole("button", { name }) as HTMLButtonElement).disabled,
      );
    const { rerender } = renderList(state, { page: 1 });
    const first = disabled();
    rerender(
      <SnapshotList state={state} page={2} onPageChange={noop} onRetry={noop} selectedId={null} onSelect={noop} />,
    );
    const last = disabled();

    // Assert
    expect(first).toEqual([true, false]);
    expect(last).toEqual([false, true]);
  });
});
