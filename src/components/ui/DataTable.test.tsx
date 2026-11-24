import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
