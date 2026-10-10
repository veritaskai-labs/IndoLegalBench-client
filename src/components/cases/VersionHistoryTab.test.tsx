import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { makeSummary } from "@/test/versionFixtures";
import type { VersionSummary } from "@/types/caseVersion";
import { VersionHistoryTab } from "./VersionHistoryTab";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));

const listMock = vi.mocked(listCaseVersions);

const version = (overrides: Partial<VersionSummary> = {}) => makeSummary(1, overrides);

beforeEach(() => {
  listMock.mockReset();
});

describe("VersionHistoryTab", () => {
  // Positive: AC2, who, when and which part.
  it("shows the author, the time in WIB and the changed sections of a version", async () => {
    // Arrange
    listMock.mockResolvedValue([
      version({
        version_no: 2,
        status: "draft",
        author: { id: "u2", name: "Adra" },
        created_at: "2026-10-04T08:30:00Z",
        changed: ["category", "legal_refs"],
      }),
    ]);

    // Act
    render(<VersionHistoryTab caseId="case-1" />);
    const row = (await screen.findByRole("row", { name: /Versi 2/ }));

    // Assert
    expect(within(row).getByText("Adra")).toBeInTheDocument();
    expect(within(row).getByText("04 Okt 2026, 15.30 WIB")).toBeInTheDocument();
    expect(within(row).getByText("Kategori, Rujukan hukum")).toBeInTheDocument();
    expect(within(row).getByText("Draft")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith("case-1");
  });

  it("puts the newest version first even when the server sends the oldest first", async () => {
    // Arrange
    listMock.mockResolvedValue([version({ version_no: 1 }), version({ version_no: 3 }), version({ version_no: 2 })]);

    // Act
    render(<VersionHistoryTab caseId="case-1" />);
    await screen.findByRole("row", { name: /Versi 3/ });

    // Assert
    const order = screen.getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(order).toEqual(["Versi 3", "Versi 2", "Versi 1"]);
  });

  it("calls version 1 the first version instead of showing an empty cell", async () => {
    // Arrange
    listMock.mockResolvedValue([version({ version_no: 1, changed: [] })]);

    // Act
    render(<VersionHistoryTab caseId="case-1" />);

    // Assert
    expect(await screen.findByText("Versi pertama")).toBeInTheDocument();
  });

  // AC4: the compare section only makes sense with two versions.
  it("offers to compare versions once the case has two or more", async () => {
    // Arrange
    listMock.mockResolvedValue([version({ version_no: 1 }), version({ version_no: 2 })]);

    // Act
    render(<VersionHistoryTab caseId="case-1" />);

    // Assert
    expect(await screen.findByRole("region", { name: "Bandingkan versi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bandingkan" })).toBeEnabled();
  });

  it("explains that a single version cannot be compared", async () => {
    // Arrange
    listMock.mockResolvedValue([version({ version_no: 1 })]);

    // Act
    render(<VersionHistoryTab caseId="case-1" />);

    // Assert
    expect(await screen.findByText("Perlu minimal dua versi untuk dibandingkan.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Bandingkan versi" })).not.toBeInTheDocument();
  });

  // Loading
  it("shows a loading state while the history is being read", () => {
    // Arrange
    listMock.mockReturnValue(new Promise(() => undefined));

    // Act
    render(<VersionHistoryTab caseId="case-1" />);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Memuat riwayat versi…");
  });

  // Empty
  it("shows an empty state when the case has no versions", async () => {
    // Arrange
    listMock.mockResolvedValue([]);

    // Act
    render(<VersionHistoryTab caseId="case-1" />);

    // Assert
    expect(await screen.findByText("Belum ada riwayat versi")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // Error
  it("shows the error and loads again when the user retries", async () => {
    // Arrange
    const user = userEvent.setup();
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    listMock.mockResolvedValueOnce([version({ version_no: 1 })]);
    render(<VersionHistoryTab caseId="case-1" />);
    await screen.findByRole("alert");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("row", { name: /Versi 1/ })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("explains a missing case without hiding the retry", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(404, "CASE_NOT_FOUND"));

    // Act
    render(<VersionHistoryTab caseId="case-1" />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Kasus tidak ditemukan.");
  });
});
