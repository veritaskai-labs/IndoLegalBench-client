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
  it("names the table with an optional screen-reader caption", () => {
    render(<DataTable columns={columns} rows={data} rowKey={(r) => r.id} caption="Daftar peserta" />);
    expect(screen.getByRole("table", { name: "Daftar peserta" })).toBeInTheDocument();
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
});
