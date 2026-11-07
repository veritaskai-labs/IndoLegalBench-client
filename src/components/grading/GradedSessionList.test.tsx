import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AsyncResource } from "@/hooks/useAsyncResource";
import { gradedSessionItem } from "@/test/gradingFixtures";
import type { GradedSessionListItem } from "@/types/grading";
import { GradedSessionList } from "./GradedSessionList";

function renderList(state: AsyncResource<GradedSessionListItem[]>, reload = vi.fn()) {
  render(<GradedSessionList sessions={{ ...state, reload }} />);
  return reload;
}

describe("GradedSessionList (PBI-14 AC8, Laporan list)", () => {
  it("shows one row per session with its product, finish time and rubric version", () => {
    renderList({
      status: "ready",
      data: [
        gradedSessionItem(),
        gradedSessionItem({ session_id: "s-2", label: "Uji Coba Produk B", product_name: "Produk Uji B", rubric_version: "v2" }),
      ],
    });

    const table = screen.getByRole("table", { name: "Sesi yang sudah dinilai" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Sesi",
      "Produk",
      "Selesai",
      "Versi rubrik",
    ]);
    const row = within(table).getByRole("row", { name: /Uji Coba Produk A/ });
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Uji Coba Produk A",
      "Produk Uji A",
      "07 Nov 2026, 10.00 WIB",
      "v1",
    ]);
    expect(within(table).getByRole("row", { name: /Uji Coba Produk B/ })).toHaveTextContent("v2");
  });

  // The label opens the read-only results page for that session.
  it("links each session to its results page under Laporan", () => {
    renderList({ status: "ready", data: [gradedSessionItem({ session_id: "s-1" })] });

    expect(screen.getByRole("link", { name: "Uji Coba Produk A" })).toHaveAttribute("href", "/reports/sessions/s-1");
  });

  // Security: the id comes from the server; it is encoded so it cannot change the path.
  it("encodes the session id in the link", () => {
    renderList({ status: "ready", data: [gradedSessionItem({ session_id: "a/b?c" })] });

    expect(screen.getByRole("link", { name: "Uji Coba Produk A" })).toHaveAttribute("href", "/reports/sessions/a%2Fb%3Fc");
  });

  // Edge: both fields are nullable in the contract.
  it("shows a dash for a missing finish time or rubric version", () => {
    renderList({ status: "ready", data: [gradedSessionItem({ finished_at: null, rubric_version: null })] });

    const row = screen.getByRole("row", { name: /Uji Coba Produk A/ });
    expect(within(row).getAllByRole("cell").slice(2).map((cell) => cell.textContent)).toEqual(["–", "–"]);
  });

  it("says so when no session has been graded yet", () => {
    renderList({ status: "ready", data: [] });

    const table = screen.getByRole("table", { name: "Sesi yang sudah dinilai" });
    expect(table).toHaveTextContent("Belum ada sesi yang dinilai.");
    expect(within(table).getByText("Belum ada sesi yang dinilai.").closest("td")).toHaveAttribute("colspan", "4");
  });

  it("shows a loading state while the list loads", () => {
    renderList({ status: "loading" });

    expect(screen.getByRole("status")).toHaveTextContent("Memuat…");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains an error and lets the user try again", async () => {
    const user = userEvent.setup();
    const reload = renderList({ status: "error", message: "Gagal memuat daftar sesi yang dinilai. Coba lagi." });

    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat daftar sesi yang dinilai. Coba lagi.");
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
