import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { getCase, getCaseCompleteness, updateCase } from "@/lib/cases/caseApi";
import { listCaseVersions, startCaseVersion } from "@/lib/cases/versionApi";
import { session } from "@/test/authMock";
import { makeSummary } from "@/test/versionFixtures";
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

// Who is signed in decides whether the "Edit (buat versi baru)" button is offered.
vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));

vi.mock("@/lib/cases/versionApi", () => ({ startCaseVersion: vi.fn(), listCaseVersions: vi.fn() }));

const getCaseMock = vi.mocked(getCase);
const startVersionMock = vi.mocked(startCaseVersion);
const listVersionsMock = vi.mocked(listCaseVersions);
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
    completeness_pct: 83,
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
    pct: 83,
    missing: [{ field: "answer_criteria", message: "Butuh minimal satu kriteria jawaban." }],
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
  session.role = "author";
  startVersionMock.mockReset();
  listVersionsMock.mockReset();
  // An author on an approved case reads the history to learn who created it.
  listVersionsMock.mockResolvedValue([]);
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
  
  it("offers a way back to the suites list when the case is not found", async () => {
    getCaseMock.mockRejectedValue(new ApiError(404, "not_found"));
    renderPage();

    expect(
      await screen.findByRole("link", { name: "Kembali ke Suites" }),
    ).toHaveAttribute("href", "/suites");
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
    expect(await within(indicator).findByText("Kelengkapan 83%")).toBeInTheDocument();
    expect(within(indicator).getByText("Butuh minimal satu kriteria jawaban.")).toBeInTheDocument();
    expect(within(indicator).queryByText(/Jebakan belum ada/)).not.toBeInTheDocument();
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
    await screen.findByText("Kelengkapan 83%");

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

    expect(await screen.findByText("Kelengkapan 83%")).toBeInTheDocument();
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

describe("EditCasePage locked versions (SCRUM-138)", () => {
  const startButton = () => screen.findByRole("button", { name: "Edit (buat versi baru)" });
  const noStartButton = () => screen.queryByRole("button", { name: "Edit (buat versi baru)" });

  // Version 1 was written by the signed-in user (id u1), so the author is the creator.
  beforeEach(() => {
    listVersionsMock.mockResolvedValue([makeSummary(1), makeSummary(2)]);
  });

  // Positive: AC1 and AC6
  it("locks an approved case and offers to start a new version that will be reviewed again", async () => {
    // Arrange
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));

    // Act
    renderPage();
    const notice = await screen.findByRole("region", { name: "Versi terkunci" });

    // Assert
    expect(notice).toHaveTextContent("ditinjau ulang");
    expect(await startButton()).toBeEnabled();
    expect(screen.getByLabelText("Judul")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Simpan draf" })).not.toBeInTheDocument();
  });

  it("fills the editor from the new draft, not from the approved case, and unlocks it", async () => {
    // Arrange
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));
    startVersionMock.mockResolvedValue(
      savedCase({
        status: "draft",
        version: 2,
        identity: { title: "Judul draf versi 2", question: "Wajib?", category: null },
      }),
    );
    renderPage();
    await screen.findByRole("region", { name: "Versi terkunci" });

    // Act
    await user.click(await startButton());

    // Assert
    expect(startVersionMock).toHaveBeenCalledWith(CASE_ID);
    expect(await screen.findByLabelText("Judul")).toHaveValue("Judul draf versi 2");
    expect(screen.getByLabelText("Judul")).toBeEnabled();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(save()).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Versi terkunci" })).not.toBeInTheDocument();
    expect(toast()).toHaveTextContent("Versi baru dibuat");
    expect(getCaseMock).toHaveBeenCalledTimes(1);
  });

  // Negative
  it("keeps the case locked and shows the reason when a version is already in progress", async () => {
    // Arrange
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));
    startVersionMock.mockRejectedValue(new ApiError(409, "VERSION_IN_PROGRESS"));
    renderPage();
    await screen.findByRole("region", { name: "Versi terkunci" });

    // Act
    await user.click(await startButton());

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sudah ada versi baru yang sedang dikerjakan atau ditinjau.",
    );
    expect(screen.getByLabelText("Judul")).toBeDisabled();
  });

  // Negative: the server only lets the creator or an admin fork, so another author gets no button.
  it("keeps the case locked without a start button for an author who did not create it", async () => {
    // Arrange
    listVersionsMock.mockResolvedValue([
      makeSummary(1, { author: { id: "u2", name: "Penulis lain" } }),
      makeSummary(2, { author: { id: "u1", name: "Aileen" } }),
    ]);
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));

    // Act
    renderPage();
    await screen.findByRole("region", { name: "Versi terkunci" });
    await waitFor(() => expect(listVersionsMock).toHaveBeenCalledWith(CASE_ID));

    // Assert
    expect(noStartButton()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Judul")).toBeDisabled();
  });

  // Positive: an admin may fork any approved case, so no history lookup is needed.
  it("offers the start button to an admin without asking who created the case", async () => {
    // Arrange
    session.role = "admin";
    listVersionsMock.mockResolvedValue([makeSummary(1, { author: { id: "u2", name: "Penulis lain" } })]);
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));

    // Act
    renderPage();
    await screen.findByRole("region", { name: "Versi terkunci" });

    // Assert
    expect(await startButton()).toBeEnabled();
    expect(listVersionsMock).not.toHaveBeenCalled();
  });

  // Edge: if the creator cannot be told, the button stays hidden and the server remains the gate.
  it("keeps the button hidden for an author when the history cannot be read", async () => {
    // Arrange
    listVersionsMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));

    // Act
    renderPage();
    await screen.findByRole("region", { name: "Versi terkunci" });
    await waitFor(() => expect(listVersionsMock).toHaveBeenCalledWith(CASE_ID));

    // Assert
    expect(noStartButton()).not.toBeInTheDocument();
  });

  it.each(["reviewer", "viewer"] as const)(
    "shows the approved case without a start button to the %s",
    async (role) => {
      // Arrange
      session.role = role;
      getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));

      // Act
      renderPage();
      await screen.findByRole("region", { name: "Versi terkunci" });

      // Assert
      expect(screen.queryByRole("button", { name: "Edit (buat versi baru)" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Judul")).toBeDisabled();
    },
  );

  // Edge: a case in review is read only too, but cannot be forked.
  it("locks a case in review without offering a new version", async () => {
    // Arrange
    getCaseMock.mockResolvedValue(savedCase({ status: "in_review" }));

    // Act
    renderPage();
    const notice = await screen.findByRole("region", { name: "Versi terkunci" });

    // Assert
    expect(notice).toHaveTextContent("sedang ditinjau");
    expect(screen.queryByRole("button", { name: "Edit (buat versi baru)" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Judul")).toBeDisabled();
  });

  // Edge: drafts keep working exactly as before.
  it("shows neither the notice nor a lock on a draft", async () => {
    // Arrange
    getCaseMock.mockResolvedValue(savedCase({ status: "draft" }));

    // Act
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    // Assert
    expect(screen.queryByRole("region", { name: "Versi terkunci" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Judul")).toBeEnabled();
  });
});

describe("EditCasePage version history tab (SCRUM-138)", () => {
  const historyTab = () => screen.getByRole("tab", { name: "Riwayat versi" });

  // Positive: AC2
  it("opens the version history from the tab", async () => {
    // Arrange
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    listVersionsMock.mockResolvedValue([
      {
        version_no: 1,
        status: "approved",
        author: { id: "u1", name: "Aileen" },
        created_at: "2026-10-03T07:05:00Z",
        changed: [],
      },
    ]);
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    // Act
    await user.click(historyTab());

    // Assert
    expect(await screen.findByRole("row", { name: /Versi 1/ })).toBeInTheDocument();
    expect(listVersionsMock).toHaveBeenCalledWith(CASE_ID);
    expect(screen.getByRole("tab", { name: "Riwayat versi" })).toHaveAttribute("aria-selected", "true");
  });

  // Edge: the history is only requested when somebody looks at it.
  it("does not ask for the history until the tab is opened", async () => {
    // Arrange
    getCaseMock.mockResolvedValue(savedCase());

    // Act
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    // Assert
    expect(listVersionsMock).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Editor" })).toHaveAttribute("aria-selected", "true");
  });

  // Edge: switching tabs must not throw away what the author typed.
  it("keeps unsaved edits when the author looks at the history and comes back", async () => {
    // Arrange
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    listVersionsMock.mockResolvedValue([]);
    renderPage();
    const title = await screen.findByLabelText("Judul");
    await user.clear(title);
    await user.type(title, "Judul belum disimpan");

    // Act
    await user.click(historyTab());
    await screen.findByText("Belum ada riwayat versi");
    await user.click(screen.getByRole("tab", { name: "Editor" }));

    // Assert
    expect(screen.getByLabelText("Judul")).toHaveValue("Judul belum disimpan");
    expect(screen.getByText("Ada perubahan yang belum disimpan")).toBeInTheDocument();
  });

  // Negative
  it("shows the error inside the tab without breaking the editor", async () => {
    // Arrange
    const user = userEvent.setup();
    getCaseMock.mockResolvedValue(savedCase());
    listVersionsMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    // Act
    await user.click(historyTab());

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat riwayat versi.");
    await user.click(screen.getByRole("tab", { name: "Editor" }));
    expect(screen.getByLabelText("Judul")).toBeEnabled();
  });

  // Edge: every role may read the history (the server allows it).
  it.each(["author", "reviewer", "admin", "viewer"] as const)("lets the %s open the history", async (role) => {
    // Arrange
    const user = userEvent.setup();
    session.role = role;
    getCaseMock.mockResolvedValue(savedCase({ status: "approved" }));
    listVersionsMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole("heading", { name: "ILB-PT-0142" });

    // Act
    await user.click(historyTab());

    // Assert
    expect(await screen.findByText("Belum ada riwayat versi")).toBeInTheDocument();
  });
});
