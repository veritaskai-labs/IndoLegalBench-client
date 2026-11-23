import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseSummary } from "@/lib/api/cases";
import { ApiError } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";
import CasesPage from "./page";

const { list, get, duplicate, auth, push, suites } = vi.hoisted(() => ({
  list: vi.fn(), get: vi.fn(), duplicate: vi.fn(), auth: vi.fn(), push: vi.fn(), suites: vi.fn(),
}));

vi.mock("@/lib/api/cases", () => ({ getCasesForSuite: list }));
vi.mock("@/lib/cases/caseApi", () => ({ getCase: get, duplicateCase: duplicate }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: auth }));
vi.mock("@/hooks/useSuites", () => ({ useSuites: suites }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const active: Pick<Suite, "id" | "name" | "status"> = { id: "active", name: "Perdata", status: "active" };
const archived: typeof active = { id: "archived", name: "Administrasi", status: "archived" };
const source: CaseSummary = {
  id: "source", case_code: "KAS-01", title: "Sengketa sewa", split_tag: null,
  origin: "import", masked: false,
  status: "draft", completeness_pct: 50, updated_at: "2026-11-20T00:00:00Z",
};
const old: CaseSummary = {
  ...source, id: "old", case_code: "KAS-02", title: "Sengketa administratif",
  split_tag: "test", status: "approved", origin: "manual",
};

beforeEach(() => {
  vi.resetAllMocks();
  auth.mockReturnValue({ status: "authenticated", user: { role: "contributor" } });
  suites.mockImplementation((status) => ({
    status: "ready", suites: [status === "active" ? active : archived], reload: vi.fn(),
  }));
  list.mockImplementation(async (id: string, { status }: { status?: string }) => {
    const row = id === active.id ? source : old;
    return !status || row.status === status ? [row] : [];
  });
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
    expect(screen.getByText(old.title)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Suite"), active.id);
    await user.selectOptions(screen.getByLabelText("Status"), "draft");
    await user.type(screen.getByRole("searchbox", { name: "Cari kasus" }), "  kAs-02 ");
    expect(await screen.findByText("Tidak ada kasus yang sesuai")).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(active.id, { status: "draft" });

    await user.click(screen.getByRole("button", { name: "Reset filter" }));
    expect(await screen.findByText(old.title)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("keeps the latest suite result when an earlier request finishes late", async () => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<CaseSummary[]>();
    list.mockImplementation((id: string) => id === active.id ? pending.promise : Promise.resolve([old]));
    render(<CasesPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat kasus");

    await user.selectOptions(screen.getByLabelText("Suite"), archived.id);
    expect(await screen.findByText(old.title)).toBeInTheDocument();
    await act(async () => pending.resolve([source]));
    expect(screen.queryByText(source.title)).not.toBeInTheDocument();
  });

  it("shows the full read-only case and restores focus and filters on Escape", async () => {
    const user = userEvent.setup();
    render(<CasesPage />);
    await user.selectOptions(screen.getByLabelText("Suite"), active.id);
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
    expect(screen.getByLabelText("Suite")).toHaveValue(active.id);
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
