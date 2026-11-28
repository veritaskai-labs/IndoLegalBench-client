import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type Column, DataTable } from "./DataTable";

type Row = { id: string; name: string; score: number };

const columns: Column<Row>[] = [
  { key: "name", header: "Nama", sortable: true, cell: (r) => r.name },
  { key: "score", header: "Skor", sortable: true, cell: (r) => String(r.score) },
  { key: "note", header: "Catatan", cell: () => "-" },
];

const data: Row[] = [
  { id: "1", name: "Budi", score: 2 },
  { id: "2", name: "Ani", score: 10 },
  { id: "3", name: "Citra", score: 5 },
];

function bodyNames() {
  const [, ...bodyRows] = screen.getAllByRole("row");
  return bodyRows.map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("DataTable", () => {
  it("renders a header per column and a row per item", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Nama", "Skor", "Catatan"]);
    expect(bodyNames()).toEqual(["Budi", "Ani", "Citra"]);
  });

  it("sorts ascending then descending when a sortable header is pressed and reports it with aria-sort", async () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} />);
    const header = screen.getByRole("columnheader", { name: /Nama/ });
    expect(header).toHaveAttribute("aria-sort", "none");

    await userEvent.click(within(header).getByRole("button"));
    expect(bodyNames()).toEqual(["Ani", "Budi", "Citra"]);
    expect(header).toHaveAttribute("aria-sort", "ascending");

    await userEvent.click(within(header).getByRole("button"));
    expect(bodyNames()).toEqual(["Citra", "Budi", "Ani"]);
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("does not offer sorting on a column that is not sortable", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} />);

    const header = screen.getByRole("columnheader", { name: "Catatan" });
    expect(within(header).queryByRole("button")).toBeNull();
    expect(header).not.toHaveAttribute("aria-sort");
  });

  it("pages the rows and moves with the pager", async () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} pageSize={2} />);
    expect(bodyNames()).toEqual(["Budi", "Ani"]);
    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    expect(bodyNames()).toEqual(["Citra"]);
    expect(screen.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
  });

  it("returns to page one when the sort changes", async () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} pageSize={2} />);
    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    await userEvent.click(within(screen.getByRole("columnheader", { name: /Skor/ })).getByRole("button"));

    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument();
    expect(bodyNames()).toEqual(["Budi", "Citra"]);
  });

  it("shows the empty slot instead of the pager when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r: Row) => r.id}
        empty={<span>Belum ada skor. Tambahkan kasus dulu.</span>}
      />,
    );

    expect(screen.getByText("Belum ada skor. Tambahkan kasus dulu.")).toBeInTheDocument();
    expect(screen.queryByText(/Halaman/)).toBeNull();
  });

  it("hides the pager when everything fits on one page", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} pageSize={10} />);

    expect(screen.queryByText(/Halaman/)).toBeNull();
  });

  it("sorts a column with its own comparator", async () => {
    const byNameLength = (a: Row, b: Row) => a.name.length - b.name.length;
    const custom: Column<Row>[] = [{ key: "name", header: "Nama", sortable: true, compare: byNameLength, cell: (r) => r.name }];
    render(<DataTable columns={custom} rows={data} rowKey={(r) => r.id} />);

    await userEvent.click(screen.getByRole("button", { name: /Nama/ }));

    expect(bodyNames()).toEqual(["Ani", "Budi", "Citra"]);
  });

  it("sorts a derived column through its sortValue", async () => {
    const derived: Column<Row>[] = [
      { key: "name", header: "Nama", cell: (r) => r.name },
      { key: "double", header: "Dobel", sortable: true, sortValue: (r) => r.score * 2, cell: (r) => String(r.score * 2) },
    ];
    render(<DataTable columns={derived} rows={data} rowKey={(r) => r.id} />);

    await userEvent.click(screen.getByRole("button", { name: /Dobel/ }));

    expect(bodyNames()).toEqual(["Budi", "Citra", "Ani"]);
  });

  it("goes back to page one when the rows change, so clearing a filter does not jump to an old page", async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `Nama ${i}`, score: i }));
    const { rerender } = render(<DataTable columns={columns} rows={many} rowKey={(r) => r.id} pageSize={2} />);
    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(screen.getByText("Halaman 3 dari 3")).toBeInTheDocument();

    rerender(<DataTable columns={columns} rows={many.slice(0, 3)} rowKey={(r) => r.id} pageSize={2} />);
    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument();

    rerender(<DataTable columns={columns} rows={many} rowKey={(r) => r.id} pageSize={2} />);
    expect(screen.getByText("Halaman 1 dari 3")).toBeInTheDocument();
  });

  it("keeps the page when the parent re-renders with the same rows in a new array", async () => {
    const { rerender } = render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} pageSize={2} />);
    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    rerender(<DataTable columns={columns} rows={[...data]} rowKey={(r) => r.id} pageSize={2} />);

    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();
  });

  // Review #125 (Rafa): a table should have a name for screen readers; an optional caption gives it one.
  // Positive (SCRUM-375 A1): a footer that names the rows on the current page, also when it all fits on one page.
  it("shows the summary with the range of the current page and follows the pager", async () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        pageSize={2}
        summary={({ from, to, total }) => `Baris ${from}–${to} dari ${total}`}
      />,
    );
    expect(screen.getByText("Baris 1–2 dari 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    expect(screen.getByText("Baris 3–3 dari 3")).toBeInTheDocument();
  });

  // Edge: no rows means no range to name; edge because from would be 1 and to 0, a "1–0" footer under the empty slot.
  it("leaves the summary out when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r: Row) => r.id}
        empty={<span>Kosong</span>}
        summary={({ total }) => `Total ${total}`}
      />,
    );

    expect(screen.queryByText(/Total/)).toBeNull();
  });

  it("names the table with an optional screen-reader caption", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} caption="Daftar peserta" />);
    expect(screen.getByRole("table", { name: "Daftar peserta" })).toBeInTheDocument();
  });

  // Edge: a row marker drawn inside a cell stops at a fixed height, while the row grows when a cell wraps.
  // A class on the row itself follows the real row height.
  it("puts the optional row class on each row's own element", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} rowClassName={(r) => (r.id === "2" ? "marked" : undefined)} />);
    const marked = within(screen.getByRole("table"))
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.classList.contains("marked"));
    expect(marked).toEqual([false, true, false]);
  });

  it("has no caption when none is given", () => {
    const { container } = render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} />);
    expect(container.querySelector("caption")).toBeNull();
  });

  // Positif, SCRUM-378: a page can start the table in a sort it kept, e.g. after "Kembali ke daftar kasus".
  it("starts in the given sort and shows it on the header", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} initialSort={{ key: "score", direction: "desc" }} />);

    expect(bodyNames()).toEqual(["Ani", "Citra", "Budi"]);
    expect(screen.getByRole("columnheader", { name: /Skor/ })).toHaveAttribute("aria-sort", "descending");
  });

  // Positif, SCRUM-378: every sort the user picks is reported, so the page can keep it in the address.
  it("reports each sort the user picks", async () => {
    const onSortChange = vi.fn();
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} onSortChange={onSortChange} />);
    const header = within(screen.getByRole("columnheader", { name: /Skor/ })).getByRole("button");

    await userEvent.click(header);
    await userEvent.click(header);

    expect(onSortChange.mock.calls).toEqual([[{ key: "score", direction: "asc" }], [{ key: "score", direction: "desc" }]]);
  });

  it("keeps the current page when resetPageOnDataChange is false", async () => {
    const many = [
      ...data,
      { id: "4", name: "Dina", score: 75 },
    ];
    const { rerender } = render(
      <DataTable columns={columns} rows={many} rowKey={(r) => r.id} pageSize={2} resetPageOnDataChange={false} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        rows={many.map((row) => (row.id === "4" ? { ...row, name: "Dina Baru" } : row))}
        rowKey={(r) => r.id}
        pageSize={2}
        resetPageOnDataChange={false}
      />,
    );
    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();
    expect(screen.getByText("Dina Baru")).toBeInTheDocument();
  });

  it("calls onRowClick when clicking a row cell, but ignores nested buttons", async () => {
    const onRowClick = vi.fn();
    const onAction = vi.fn();
    const withAction: Column<Row>[] = [
      ...columns,
      {
        key: "act",
        header: "Aksi",
        cell: (r) => (
          <button type="button" onClick={() => onAction(r.id)}>
            Pilih {r.name}
          </button>
        ),
      },
    ];

    render(<DataTable columns={withAction} rows={data} rowKey={(r) => r.id} onRowClick={onRowClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Pilih Ani" }));
    expect(onAction).toHaveBeenCalledWith("2");
    expect(onRowClick).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("Budi"));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });
});

describe("DataTable with a sort the page controls (SCRUM-381)", () => {
  // Positive: the page (server) already ordered the rows, so the table shows them as given.
  it("shows the rows in the order it is given even when a sort is active", () => {
    // Arrange / Act
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} controlledSort={{ key: "name", direction: "asc" }} />);

    // Assert
    expect(bodyNames()).toEqual(["Budi", "Ani", "Citra"]);
  });

  // Positive: the header shows the sort the page chose.
  it("reports the controlled sort with aria-sort", () => {
    // Arrange / Act
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} controlledSort={{ key: "score", direction: "desc" }} />);

    // Assert
    expect(screen.getByRole("columnheader", { name: /Skor/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Nama/ })).toHaveAttribute("aria-sort", "none");
  });

  // Positive: pressing a header only tells the page; the table does not reorder or change its own sort.
  it("reports the next sort without reordering the rows itself", async () => {
    // Arrange
    const onSortChange = vi.fn();
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} controlledSort={null} onSortChange={onSortChange} />);

    // Act
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Nama/ })).getByRole("button"));

    // Assert
    expect(onSortChange).toHaveBeenCalledExactlyOnceWith({ key: "name", direction: "asc" });
    expect(bodyNames()).toEqual(["Budi", "Ani", "Citra"]);
    expect(screen.getByRole("columnheader", { name: /Nama/ })).toHaveAttribute("aria-sort", "none");
  });

  // Edge: pressing the active column flips the direction of the sort the page holds.
  it("asks for the opposite direction when the active column is pressed", async () => {
    // Arrange
    const onSortChange = vi.fn();
    render(
      <DataTable columns={columns} rows={data} rowKey={(r) => r.id} controlledSort={{ key: "name", direction: "asc" }} onSortChange={onSortChange} />,
    );

    // Act
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Nama/ })).getByRole("button"));

    // Assert
    expect(onSortChange).toHaveBeenCalledExactlyOnceWith({ key: "name", direction: "desc" });
  });

  // Edge: no sort chosen by the page means no header is marked as sorted.
  it("marks no header when the controlled sort is null", () => {
    // Arrange / Act
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} controlledSort={null} />);

    // Assert
    expect(screen.getByRole("columnheader", { name: /Nama/ })).toHaveAttribute("aria-sort", "none");
    expect(screen.getByRole("columnheader", { name: /Skor/ })).toHaveAttribute("aria-sort", "none");
  });
});
