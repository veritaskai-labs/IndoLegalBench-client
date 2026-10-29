import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRegulationTypes } from "@/hooks/useRegulationTypes";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { getCase } from "@/lib/cases/caseApi";
import { previewLegalRefs } from "@/lib/cases/legalRefPreviewApi";
import { session } from "@/test/authMock";
import type { CaseRead } from "@/types/case";
import CaseReadPage from "./page";

const CASE_ID = "22222222-2222-2222-2222-222222222222";
const SUITE_ID = "11111111-1111-1111-1111-111111111111";

const { params, replace } = vi.hoisted(() => ({
  params: { id: "" },
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ replace }),
}));

// useSuiteName fetches the suite for the breadcrumb label.
vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiFetch: vi.fn() };
});

vi.mock("@/lib/cases/caseApi", () => ({ getCase: vi.fn() }));
vi.mock("@/hooks/useRegulationTypes", () => ({ useRegulationTypes: vi.fn() }));
vi.mock("@/lib/cases/legalRefPreviewApi", () => ({ previewLegalRefs: vi.fn() }));
vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));

const getCaseMock = vi.mocked(getCase);

function approvedDevCase(): CaseRead {
  return {
    id: CASE_ID,
    suite_id: SUITE_ID,
    case_code: "PHK-001",
    identity: { title: "Pemberitahuan PHK", question: "Wajib?", category: null },
    legal_refs: [],
    answer_criteria: { must_contain: [], must_not_contain: [], expected_conclusion: null },
    traps: [],
    split_tag: "dev",
    status: "approved",
    completeness_pct: 100,
    was_dev: false,
    version: 2,
    created_at: "2026-09-29T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  params.id = CASE_ID;
  session.role = "developer_ai";
  vi.mocked(apiFetch).mockResolvedValue({ id: SUITE_ID, name: "Ketenagakerjaan" });
  vi.mocked(useRegulationTypes).mockReturnValue({
    status: "ready",
    types: [{ code: "uu", label: "Undang-undang", singkatan: "UU", is_active: true }],
    reload: vi.fn(),
  });
});

describe("CaseReadPage (SCRUM-184)", () => {
  it("shows an approved dev case read-only, without save or submit actions", async () => {
    getCaseMock.mockResolvedValue(approvedDevCase());

    render(<CaseReadPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "PHK-001" })).toBeInTheDocument();
    expect(getCaseMock).toHaveBeenCalledWith(CASE_ID);
    expect(screen.getByDisplayValue("Pemberitahuan PHK")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Simpan draf/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ajukan review/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke suite" })).toHaveAttribute(
      "href",
      `/suites/${SUITE_ID}`,
    );
  });

  it("only calls routes developer AI may use", async () => {
    getCaseMock.mockResolvedValue(approvedDevCase());

    render(<CaseReadPage />);
    await screen.findByRole("heading", { level: 1, name: "PHK-001" });

    // Only the suite name for the breadcrumb; no versions, completeness or review calls.
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(`/suites/${SUITE_ID}`));
    expect(vi.mocked(apiFetch).mock.calls.map(([path]) => path)).toEqual([
      `/suites/${SUITE_ID}`,
    ]);
    expect(previewLegalRefs).not.toHaveBeenCalled();
  });

  it("explains that a test case cannot be opened", async () => {
    getCaseMock.mockRejectedValue(new ApiError(403, "TEST_CASE_HIDDEN"));

    render(<CaseReadPage />);

    expect(
      await screen.findByText("Kasus ini termasuk test set, jadi isinya tidak dapat dibuka."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke Suites" })).toHaveAttribute(
      "href",
      "/suites",
    );
  });

  it("says the case is not found when it is not approved yet", async () => {
    getCaseMock.mockRejectedValue(new ApiError(404, "CASE_NOT_FOUND"));

    render(<CaseReadPage />);

    expect(await screen.findByText("Kasus tidak ditemukan.")).toBeInTheDocument();
  });

  it.each(["contributor", "admin", "viewer"] as const)(
    "sends %s to the editor without loading the case here",
    (role) => {
      session.role = role;

      render(<CaseReadPage />);

      expect(replace).toHaveBeenCalledWith(`/cases/${CASE_ID}/edit`);
      expect(getCaseMock).not.toHaveBeenCalled();
    },
  );
});
