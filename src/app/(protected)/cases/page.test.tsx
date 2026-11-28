import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { CaseDirectoryQuery, CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import type { Suite } from "@/types/suite";
import CasesPage from "./page";

const { list, get, duplicate, auth, push, suites } = vi.hoisted(() => ({
  list: vi.fn(), get: vi.fn(), duplicate: vi.fn(), auth: vi.fn(), push: vi.fn(), suites: vi.fn(),
}));

vi.mock("@/lib/cases/caseDirectory", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cases/caseDirectory")>()),
  listDirectoryCases: list,
}));
vi.mock("@/lib/cases/caseApi", () => ({ getCase: get, duplicateCase: duplicate }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: auth }));
vi.mock("@/hooks/useSuites", () => ({ useSuites: suites }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const active: Pick<Suite, "id" | "name" | "status"> = { id: "active", name: "Perdata", status: "active" };
const archived: typeof active = { id: "archived", name: "Administrasi", status: "archived" };
const source: CaseDirectoryRow = {
  id: "source", case_code: "KAS-01", title: "Sengketa sewa", split_tag: null,
  origin: "import", masked: false,
  status: "draft", completeness_pct: 50, updated_at: "2026-11-20T00:00:00Z",
  suite_id: active.id, suite_name: active.name, suite_archived: false,
};
const old: CaseDirectoryRow = {
  ...source, id: "old", case_code: "KAS-02", title: "Sengketa administratif",
  split_tag: "test", status: "approved", origin: "manual",
  suite_id: archived.id, suite_name: archived.name, suite_archived: true,
};

const newestFirst = { key: "updated_at", direction: "desc" } as const;
const firstPage = { q: "", status: "", suiteId: "", page: 1, sort: newestFirst };
const casePage = (items: CaseDirectoryRow[], page = 1, total = items.length) => ({ items, total, page, size: 20 });

beforeEach(() => {
  vi.resetAllMocks();
  auth.mockReturnValue({ status: "authenticated", user: { role: "contributor" } });
  suites.mockImplementation((status) => ({
    status: "ready", suites: [status === "active" ? active : archived], reload: vi.fn(),
  }));
  list.mockImplementation(async ({ q, suiteId, status, page }: CaseDirectoryQuery) => casePage(
    [source, old].filter((row) => (!suiteId || row.suite_id === suiteId)
      && (!status || row.status === status)
      && (!q || row.case_code.toLowerCase().includes(q.toLowerCase()))),
    page,
  ));
  get.mockResolvedValue({
    ...source, suite_id: active.id, version: 1, was_dev: false,
    identity: { title: source.title, question: "Apa isi lengkap pertanyaan?", category: null },
    legal_refs: [
      { kind: "structured", display_text: "Rujukan terstruktur contoh" },
      { kind: "free_text", free_text: "Rujukan bebas contoh" },
    ],
    answer_criteria: { expected_conclusion: "Jelaskan akibatnya." },
  });
});

describe("Daftar kasus", () => {
  it("combines keyword, status and suite, marks a missing tag, and clears all filters", async () => {
    const user = userEvent.setup();
    render(<CasesPage />);

    expect(await screen.findByText("Belum ditetapkan")).toBeInTheDocument();
    expect(list).toHaveBeenCalledExactlyOnceWith(firstPage);
    expect(screen.getByText("2 kasus").tagName).toBe("OUTPUT");
    expect(screen.getByText(old.title)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Pilih suite"), active.id);
    await user.click(screen.getByRole("button", { name: "Draft" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Cari kasus" }), { target: { value: "  kAs-02 " } });
    expect(await screen.findByText("Tidak ada kasus yang sesuai")).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith({ q: "kAs-02", suiteId: active.id, status: "draft", page: 1, sort: newestFirst });

    await user.click(screen.getByRole("button", { name: "Reset filter" }));
    expect(await screen.findByText(old.title)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(list).toHaveBeenLastCalledWith(firstPage);
  });

  it("keeps the latest suite result when an earlier request finishes late", async () => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<ReturnType<typeof casePage>>();
    list.mockImplementation(({ suiteId }) => suiteId === "" ? pending.promise : Promise.resolve(casePage([old])));
    render(<CasesPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat kasus");

    await user.selectOptions(screen.getByLabelText("Pilih suite"), archived.id);
    expect(await screen.findByText(old.title)).toBeInTheDocument();
    await act(async () => pending.resolve(casePage([source])));
    expect(screen.queryByText(source.title)).not.toBeInTheDocument();
  });

  it("uses the server count for paging and resets to page one after a keyword change", async () => {
    const user = userEvent.setup();
    list.mockImplementation(async ({ page, q }) => q
      ? casePage([old])
      : casePage(page === 1 ? [source] : [old], page, 21));
    render(<CasesPage />);

    expect(await screen.findByText("21 kasus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sebelumnya" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(await screen.findByText("Halaman 2 dari 2")).toBeInTheDocument();
    expect(screen.getByText(old.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
    expect(list).toHaveBeenLastCalledWith({ ...firstPage, page: 2 });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ADMIN" } });
    expect(list).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("1 kasus")).toBeInTheDocument();
    expect(screen.getByText(old.title)).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith({ ...firstPage, q: "ADMIN" });
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("still shows cases when the suite options fail to load", async () => {
    suites.mockReturnValue({ status: "error", suites: [], reload: vi.fn() });
    render(<CasesPage />);

    expect(await screen.findByText(source.title)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat daftar suite.");
    expect(screen.getByLabelText("Pilih suite")).toBeDisabled();
  });

  it("returns to the last available page if the result set shrinks", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce(casePage([source], 1, 21))
      .mockResolvedValueOnce(casePage([], 2, 1))
      .mockResolvedValueOnce(casePage([old]));
    render(<CasesPage />);

    await user.click(await screen.findByRole("button", { name: "Berikutnya" }));
    expect(await screen.findByText(old.title)).toBeInTheDocument();
    expect(list.mock.calls).toEqual([[firstPage], [{ ...firstPage, page: 2 }], [firstPage]]);
  });

  // Positive: SCRUM-381, the table opens newest change first and says so on the header.
  it("opens sorted by the last-modified column, newest first", async () => {
    // Arrange / Act
    render(<CasesPage />);

    // Assert
    await screen.findByText(source.title);
    expect(screen.getByRole("columnheader", { name: /Terakhir Kali Diubah/ })).toHaveAttribute("aria-sort", "descending");
  });

  // Positive: pressing a header asks the server for that sort and keeps keyword, filters and goes to page one.
  it("asks the server to sort when a column header is pressed, keeping the filters", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<CasesPage />);
    await screen.findByText(source.title);
    await user.selectOptions(screen.getByLabelText("Pilih suite"), active.id);
    await screen.findByText(source.title);

    // Act
    await user.click(within(screen.getByRole("columnheader", { name: /^Suite/ })).getByRole("button"));

    // Assert
    await screen.findByText(source.title);
    expect(list).toHaveBeenLastCalledWith({
      q: "", status: "", suiteId: active.id, page: 1, sort: { key: "suite_name", direction: "asc" },
    });
    expect(screen.getByRole("columnheader", { name: /^Suite/ })).toHaveAttribute("aria-sort", "ascending");
  });

  // Positive: a second press on the same header flips the direction.
  it("flips to descending when the active column is pressed again", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<CasesPage />);
    await screen.findByText(source.title);
    await user.click(within(screen.getByRole("columnheader", { name: /^Status/ })).getByRole("button"));
    await screen.findByText(source.title);

    // Act
    await user.click(within(screen.getByRole("columnheader", { name: /^Status/ })).getByRole("button"));

    // Assert
    await screen.findByText(source.title);
    expect(list).toHaveBeenLastCalledWith({ ...firstPage, sort: { key: "status", direction: "desc" } });
  });

  // Edge: a new sort goes back to page one, because page 2 of another order is a different set of rows.
  it("goes back to page one when the sort changes from page two", async () => {
    // Arrange
    const user = userEvent.setup();
    list.mockImplementation(async ({ page }) => casePage(page === 1 ? [source] : [old], page, 21));
    render(<CasesPage />);
    await user.click(await screen.findByRole("button", { name: "Berikutnya" }));
    await screen.findByText("Halaman 2 dari 2");

    // Act
    await user.click(within(screen.getByRole("columnheader", { name: /ID Kasus/ })).getByRole("button"));

    // Assert
    expect(await screen.findByText("Halaman 1 dari 2")).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith({ ...firstPage, sort: { key: "case_code", direction: "asc" } });
  });

  // Edge: the sort is not a filter, so Reset filter leaves the chosen order alone.
  it("keeps the chosen sort when the filters are reset", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<CasesPage />);
    await screen.findByText(source.title);
    await user.click(within(screen.getByRole("columnheader", { name: /^Judul/ })).getByRole("button"));
    await user.click(screen.getByRole("button", { name: "Draft" }));
    await screen.findByText(source.title);

    // Act
    await user.click(screen.getByRole("button", { name: "Reset filter" }));

    // Assert
    await screen.findByText(old.title);
    expect(list).toHaveBeenLastCalledWith({ ...firstPage, sort: { key: "title", direction: "asc" } });
  });

  // Negative: the Aksi column has nothing meaningful to sort by.
  it("offers sorting on the data columns but not on Aksi", async () => {
    // Arrange / Act
    render(<CasesPage />);
    await screen.findByText(source.title);

    // Assert
    for (const name of [/ID Kasus/, /^Judul/, /^Suite/, /^Tag/, /^Status/, /Terakhir Kali Diubah/]) {
      expect(within(screen.getByRole("columnheader", { name })).getByRole("button")).toBeInTheDocument();
    }
    expect(within(screen.getByRole("columnheader", { name: "Aksi" })).queryByRole("button")).not.toBeInTheDocument();
  });

  // Positive: the rows are shown in the server's order; the table does not re-sort the page itself.
  it("keeps the order the server sent", async () => {
    // Arrange
    list.mockResolvedValue(casePage([old, source]));

    // Act
    render(<CasesPage />);

    // Assert
    await screen.findByText(old.title);
    const titles = within(screen.getByRole("table")).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[1].textContent);
    expect(titles).toEqual([old.title, source.title]);
  });

  // Positive: the new column shows the relative time of the ticket, with the full WIB time as a tooltip.
  it("shows the last-modified time as relative text with the full time as tooltip", async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T00:40:00Z"));

    // Act
    render(<CasesPage />);

    // Assert
    const cell = (await screen.findAllByText("40 menit lalu"))[0];
    expect(cell).toHaveAttribute("title", "20 Nov 2026, 07.00 WIB");
    vi.useRealTimers();
  });

  // Positive: SCRUM-381, the case code is plain text now; opening the editor is a separate control.
  it("shows the case code as plain text, not as a link", async () => {
    // Arrange / Act
    render(<CasesPage />);

    // Assert
    const row = (await screen.findByText(source.title)).closest("tr") as HTMLElement;
    const codeCell = within(row).getAllByRole("cell")[0];
    expect(codeCell).toHaveTextContent("KAS-01");
    expect(within(codeCell).queryByRole("link")).not.toBeInTheDocument();
  });

  // Positive: every row has Buka editor in the Aksi column, next to Pratinjau and Duplikat, pointing at its editor.
  it("puts a Buka editor button with a tooltip next to Duplikat in the Aksi column", async () => {
    // Arrange / Act
    render(<CasesPage />);

    // Assert
    const row = (await screen.findByText(source.title)).closest("tr") as HTMLElement;
    const actions = within(within(row).getAllByRole("cell").at(-1) as HTMLElement);
    const open = actions.getByRole("link", { name: "Buka editor KAS-01" });
    expect(open).toHaveAttribute("href", "/cases/source/edit");
    expect(open).toHaveAttribute("title", "Buka editor kasus KAS-01");
    expect(actions.getAllByRole("link").concat(actions.getAllByRole("button")).map((item) => item.textContent).sort())
      .toEqual(["Buka editor", "Duplikat", "Pratinjau"]);
  });

  // Edge: a case in an archived suite still opens in the editor (read-only there), only Duplikat is withheld.
  it("offers Buka editor for a case in an archived suite, without Duplikat", async () => {
    // Arrange / Act
    render(<CasesPage />);

    // Assert
    const row = (await screen.findByText(old.title)).closest("tr") as HTMLElement;
    expect(within(row).getByRole("link", { name: "Buka editor KAS-02" })).toHaveAttribute("href", "/cases/old/edit");
    expect(within(row).queryByRole("button", { name: "Duplikat KAS-02" })).not.toBeInTheDocument();
  });

  // Edge: the id is encoded in the address, like caseEditPath does everywhere else.
  it("encodes the case id in the editor address", async () => {
    // Arrange
    list.mockResolvedValue(casePage([{ ...source, id: "a/b c" }]));

    // Act
    render(<CasesPage />);

    // Assert
    expect(await screen.findByRole("link", { name: "Buka editor KAS-01" })).toHaveAttribute("href", "/cases/a%2Fb%20c/edit");
  });

  it("shows the full read-only case and restores focus and filters on Escape", async () => {
    const user = userEvent.setup();
    render(<CasesPage />);
    await user.selectOptions(screen.getByLabelText("Pilih suite"), active.id);
    const trigger = await screen.findByRole("button", { name: `Pratinjau ${source.case_code}` });
    await user.click(trigger);

    const preview = screen.getByRole("dialog", { name: "Pratinjau kasus" });
    expect(get).toHaveBeenCalledExactlyOnceWith(source.id);
    expect(await within(preview).findByText("Apa isi lengkap pertanyaan?")).toBeInTheDocument();
    expect(within(preview).getByText("Rujukan terstruktur contoh")).toBeInTheDocument();
    expect(within(preview).getByText("Rujukan bebas contoh")).toBeInTheDocument();
    expect(within(preview).getByText("Kesimpulan: Jelaskan akibatnya.")).toBeInTheDocument();

    fireEvent(preview, new Event("cancel", { cancelable: true }));
    expect(preview).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByLabelText("Pilih suite")).toHaveValue(active.id);
  });

  it("duplicates once per confirmation and opens the server's new draft", async () => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<{ id: string }>();
    duplicate.mockReturnValue(pending.promise);
    render(<CasesPage />);
    await user.click(await screen.findByRole("button", { name: `Duplikat ${source.case_code}` }));
    const dialog = screen.getByRole("dialog", { name: "Duplikat kasus" });
    expect(duplicate).not.toHaveBeenCalled();
    const confirm = within(dialog).getByRole("button", { name: "Duplikat" });
    act(() => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    expect(duplicate).toHaveBeenCalledExactlyOnceWith(source.id);

    await act(async () => pending.resolve({ id: "new-case" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/cases/new-case/edit");
  });

  it("retries loading a preview in place", async () => {
    const user = userEvent.setup();
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<CasesPage />);
    await user.click(await screen.findByRole("button", { name: `Pratinjau ${source.case_code}` }));
    const preview = screen.getByRole("dialog", { name: "Pratinjau kasus" });
    expect(await within(preview).findByRole("alert")).toHaveTextContent("Gagal memuat pratinjau kasus.");
    await user.click(within(preview).getByRole("button", { name: "Coba lagi" }));
    expect(await within(preview).findByText("Apa isi lengkap pertanyaan?")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("keeps an archived-suite error in the confirmation and offers only preview for an archived row", async () => {
    const user = userEvent.setup();
    duplicate.mockRejectedValue(new ApiError(422, "SUITE_NOT_ACTIVE"));
    render(<CasesPage />);
    expect(await screen.findByRole("button", { name: `Pratinjau ${old.case_code}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Duplikat ${old.case_code}` })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `Duplikat ${source.case_code}` }));
    const dialog = screen.getByRole("dialog", { name: "Duplikat kasus" });
    await user.click(within(dialog).getByRole("button", { name: "Duplikat" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Suite kasus ini diarsipkan");
    expect(push).not.toHaveBeenCalled();
  });

  it.each(["developer_ai", "viewer"])("makes no list or detail request for %s", (role) => {
    auth.mockReturnValue({ status: "authenticated", user: { role } });
    render(<CasesPage />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(suites).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });
});
