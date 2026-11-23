import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ImportRow, ImportSummary } from "@/types/caseImport";
import { ImportSummaryView } from "./ImportSummaryView";

/** Typed fixtures (E52): every object passes the generated ImportSummaryRead type. */
function row(row_no: number, status: ImportRow["status"], reason: string | null = null): ImportRow {
  const created = status === "created";
  return {
    row_no,
    status,
    case_id: created ? `c-${row_no}` : null,
    case_code: created ? `IMPOR-AAAA0000-${String(row_no).padStart(3, "0")}` : null,
    reason: created ? null : (reason ?? `alasan baris ${row_no}`),
  };
}

function summaryOf(rows: ImportRow[], overrides: Partial<ImportSummary> = {}): ImportSummary {
  return {
    batch_id: "b-1",
    file_name: "kasus-lama.csv",
    imported_by: "u-1",
    imported_at: "2026-11-23T14:00:00Z",
    suite_id: "s-1",
    suite_name: "Impor CSV 23 Nov 2026 21.00 WIB (aaaa0000)",
    total_rows: rows.length,
    success_count: rows.filter((r) => r.status === "created").length,
    failed_count: rows.filter((r) => r.status === "failed").length,
    skipped_count: rows.filter((r) => r.status === "skipped").length,
    rows,
    ...overrides,
  };
}

const MIXED = summaryOf([
  row(5, "skipped", "Kembar dengan baris 2 di berkas ini."),
  row(2, "created"),
  row(4, "failed", "must_contain: bukan list JSON yang valid."),
  row(3, "created"),
  row(6, "failed", "Jumlah kolom 7, seharusnya 8 sesuai template."),
]);

function table() {
  return screen.getByRole("table", { name: "Hasil per baris" });
}

function bodyRows() {
  return within(table()).getAllByRole("row").slice(1);
}

function rowNumbers() {
  return bodyRows().map((tr) => within(tr).getAllByRole("cell")[0].textContent);
}

describe("ImportSummaryView (AC7)", () => {
  // Positive: what was imported, when, and where the cases went (AC9).
  it("names the file, the time in WIB and the temporary suite", () => {
    // Arrange / Act
    render(<ImportSummaryView summary={MIXED} />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Ringkasan impor" })).toBeInTheDocument();
    expect(screen.getByText("kasus-lama.csv")).toBeInTheDocument();
    expect(screen.getByText("23 Nov 2026, 21.00 WIB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impor CSV 23 Nov 2026 21.00 WIB (aaaa0000)" })).toHaveAttribute(
      "href",
      "/suites/s-1",
    );
    expect(screen.getByText(/berstatus draf/)).toBeInTheDocument();
  });

  // Positive: the four numbers of the summary, as the server counted them.
  it("shows rows read, created, failed and skipped", () => {
    // Arrange / Act
    render(<ImportSummaryView summary={MIXED} />);

    // Assert
    const counts = screen.getByRole("list", { name: "Jumlah baris" });
    expect(within(counts).getByText("Dibaca").nextSibling).toHaveTextContent("5");
    expect(within(counts).getByText("Berhasil").nextSibling).toHaveTextContent("2");
    expect(within(counts).getByText("Gagal").nextSibling).toHaveTextContent("2");
    expect(within(counts).getByText("Dilewati").nextSibling).toHaveTextContent("1");
  });

  // Positive: failures first, with their reasons, sorted by spreadsheet row.
  it("opens on the failed rows with their reasons", () => {
    // Arrange / Act
    render(<ImportSummaryView summary={MIXED} />);

    // Assert
    expect(screen.getByRole("button", { name: "Gagal (2)" })).toHaveAttribute("aria-pressed", "true");
    expect(rowNumbers()).toEqual(["4", "6"]);
    expect(within(table()).getByText("must_contain: bukan list JSON yang valid.")).toBeInTheDocument();
    expect(within(table()).getByText("Jumlah kolom 7, seharusnya 8 sesuai template.")).toBeInTheDocument();
  });

  // Positive: every filter shows its rows and marks itself as pressed.
  it.each([
    ["Semua (5)", ["2", "3", "4", "5", "6"]],
    ["Dilewati (1)", ["5"]],
    ["Berhasil (2)", ["2", "3"]],
  ])("switches to %s", async (name, expected) => {
    // Arrange
    render(<ImportSummaryView summary={MIXED} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name }));

    // Assert
    expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Gagal (2)" })).toHaveAttribute("aria-pressed", "false");
    expect(rowNumbers()).toEqual(expected);
  });

  // Positive: a created row links to its draft for completion; other rows have no case.
  it("links created rows to the case editor and shows a dash for the others", async () => {
    // Arrange
    render(<ImportSummaryView summary={MIXED} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Semua (5)" }));

    // Assert
    const [created, , failed] = bodyRows();
    expect(within(created).getByRole("link", { name: "IMPOR-AAAA0000-002" })).toHaveAttribute("href", "/cases/c-2/edit");
    expect(within(created).getByText("Berhasil")).toBeInTheDocument();
    expect(within(failed).queryByRole("link")).toBeNull();
    expect(within(failed).getAllByRole("cell")[2]).toHaveTextContent("–");
    expect(within(created).getAllByRole("cell")[3]).toHaveTextContent("–");
  });

  // Negative: nothing created, so the server archived the temporary suite; no link, no draft note.
  it.each([
    ["all failed", [row(2, "failed"), row(3, "failed")]],
    ["all skipped", [row(2, "skipped")]],
  ])("does not link the temporary suite when %s", (_, rows) => {
    // Arrange / Act
    render(<ImportSummaryView summary={summaryOf(rows)} />);

    // Assert
    expect(screen.queryByRole("link", { name: /Impor CSV/ })).toBeNull();
    expect(screen.getByText("Tidak ada kasus yang masuk; suite sementara diarsipkan.")).toBeInTheDocument();
    expect(screen.queryByText(/berstatus draf/)).toBeNull();
  });

  // Edge: all skipped (re-import, AC10) opens on all rows and explains each skip.
  it("shows a re-import where every row was skipped", () => {
    // Arrange
    const summary = summaryOf([row(2, "skipped", "Kembar dengan baris 2 dari impor sebelumnya (kasus IMPOR-X-002).")]);

    // Act
    render(<ImportSummaryView summary={summary} />);

    // Assert
    expect(screen.getByRole("button", { name: "Semua (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Kembar dengan baris 2 dari impor sebelumnya (kasus IMPOR-X-002).")).toBeInTheDocument();
  });

  // Edge: a filter without rows explains itself inside the table.
  it("explains an empty filter", async () => {
    // Arrange
    render(<ImportSummaryView summary={summaryOf([row(2, "created")])} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Gagal (0)" }));

    // Assert
    expect(within(table()).getByText("Tidak ada baris yang gagal.")).toBeInTheDocument();
  });

  // Edge: the user's text (file name, reasons that quote cells) is rendered as text, never as HTML.
  it("renders markup in the file name and in a reason as plain text", () => {
    // Arrange
    const bad = '<img src=x onerror="alert(1)">';
    const summary = summaryOf([row(2, "failed", `title: ${bad}`)], { file_name: `${bad}.csv` });

    // Act
    const { container } = render(<ImportSummaryView summary={summary} />);

    // Assert
    expect(screen.getByText(`${bad}.csv`)).toBeInTheDocument();
    expect(screen.getByText(`title: ${bad}`)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  // Edge: the largest file (AC4) renders every row, and the table scrolls sideways on a phone.
  it("renders 500 rows in a horizontally scrollable table", async () => {
    // Arrange
    const many = summaryOf(Array.from({ length: 500 }, (_, i) => row(i + 2, i % 3 === 0 ? "failed" : "created")));
    render(<ImportSummaryView summary={many} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Semua (500)" }));

    // Assert
    expect(bodyRows()).toHaveLength(500);
    expect(table().parentElement).toHaveClass("overflow-x-auto");
  });
});
