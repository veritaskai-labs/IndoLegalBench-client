import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import { createCase } from "@/lib/cases/caseApi";
import type { components } from "@/lib/generated/api";
import NewCasePage from "./page";

const SUITE_ID = "11111111-1111-1111-1111-111111111111";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

// The page reads the suite id from the URL and navigates after saving;
// next/navigation has no router outside Next, so both are stubbed.
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: SUITE_ID }),
  useRouter: () => ({ push }),
}));

// createCase has its own request-level tests. Here we only care how the
// page reacts to its result.
vi.mock("@/lib/cases/caseApi", () => ({ createCase: vi.fn() }));

const createCaseMock = vi.mocked(createCase);

function createdCase(id: string): components["schemas"]["CaseRead"] {
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

beforeEach(() => {
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

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Gagal menyimpan kasus. Coba lagi.",
    );
  });

  // Corner: retry after a failure
  it("clears the old error when the author retries and the save succeeds", async () => {
    const user = userEvent.setup();
    createCaseMock
      .mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"))
      .mockResolvedValueOnce(createdCase("case-2"));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/cases/case-2/edit"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("encodes the created id in the redirect path", async () => {
    const user = userEvent.setup();
    createCaseMock.mockResolvedValue(createdCase("a/b?c"));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(push).toHaveBeenCalledWith("/cases/a%2Fb%3Fc/edit");
  });
});
