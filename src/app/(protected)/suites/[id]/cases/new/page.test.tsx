import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import { createCase } from "@/lib/cases/caseApi";
import type { CaseRead } from "@/types/case";
import NewCasePage from "./page";

const SUITE_ID = "11111111-1111-1111-1111-111111111111";

const { push, params } = vi.hoisted(() => ({
  push: vi.fn(),
  params: { id: "" },
}));

// The page reads the suite id from the URL and navigates after saving;
// next/navigation has no router outside Next, so both are stubbed.
vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ push }),
}));

// createCase has its own request-level tests. Here we only care how the
// page reacts to its result.
vi.mock("@/lib/cases/caseApi", () => ({ createCase: vi.fn() }));

// useSuiteName fetches the suite for the breadcrumb label.
vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiFetch: vi.fn() };
});

const createCaseMock = vi.mocked(createCase);

function createdCase(id: string): CaseRead {
  return {
    id,
    suite_id: SUITE_ID,
    case_code: "ILB-1",
    identity: { title: "", question: "", category: null },
    legal_refs: [],
    answer_criteria: { must_contain: [], must_not_contain: [], expected_conclusion: null },
    traps: [],
    split_tag: "dev",
    status: "draft",
    completeness_pct: 0,
    version: 1,
    created_at: "2026-09-29T00:00:00Z",
    updated_at: "2026-09-29T00:00:00Z",
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <NewCasePage />
    </ToastProvider>,
  );
}

function toast() {
  return screen.getByRole("status", { name: "Notifikasi" });
}

/**
 * Isi field yang wajib untuk menyimpan draf, supaya lolos validasi browser
 * (SCRUM-109) dan yang diuji di sini adalah jawaban server.
 */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  const code = screen.getByLabelText("ID kasus");
  if ((code as HTMLInputElement).value === "") await user.type(code, "ILB-1");
  await user.type(screen.getByLabelText("Judul"), "Pemberitahuan PHK");
  await user.type(screen.getByLabelText("Pertanyaan"), "Wajib?");
  const ref = within(screen.getByRole("group", { name: "Rujukan 1" }));
  await user.type(ref.getByLabelText("Jenis peraturan"), "UU");
  await user.type(ref.getByLabelText("Nomor"), "13");
  await user.type(ref.getByLabelText("Pasal"), "151");
  await user.click(screen.getByRole("radio", { name: /dev/ }));
}

beforeEach(() => {
  params.id = SUITE_ID;
  push.mockReset();
  createCaseMock.mockReset();
});

describe("NewCasePage", () => {
  // Positive
  it("shows the heading, the Draft badge, and the editor", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Kasus baru" })).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Identitas" })).toBeInTheDocument();
  });

  it("creates the case in this suite, shows a toast, and opens the edit page", async () => {
    const user = userEvent.setup();
    createCaseMock.mockResolvedValue(createdCase("22222222-2222-2222-2222-222222222222"));
    renderPage();

    await user.type(screen.getByLabelText("ID kasus"), "ILB-1");
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(createCaseMock).toHaveBeenCalledTimes(1);
    expect(createCaseMock.mock.calls[0]?.[0]).toBe(SUITE_ID);
    expect(createCaseMock.mock.calls[0]?.[1]).toMatchObject({ case_code: "ILB-1" });
    expect(toast()).toHaveTextContent("Kasus tersimpan sebagai draf");
    expect(push).toHaveBeenCalledWith(
      "/cases/22222222-2222-2222-2222-222222222222/edit",
    );
  });

  // Negative
  it("shows a general error and stays on the page when the save fails", async () => {
    const user = userEvent.setup();
    createCaseMock.mockRejectedValue(new ApiError(500, "UNKNOWN_ERROR"));
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Gagal menyimpan kasus. Coba lagi.",
    );
    expect(push).not.toHaveBeenCalled();
    expect(toast()).toBeEmptyDOMElement();
  });

  it("shows the same general error on a network failure", async () => {
    const user = userEvent.setup();
    createCaseMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Gagal menyimpan kasus. Coba lagi.",
    );
  });

  // Server errors that belong to a field go to the form, not the banner.
  // Bodies copied from the real server (local stack, 2026-09-29).
  it("shows 409 CASE_CODE_TAKEN under ID kasus with the owning suite, without a banner", async () => {
    const user = userEvent.setup();
    createCaseMock.mockRejectedValue(
      new ApiError(409, "CASE_CODE_TAKEN", "Kode kasus 'SMOKE-1' sudah dipakai di suite 'test1'"),
    );
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    await waitFor(() =>
      expect(screen.getByLabelText("ID kasus")).toHaveAccessibleDescription(
        "Kode kasus 'SMOKE-1' sudah dipakai di suite 'test1'",
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a 422 on the exact legal reference row", async () => {
    const user = userEvent.setup();
    createCaseMock.mockRejectedValue(
      new ApiError(
        422,
        "FIELD_REQUIRED",
        "Field legal_refs[0].pasal wajib diisi",
        "legal_refs[0].pasal",
      ),
    );
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    const row = screen.getByRole("group", { name: "Rujukan 1" });
    await waitFor(() =>
      expect(within(row).getByLabelText("Pasal")).toHaveAccessibleDescription(
        "Field legal_refs[0].pasal wajib diisi",
      ),
    );
  });

  it("shows an archived suite as a banner", async () => {
    const user = userEvent.setup();
    createCaseMock.mockRejectedValue(new ApiError(422, "SUITE_NOT_ACTIVE", "Suite tidak aktif"));
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Suite sudah diarsipkan, jadi kasus tidak bisa disimpan.",
    );
  });

  it("clears the banner when the next save fails on a field instead", async () => {
    const user = userEvent.setup();
    createCaseMock
      .mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"))
      .mockRejectedValueOnce(
        new ApiError(422, "SPLIT_TAG_REQUIRED", "Tag dev/test wajib diisi", "split_tag"),
      );
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    const tags = screen.getByRole("group", { name: "Tag dev/test" });
    expect(await within(tags).findByText("Tag dev/test wajib diisi")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Corner: retry after a failure
  it("clears the old error when the author retries and the save succeeds", async () => {
    const user = userEvent.setup();
    createCaseMock
      .mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"))
      .mockResolvedValueOnce(createdCase("case-2"));
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/cases/case-2/edit"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("decodes the suite id from the URL once, so it is not encoded twice", async () => {
    const user = userEvent.setup();
    params.id = "%7Bid%7D";
    createCaseMock.mockRejectedValue(new ApiError(422, "VALIDATION_ERROR"));
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(createCaseMock.mock.calls[0]?.[0]).toBe("{id}");
  });

  it("encodes the created id in the redirect path", async () => {
    const user = userEvent.setup();
    createCaseMock.mockResolvedValue(createdCase("a/b?c"));
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(push).toHaveBeenCalledWith("/cases/a%2Fb%3Fc/edit");
  });
  it("shows the breadcrumb down to the new case", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ name: "Suite Ketenagakerjaan" });

    renderPage();

    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("Suite");
    expect(nav).toHaveTextContent("Kasus baru");
    expect(within(nav).getByRole("link", { name: "Suite" })).toHaveAttribute(
      "href",
      "/suites",
    );
  });

  it("offers a way back to the suite", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ name: "Suite Ketenagakerjaan" });

    renderPage();

    expect(
      await screen.findByRole("link", { name: "Kembali ke suite" }),
    ).toHaveAttribute("href", `/suites/${SUITE_ID}`);
  });

});
