import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importGateway } from "@/lib/cases/importApi";
import type { Role } from "@/types";
import type { ImportSummary } from "@/types/caseImport";
import { ApiError } from "@/lib/apiClient";
import CaseImportPage from "./page";

/**
 * Isolation: useAuth is vi.mock'ed so each role can be shown without a real session; next/navigation is
 * vi.mock'ed to observe the redirect; the real importGateway is spied on (no fetch), and saveBlob is mocked
 * because jsdom cannot save files.
 */
const { useAuthMock, replaceMock, saveBlobMock, searchParams } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  saveBlobMock: vi.fn(),
  searchParams: { current: new URLSearchParams() },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParams.current,
}));
vi.mock("@/lib/browserDownload", () => ({ saveBlob: saveBlobMock }));

function signedInAs(role: Role) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id: "user-1", name: "Pengguna Uji", email: "uji@veritask.test", role },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  useAuthMock.mockReset();
  replaceMock.mockReset();
  saveBlobMock.mockReset();
  searchParams.current = new URLSearchParams();
});

describe("CaseImportPage (PBI-4 AC4-AC6)", () => {
  // Edge: the role is not known yet.
  it("waits for the session before deciding anything", () => {
    // Arrange
    useAuthMock.mockReturnValue({ status: "loading" });

    // Act
    render(<CaseImportPage />);

    // Assert
    expect(screen.getByText("Memuat…")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // Positive: D9 gives the import to Kontributor and Admin.
  it.each(["contributor", "admin"] as const)("shows the import page to the %s", (role) => {
    // Arrange
    signedInAs(role);

    // Act
    render(<CaseImportPage />);

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Impor kasus dari CSV" })).toBeInTheDocument();
    expect(screen.getByText(/Maks\. 500 baris per berkas/)).toBeInTheDocument();
    expect(screen.getByText(/masuk sebagai draf ke satu suite sementara/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Langkah 1: Unduh template" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unduh template CSV" })).toBeInTheDocument();
    expect(screen.getByText("Panduan menyiapkan CSV di Google Sheets")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // Positive: the page is one of the "Suite dan kasus" tabs (entry point next to the case list).
  it("shows the Suite dan kasus tabs with Impor CSV as the current one", () => {
    // Arrange
    signedInAs("contributor");

    // Act
    render(<CaseImportPage />);

    // Assert
    const tabs = screen.getByRole("navigation", { name: "Suite dan kasus" });
    expect(within(tabs).getByRole("link", { name: "Impor CSV" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Daftar kasus" })).not.toHaveAttribute("aria-current");
  });

  // Negative: other roles are sent to /forbidden and see nothing of the page (the server still answers 403).
  it.each(["viewer", "developer_ai"] as const)("sends the %s to /forbidden without rendering the page", (role) => {
    // Arrange
    signedInAs(role);

    // Act
    const { container } = render(<CaseImportPage />);

    // Assert
    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
    expect(container).toBeEmptyDOMElement();
  });

  // Positive: the page wires the real gateway to the button.
  it("downloads the template through the import API", async () => {
    // Arrange
    signedInAs("contributor");
    const template = new Blob(["title\r\n"], { type: "text/csv" });
    const download = vi.spyOn(importGateway, "downloadTemplate").mockResolvedValue(template);
    render(<CaseImportPage />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Unduh template CSV" }));

    // Assert
    expect(download).toHaveBeenCalledTimes(1);
    expect(saveBlobMock).toHaveBeenCalledWith(template, "template-impor-kasus.csv");
  });
});

const SUMMARY: ImportSummary = {
  batch_id: "b-1",
  file_name: "kasus-lama.csv",
  imported_by: "u-1",
  imported_at: "2026-11-23T14:00:00Z",
  suite_id: "s-1",
  suite_name: "Impor CSV 23 Nov 2026 21.00 WIB (b1)",
  total_rows: 2,
  success_count: 1,
  failed_count: 1,
  skipped_count: 0,
  rows: [
    { row_no: 2, status: "created", case_id: "c-2", case_code: "IMPOR-B1-002", reason: null },
    { row_no: 3, status: "failed", case_id: null, case_code: null, reason: "split_tag: isi dev, test, atau kosongkan." },
  ],
};

function chooseAndImport() {
  const file = new File(["title,question\r\nJudul contoh,Pertanyaan contoh\r\n"], "kasus-lama.csv", { type: "text/csv" });
  return (async () => {
    await userEvent.upload(screen.getByLabelText("Berkas CSV"), file);
    await userEvent.click(screen.getByRole("button", { name: "Impor" }));
    return file;
  })();
}

describe("CaseImportPage upload flow (AC4, AC7, AC10)", () => {
  // Edge: before the first import there is nothing to summarise.
  it("shows the upload step and an empty result area before any import", () => {
    // Arrange
    signedInAs("contributor");

    // Act
    render(<CaseImportPage />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Langkah 2: Unggah berkas" })).toBeInTheDocument();
    expect(screen.getByLabelText("Berkas CSV")).toBeInTheDocument();
    expect(screen.getByText("Belum ada berkas yang diimpor")).toBeInTheDocument();
  });

  // Positive: upload, then the summary replaces the form and the address keeps the batch for a refresh.
  it("shows the summary after an upload and puts the batch in the address", async () => {
    // Arrange
    signedInAs("admin");
    // Like Next: router.replace changes what useSearchParams returns on the next render.
    replaceMock.mockImplementation((url: string) => {
      searchParams.current = new URLSearchParams(url.split("?")[1] ?? "");
    });
    const upload = vi.spyOn(importGateway, "uploadCsv").mockResolvedValue(SUMMARY);
    const read = vi.spyOn(importGateway, "readSummary").mockResolvedValue(SUMMARY);
    render(<CaseImportPage />);

    // Act
    const file = await chooseAndImport();

    // Assert
    expect(upload).toHaveBeenCalledWith(file);
    expect(await screen.findByRole("heading", { level: 2, name: "Ringkasan impor" })).toBeInTheDocument();
    expect(screen.getByText("split_tag: isi dev, test, atau kosongkan.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Berkas CSV")).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/cases/import?batch=b-1");
    expect(read).not.toHaveBeenCalled();
  });

  // Positive: "Impor berkas lain" brings the form back and clears the address (re-upload is allowed, AC10).
  it("goes back to an empty form for another file", async () => {
    // Arrange
    signedInAs("contributor");
    vi.spyOn(importGateway, "uploadCsv").mockResolvedValue(SUMMARY);
    render(<CaseImportPage />);
    await chooseAndImport();

    // Act
    await userEvent.click(await screen.findByRole("button", { name: "Impor berkas lain" }));

    // Assert
    expect(screen.getByLabelText("Berkas CSV")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ringkasan impor" })).toBeNull();
    expect(replaceMock).toHaveBeenLastCalledWith("/cases/import");
  });

  // Positive: after a refresh, ?batch= reopens the stored summary.
  it("reopens the summary of the batch in the address", async () => {
    // Arrange
    signedInAs("contributor");
    searchParams.current = new URLSearchParams("batch=b-1");
    const read = vi.spyOn(importGateway, "readSummary").mockResolvedValue(SUMMARY);

    // Act
    render(<CaseImportPage />);

    // Assert
    expect(screen.getByText("Memuat ringkasan impor…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Ringkasan impor" })).toBeInTheDocument();
    expect(read).toHaveBeenCalledWith("b-1");
    expect(screen.queryByLabelText("Berkas CSV")).toBeNull();
  });

  // Negative: an unknown or foreign batch id in the address.
  it("explains a batch that cannot be found and offers the form again", async () => {
    // Arrange
    signedInAs("contributor");
    searchParams.current = new URLSearchParams("batch=b-x");
    vi.spyOn(importGateway, "readSummary").mockRejectedValue(
      new ApiError(404, "IMPORT_BATCH_NOT_FOUND", "Batch impor tidak ditemukan"),
    );
    render(<CaseImportPage />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Batch impor tidak ditemukan")).toBeInTheDocument();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Kembali ke formulir" }));

    // Assert: the form is back even though the mocked address still holds ?batch=b-x.
    expect(replaceMock).toHaveBeenCalledWith("/cases/import");
    expect(screen.getByLabelText("Berkas CSV")).toBeInTheDocument();
  });

  // Negative: a refused file keeps the user on the form with the reason (nothing stored, D7).
  it("keeps the form with the reason when the whole file is refused", async () => {
    // Arrange
    signedInAs("contributor");
    vi.spyOn(importGateway, "uploadCsv").mockRejectedValue(
      new ApiError(422, "IMPORT_TOO_MANY_ROWS", "Berkas berisi 501 baris kasus; maksimal 500 per berkas."),
    );
    render(<CaseImportPage />);

    // Act
    await chooseAndImport();

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Berkas berisi 501 baris kasus");
    expect(screen.getByLabelText("Berkas CSV")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
