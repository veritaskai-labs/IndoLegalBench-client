import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AsyncResource } from "@/hooks/useAsyncResource";
import { gradedRunItem } from "@/test/gradingFixtures";
import type { GradedRunListItem } from "@/types/grading";
import { GradedSessionList } from "./GradedSessionList";

function renderList(state: AsyncResource<GradedRunListItem[]>, reload = vi.fn()) {
  render(<GradedSessionList sessions={{ ...state, reload }} />);
  return reload;
}

describe("GradedSessionList (PBI-22 AC9, Laporan: one row per grading run)", () => {
  it("shows one row per run with its product, LLM judge, rubric version, time and status", () => {
    renderList({ status: "ready", data: [gradedRunItem()] });

    const table = screen.getByRole("table", { name: "Hasil penilaian per run" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Sesi",
      "Produk",
      "LLM judge",
      "Versi rubrik",
      "Dinilai",
      "Status",
    ]);
    const row = within(table).getByRole("row", { name: /Uji Coba Produk A/ });
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Uji Coba Produk A",
      "Produk Uji A",
      "Judge Alfa · alfa-2",
      "v1",
      "07 Nov 2026, 10.00 WIB",
      "Terbaru",
    ]);
  });

  // A re-grade adds a row; the old row stays so the two judges can be told apart.
  it("shows two runs of one session as two rows, each with its own judge", () => {
    renderList({
      status: "ready",
      data: [
        gradedRunItem({ grading_run_id: "run-2", rubric_version: "v2", judge: { judge_provider_id: "j-b", name: "Judge Beta", model_version: "beta-1" } }),
        gradedRunItem({ grading_run_id: "run-1", is_latest: false }),
      ],
    });

    const rows = screen.getAllByRole("row", { name: /Uji Coba Produk A/ });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Judge Beta · beta-1");
    expect(rows[0]).toHaveTextContent("v2");
    expect(rows[1]).toHaveTextContent("Judge Alfa · alfa-2");
    expect(rows[1]).toHaveTextContent("Sebelumnya");
  });

  // Clicking a row opens that run, not always the latest one.
  it("links each row to its own run", () => {
    renderList({
      status: "ready",
      data: [gradedRunItem({ grading_run_id: "run-2" }), gradedRunItem({ grading_run_id: "run-1", is_latest: false })],
    });

    const links = screen.getAllByRole("link", { name: "Uji Coba Produk A" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/reports/sessions/s-1/runs/run-2",
      "/reports/sessions/s-1/runs/run-1",
    ]);
  });

  // Security: both ids come from the server; they are encoded so they cannot change the path.
  it("encodes the session id and the run id in the link", () => {
    renderList({ status: "ready", data: [gradedRunItem({ session_id: "a/b?c", grading_run_id: "x#y" })] });

    expect(screen.getByRole("link", { name: "Uji Coba Produk A" })).toHaveAttribute("href", "/reports/sessions/a%2Fb%3Fc/runs/x%23y");
  });

  // Edge: runs graded before the judge was recorded have no judge.
  it("shows a dash for a run without a judge", () => {
    renderList({ status: "ready", data: [gradedRunItem({ judge: null })] });

    const row = screen.getByRole("row", { name: /Uji Coba Produk A/ });
    expect(within(row).getAllByRole("cell")[2]).toHaveTextContent("–");
  });

  it("marks a run that could not be graded", () => {
    renderList({ status: "ready", data: [gradedRunItem({ status: "failed", is_latest: true })] });

    const row = screen.getByRole("row", { name: /Uji Coba Produk A/ });
    expect(within(row).getAllByRole("cell")[5]).toHaveTextContent("Gagal dinilai");
  });

  it("says so when no run has been graded yet", () => {
    renderList({ status: "ready", data: [] });

    const table = screen.getByRole("table", { name: "Hasil penilaian per run" });
    expect(table).toHaveTextContent("Belum ada sesi yang dinilai.");
    expect(within(table).getByText("Belum ada sesi yang dinilai.").closest("td")).toHaveAttribute("colspan", "6");
  });

  // Mobile: the table scrolls sideways instead of squeezing the columns.
  it("lets the table scroll sideways on a narrow screen", () => {
    renderList({ status: "ready", data: [gradedRunItem()] });

    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
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
