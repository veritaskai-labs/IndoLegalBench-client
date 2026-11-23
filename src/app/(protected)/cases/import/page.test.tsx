import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importGateway } from "@/lib/cases/importApi";
import type { Role } from "@/types";
import CaseImportPage from "./page";

/**
 * Isolation: useAuth is vi.mock'ed so each role can be shown without a real session; next/navigation is
 * vi.mock'ed to observe the redirect; the real importGateway is spied on (no fetch), and saveBlob is mocked
 * because jsdom cannot save files.
 */
const { useAuthMock, replaceMock, saveBlobMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  saveBlobMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock, push: vi.fn() }) }));
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
