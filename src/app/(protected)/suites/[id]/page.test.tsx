import { Suspense } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SuiteDetailPage from "./page";
import * as casesApi from "@/lib/api/cases";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/cases");

// Keep the real ApiError, mock only apiFetch (used for GET /suites/{id})
vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiFetch: vi.fn() };
});

const activeSuite: Suite = {
  id: "suite-123",
  name: "Suite Ketenagakerjaan",
  description: "Kasus hukum ketenagakerjaan",
  status: "active",
  case_count: 2,
  is_empty: false,
  exportable: true,
  created_at: "2026-09-19T10:00:00Z",
  updated_at: "2026-09-28T10:00:00Z",
};
const archivedSuite: Suite = { ...activeSuite, status: "archived", exportable: false };

const mockCases: casesApi.CaseSummary[] = [
  {
    id: "9c1b3f94-91eb-4c8d-8a07-887e5b2e9871",
    case_code: "PHK-001",
    title: "Kompensasi PHK efisiensi perusahaan",
    split_tag: "dev",
    status: "in_review",
    completeness_pct: 85,
    updated_at: "2026-09-28T10:00:00Z",
  },
  {
    id: "2d1b3f94-91eb-4c8d-8a07-887e5b2e9872",
    case_code: "PKWT-002",
    title: "Masa berlaku PKWT kompensasi",
    split_tag: "test",
    status: "approved",
    completeness_pct: 100,
    updated_at: "2026-09-27T10:00:00Z",
  },
];

// use(params) suspends on first render, so wrap in Suspense and await act
async function renderPage(id = "suite-123") {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <SuiteDetailPage params={Promise.resolve({ id })} />
      </Suspense>
    );
  });
}

describe("SuiteDetailPage (SCRUM-110)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(activeSuite);
  });

  it("menampilkan skeleton saat data kasus sedang dimuat", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    await renderPage();

    expect(screen.getAllByRole("cell").length).toBeGreaterThan(0);
    expect(screen.queryByText("Belum ada kasus di suite ini")).not.toBeInTheDocument();
  });

  it("menampilkan header suite (nama, deskripsi, status)", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockResolvedValue(mockCases);

    await renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Suite Ketenagakerjaan" })
    ).toBeInTheDocument();
    expect(screen.getByText("Kasus hukum ketenagakerjaan")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/suites/suite-123");
  });

  it("merender daftar kasus dengan status dan kelengkapan", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockResolvedValue(mockCases);

    await renderPage();

    const table = await screen.findByRole("table");
    await waitFor(() => {
      expect(within(table).getByText("PHK-001")).toBeInTheDocument();
    });
    // Scoped to the table: the filter <option>s also contain "In review" / "Approved"
    expect(within(table).getByText("PKWT-002")).toBeInTheDocument();
    expect(within(table).getByText("85%")).toBeInTheDocument();
    expect(within(table).getByText("100%")).toBeInTheDocument();
    expect(within(table).getByText("In review")).toBeInTheDocument();
    expect(within(table).getByText("Approved")).toBeInTheDocument();
  });

  it("menampilkan EmptyState dan tombol Tulis Kasus Sekarang di suite aktif", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockResolvedValue([]);

    await renderPage();

    expect(await screen.findByText("Belum ada kasus di suite ini")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Tulis Kasus Sekarang" }));
    expect(pushMock).toHaveBeenCalledWith("/suites/suite-123/cases/new");
  });

  it("tombol Tulis Kasus di header membuka form kasus baru", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockResolvedValue(mockCases);

    await renderPage();

    const button = await screen.findByRole("button", { name: "Tulis Kasus" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(pushMock).toHaveBeenCalledWith("/suites/suite-123/cases/new");
  });

  it("menonaktifkan Tulis Kasus di suite yang diarsipkan", async () => {
    vi.mocked(apiFetch).mockResolvedValue(archivedSuite);
    vi.mocked(casesApi.getCasesForSuite).mockResolvedValue([]);

    await renderPage();

    expect(
      await screen.findByText("Suite diarsipkan, kasus baru tidak bisa ditulis.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tulis Kasus" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Tulis Kasus Sekarang" })
    ).not.toBeInTheDocument();
  });

  it("mendukung pemilihan multiple status dan menyaring data di sisi client", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockResolvedValue(mockCases);

    await renderPage();
    await screen.findByText("PHK-001");

    fireEvent.click(screen.getByRole("button", { name: "In review" }));

    await waitFor(() => {
      expect(casesApi.getCasesForSuite).toHaveBeenCalledWith("suite-123", {
        status: "in_review",
        split_tag: undefined,
      });
    });

    fireEvent.change(screen.getByLabelText("Tag:"), { target: { value: "dev" } });

    await waitFor(() => {
      expect(casesApi.getCasesForSuite).toHaveBeenCalledWith("suite-123", {
        status: "in_review",
        split_tag: "dev",
      });
    });
  });

  it("mengabaikan respons lama saat filter berubah cepat", async () => {
    let resolveFirst!: (value: casesApi.CaseSummary[]) => void;
    vi.mocked(casesApi.getCasesForSuite)
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; })
      )
      .mockResolvedValueOnce([mockCases[1]]);

    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Approved" }));
    await screen.findByText("PKWT-002");

    // The first (stale) request finishes last and must not overwrite the table
    await act(async () => {
      resolveFirst(mockCases);
    });

    expect(screen.queryByText("PHK-001")).not.toBeInTheDocument();
    expect(screen.getByText("PKWT-002")).toBeInTheDocument();
  });

  it.each([
    [404, "Suite tidak ditemukan atau telah dihapus."],
    [422, "Suite tidak ditemukan atau telah dihapus."],
    [403, "Anda tidak memiliki izin untuk melihat suite ini."],
  ])("error %i menggantikan seluruh halaman tanpa tombol coba lagi", async (status, message) => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(status, "err"));
    vi.mocked(casesApi.getCasesForSuite).mockRejectedValue(new ApiError(status, "err"));

    await renderPage();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /coba lagi/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke Suites" })).toHaveAttribute(
      "href",
      "/suites"
    );
  });

  it("menampilkan ErrorState untuk error 5xx dan memuat ulang lewat tombol coba lagi", async () => {
    vi.mocked(casesApi.getCasesForSuite).mockRejectedValueOnce(new ApiError(500, "server_error"));

    await renderPage();

    expect(
      await screen.findByText("Gagal memuat data. Silakan coba beberapa saat lagi.")
    ).toBeInTheDocument();

    vi.mocked(casesApi.getCasesForSuite).mockResolvedValueOnce(mockCases);
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }));

    expect(await screen.findByText("PHK-001")).toBeInTheDocument();
  });
});