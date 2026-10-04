import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { getCase, getCaseCompleteness, updateCase } from "@/lib/cases/caseApi";
import type { CaseCompleteness, CaseRead } from "@/types/case";
import EditCasePage from "./page";

const CASE_ID = "22222222-2222-2222-2222-222222222222";

const { params, push } = vi.hoisted(() => ({ params: { id: "" }, push: vi.fn() }));
const confirmMock = vi.fn();

// The page reads the case id from the URL and navigates back to the suite;
// there is no Next router in tests.
vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ push }),
}));

// useSuiteName fetches the suite for the breadcrumb label.
vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiFetch: vi.fn() };
});

// getCase/updateCase have their own request-level tests; here we only care
// how the page reacts to what they return.
vi.mock("@/lib/cases/caseApi", () => ({
  getCase: vi.fn(),
  getCaseCompleteness: vi.fn(),
  updateCase: vi.fn(),
}));

const getCaseMock = vi.mocked(getCase);
const updateCaseMock = vi.mocked(updateCase);
const completenessMock = vi.mocked(getCaseCompleteness);

function savedCase(overrides: Partial<CaseRead> = {}): CaseRead {
  return {
    id: CASE_ID,
    suite_id: "11111111-1111-1111-1111-111111111111",
    case_code: "ILB-PT-0142",
    identity: { title: "Pemberitahuan PHK", question: "Wajib?", category: null },
    legal_refs: [
      {
        regulation_type: "UU",
        regulation_number: "13",
        year: 2003,
        pasal: "151",
        ayat: null,
        huruf: null,
      },
    ],
    answer_criteria: { must_contain: [], must_not_contain: [], expected_conclusion: null },
    traps: [],
    split_tag: "dev",
    status: "draft",
    completeness_pct: 71,
    version: 1,
    created_at: "2026-09-29T00:00:00Z",
    updated_at: "2026-09-29T00:00:00Z",
    ...overrides,
  };
}

function completeness(overrides: Partial<CaseCompleteness> = {}): CaseCompleteness {
  return {
    is_complete: false,
    ready_for_review: false,
    pct: 71,
    missing: [
      { field: "answer_criteria", message: "Butuh minimal satu kriteria jawaban." },
      { field: "traps", message: "Butuh minimal satu jebakan sebelum kasus bisa diajukan review." },
    ],
    trap_count: 0,
    legal_ref_count: 1,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <EditCasePage />
    </ToastProvider>,
  );
}

function toast() {
  return screen.getByRole("status", { name: "Notifikasi" });
}

function save() {
  return screen.getByRole("button", { name: "Simpan draf" });
}

beforeEach(() => {
  params.id = CASE_ID;
  getCaseMock.mockReset();
  updateCaseMock.mockReset();
  completenessMock.mockReset();
  completenessMock.mockResolvedValue(completeness());
  push.mockReset();
  vi.mocked(apiFetch).mockResolvedValue({ name: "Suite Ketenagakerjaan" });
  confirmMock.mockReset().mockReturnValue(true);
  vi.stubGlobal("confirm", confirmMock);
});

describe("EditCasePage loading", () => {
  // Positive
  it("shows a loading state while the case is being read", () => {
    getCaseMock.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText("Memuat kasus…")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Identitas" })).not.toBeInTheDocument();
  });

  it("shows the case code, the Draft badge, and the prefilled editor once loaded", async () => {
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    expect(await screen.findByRole("heading", { name: "ILB-PT-0142" })).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByLabelText("Judul")).toHaveValue("Pemberitahuan PHK");
    expect(getCaseMock).toHaveBeenCalledWith(CASE_ID);
  });

  it.each([
    ["in_review", "Dalam tinjauan"],
    ["needs_revision", "Perlu revisi"],
    ["approved", "Disetujui"],
  ] as const)("labels status %s as %s", async (status, label) => {
    getCaseMock.mockResolvedValue(savedCase({ status }));
    renderPage();

    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  // Negative
  it("says the case was not found on 404, without a retry button", async () => {
    getCaseMock.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Kasus tidak ditemukan"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Kasus tidak ditemukan.");
    expect(screen.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
  });

  it("offers a retry when loading fails for another reason, and loads on retry", async () => {
    const user = userEvent.setup();
    getCaseMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(savedCase());
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat kasus.");
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByRole("heading", { name: "ILB-PT-0142" })).toBeInTheDocument();
    expect(getCaseMock).toHaveBeenCalledTimes(2);
  });

  // Corner
  it("decodes the case id from the URL once", async () => {
    params.id = "a%2Fb";
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    await screen.findByRole("heading", { name: "ILB-PT-0142" });
    expect(getCaseMock).toHaveBeenCalledWith("a/b");
  });
});

describe("EditCasePage saving", () => {
  // Positive
  it("puts the edited case, shows a toast, and refills the form from the server reply", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock.mockResolvedValue(
      savedCase({ identity: { title: "Judul dari server", question: "Wajib?", category: null } }),
    );
    renderPage();
    const title = await screen.findByLabelText("Judul");

    await user.clear(title);
    await user.type(title, "Judul baru");
    await user.click(save());

    expect(updateCaseMock).toHaveBeenCalledTimes(1);
    expect(updateCaseMock.mock.calls[0]?.[0]).toBe(CASE_ID);
    expect(updateCaseMock.mock.calls[0]?.[1]).toMatchObject({
      identity: { title: "Judul baru" },
    });
    expect(toast()).toHaveTextContent("Perubahan tersimpan");
    await waitFor(() =>
      expect(screen.getByLabelText("Judul")).toHaveValue("Judul dari server"),
    );
    expect(getCaseMock).toHaveBeenCalledTimes(1);
  });

  // Unsaved changes: text in the header plus the browser prompt.
  it("warns about unsaved changes after an edit and stops warning after saving", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock.mockResolvedValue(savedCase());
    renderPage();
    const title = await screen.findByLabelText("Judul");

    await user.type(title, "!");

    expect(screen.getByText("Ada perubahan yang belum disimpan")).toBeInTheDocument();
    const leaving = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);

    await user.click(save());

    await waitFor(() =>
      expect(screen.queryByText("Ada perubahan yang belum disimpan")).not.toBeInTheDocument(),
    );
    const leavingAgain = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leavingAgain);
    expect(leavingAgain.defaultPrevented).toBe(false);
  });

  it("shows no unsaved-changes warning right after loading", async () => {
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    expect(screen.queryByText("Ada perubahan yang belum disimpan")).not.toBeInTheDocument();
  });

  // Negative: server errors, same mapping as the new-case page.
  it("shows 409 CASE_CODE_TAKEN under ID kasus and keeps the unsaved warning", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock.mockRejectedValue(
      new ApiError(409, "CASE_CODE_TAKEN", "Kode kasus 'X-1' sudah dipakai di suite 'test1'"),
    );
    renderPage();
    const code = await screen.findByLabelText("ID kasus");

    await user.clear(code);
    await user.type(code, "X-1");
    await user.click(save());

    await waitFor(() =>
      expect(screen.getByLabelText("ID kasus")).toHaveAccessibleDescription(
        "Kode kasus 'X-1' sudah dipakai di suite 'test1'",
      ),
    );
    expect(screen.getByText("Ada perubahan yang belum disimpan")).toBeInTheDocument();
    expect(toast()).toBeEmptyDOMElement();
  });

  it("shows a 422 on the exact legal reference row", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock.mockRejectedValue(
      new ApiError(422, "FIELD_REQUIRED", "Field legal_refs[0].pasal wajib diisi", "legal_refs[0].pasal"),
    );
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    await user.click(save());

    const row = screen.getByRole("group", { name: "Rujukan 1" });
    await waitFor(() =>
      expect(within(row).getByLabelText("Pasal")).toHaveAccessibleDescription(
        "Field legal_refs[0].pasal wajib diisi",
      ),
    );
  });

  it("shows a banner when saving fails for a reason that is not a field", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock.mockRejectedValue(new ApiError(500, "UNKNOWN_ERROR"));
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    await user.click(save());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Gagal menyimpan kasus. Coba lagi.",
    );
    expect(toast()).toBeEmptyDOMElement();
  });

  // Corner: retry after a failed save
  it("clears the banner when the next save succeeds", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock
      .mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"))
      .mockResolvedValueOnce(savedCase());
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    await user.click(save());
    await screen.findByRole("alert");
    await user.click(save());

    await waitFor(() => expect(toast()).toHaveTextContent("Perubahan tersimpan"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("EditCasePage completeness (SCRUM-109)", () => {
  // Positive: AC4, AC7
  it("shows the completeness the server computed for this case", async () => {
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    const indicator = await screen.findByRole("region", { name: "Kelengkapan kasus" });
    expect(await within(indicator).findByText("Kelengkapan 71%")).toBeInTheDocument();
    expect(within(indicator).getByText(/Jebakan belum ada/)).toBeInTheDocument();
    expect(completenessMock).toHaveBeenCalledWith(CASE_ID);
  });

  it("asks the server again after a save, showing the loading state meanwhile", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    updateCaseMock.mockResolvedValue(savedCase());
    let finish: (value: CaseCompleteness) => void = () => undefined;
    completenessMock
      .mockResolvedValueOnce(completeness())
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
    renderPage();
    await screen.findByText("Kelengkapan 71%");

    await user.click(save());

    expect(await screen.findByText("Menghitung kelengkapan…")).toBeInTheDocument();
    finish(completeness({ pct: 100, is_complete: true, ready_for_review: true, missing: [], trap_count: 1 }));
    expect(await screen.findByText("Siap diajukan review")).toBeInTheDocument();
    expect(completenessMock).toHaveBeenCalledTimes(2);
  });

  // Negative: the editor still works when only the indicator fails.
  it("keeps the editor usable when the completeness request fails, and retries", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    completenessMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(completeness());
    renderPage();

    expect(await screen.findByText(/Gagal memuat kelengkapan kasus/)).toBeInTheDocument();
    expect(screen.getByLabelText("Judul")).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByText("Kelengkapan 71%")).toBeInTheDocument();
  });

  describe("EditCasePage navigation (SCRUM-128)", () => {
  const SUITE_PATH = "/suites/11111111-1111-1111-1111-111111111111";

  // Positive
  it("shows the breadcrumb down to the case code", async () => {
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("Suite");
    expect(nav).toHaveTextContent("ILB-PT-0142");
  });

  // Positive
  it("goes back to the suite when nothing has changed", async () => {
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Kembali ke suite" }));

    expect(push).toHaveBeenCalledWith(SUITE_PATH);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  // Negative
  it("asks before leaving with unsaved changes, and stays when the author cancels", async () => {
    const user = userEvent.setup();
    confirmMock.mockReturnValue(false);
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    await user.type(await screen.findByLabelText(/judul/i), "x");
    await user.click(screen.getByRole("button", { name: "Kembali ke suite" }));

    expect(confirmMock).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  // Positive
  it("leaves when the author confirms", async () => {
    const user = userEvent.setup();
    confirmMock.mockReturnValue(true);
    getCaseMock.mockResolvedValue(savedCase());
    renderPage();

    await user.type(await screen.findByLabelText(/judul/i), "x");
    await user.click(screen.getByRole("button", { name: "Kembali ke suite" }));

    expect(push).toHaveBeenCalledWith(SUITE_PATH);
  });
});

});

