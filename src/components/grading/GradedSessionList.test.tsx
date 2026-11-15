import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatRupiah } from "@/lib/providers/format";
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
      "Biaya pengukuran",
      "Biaya penilaian",
      "Total",
    ]);
    const row = within(table).getByRole("row", { name: /Uji Coba Produk A/ });
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Uji Coba Produk A",
      "Produk Uji A",
      "Judge Alfa · alfa-2",
      "v1",
      "07 Nov 2026, 10.00 WIB",
      "Terbaru",
      formatRupiah("0.00"),
      formatRupiah("1500.00"),
      formatRupiah("1500.00"),
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
    expect(within(table).getByText("Belum ada sesi yang dinilai.").closest("td")).toHaveAttribute("colspan", "9");
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

describe("GradedSessionList cost columns (SCRUM-299)", () => {
  function cellsOf(name: RegExp) {
    return within(screen.getByRole("row", { name })).getAllByRole("cell");
  }

  // Whole rupiah, same formatter as the measurement summary. Sen round (15,50 → Rp 16).
  it("shows measurement, judge, and total cost in whole rupiah", () => {
    renderList({
      status: "ready",
      data: [
        gradedRunItem({
          measurement_cost_idr: "12500.40",
          judge_cost_idr: "3200.50",
          total_cost_idr: "15700.90",
        }),
      ],
    });

    const cells = cellsOf(/Uji Coba Produk A/);
    expect(cells[6].textContent).toBe(formatRupiah("12500.40"));
    expect(cells[7].textContent).toBe(formatRupiah("3200.50"));
    expect(cells[8].textContent).toBe(formatRupiah("15700.90"));
    expect(cells.map((cell) => cell.textContent).join(" ")).not.toMatch(/estimasi/i);
  });

  // A manual session stores 0.00 on purpose. That is Rupiah, not the empty mark.
  it("shows Rp 0 for a manual session measurement cost of 0.00", () => {
    renderList({
      status: "ready",
      data: [
        gradedRunItem({
          session_type: "manual",
          label: "Pencatatan manual Produk B",
          measurement_cost_idr: "0.00",
          judge_cost_idr: "1800.00",
          total_cost_idr: "1800.00",
        }),
      ],
    });

    const cells = cellsOf(/Pencatatan manual Produk B/);
    expect(cells[6].textContent).toBe(formatRupiah("0.00"));
    expect(cells[7].textContent).toBe(formatRupiah("1800.00"));
    expect(cells[8].textContent).toBe(formatRupiah("1800.00"));
  });

  // A missing side stays a dash, and the total stays a dash so it is not shown as Rp 0.
  it("shows a dash when a cost is missing", () => {
    renderList({
      status: "ready",
      data: [
        gradedRunItem({
          label: "Uji Produk C",
          measurement_cost_idr: null,
          judge_cost_idr: "2500.00",
          total_cost_idr: null,
        }),
      ],
    });

    const cells = cellsOf(/Uji Produk C/);
    expect(cells[6].textContent).toBe("–");
    expect(cells[7].textContent).toBe(formatRupiah("2500.00"));
    expect(cells[8].textContent).toBe("–");
  });

  it("pins the session name while the rest of the table scrolls", async () => {
    renderList({ status: "ready", data: [gradedRunItem({ label: "Uji kurs tinggi" })] });

    const table = screen.getByRole("table", { name: "Hasil penilaian per run" });
    const header = within(table).getByRole("columnheader", { name: "Sesi" });
    const session = within(screen.getByRole("row", { name: /Uji kurs tinggi/ })).getAllByRole("cell")[0];
    expect(header).toHaveClass("md:sticky", "md:left-0", "md:whitespace-nowrap", "md:bg-slate-50");
    expect(session).toHaveClass("md:sticky", "md:left-0", "md:whitespace-nowrap", "md:bg-white");
    expect(header.className).not.toContain("shadow");
    expect(session.className).not.toContain("shadow");

    const scroller = table.parentElement;
    if (!scroller) throw new Error("missing scroller");
    Object.defineProperty(scroller, "scrollLeft", { value: 120, configurable: true });
    scroller.dispatchEvent(new Event("scroll"));

    await waitFor(() => expect(header.className).toContain("shadow"));
    expect(session.className).toContain("shadow");
  });

  it("right-aligns the three cost columns", () => {
    renderList({ status: "ready", data: [gradedRunItem()] });

    const table = screen.getByRole("table", { name: "Hasil penilaian per run" });
    for (const name of ["Biaya pengukuran", "Biaya penilaian", "Total"]) {
      expect(within(table).getByRole("columnheader", { name })).toHaveClass("text-right");
    }
    for (const cell of cellsOf(/Uji Coba Produk A/).slice(6)) {
      expect(cell).toHaveClass("text-right", "tabular-nums");
    }
  });
});
