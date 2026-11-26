import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeRubricVersion } from "@/test/rubricFixtures";
import RubricsPage from "./page";

// The gateway has its own request tests (stubbed fetch); here only the page's reaction matters.
const gateway = vi.hoisted(() => ({ current: null as unknown as import("@/lib/rubrics/rubricsApi").RubricsGateway }));
vi.mock("@/lib/rubrics/rubricsApi", () => ({
  get httpRubricsGateway() {
    return gateway.current;
  },
}));

const v1 = makeRubricVersion();
const v2 = makeRubricVersion({ id: "v-2", version_no: 2, is_active: false, approved_by_name: null, approved_at: null });

beforeEach(() => {
  gateway.current = makeFakeGateway();
});

describe("Rubrik page (/admin/rubrics, PBI-14 AC7, SCRUM-375 A)", () => {
  // Positive: the list newest first, and writing a version is one button away on its own page (B).
  it("lists the versions newest first with a button to the new version page", async () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([v1, v2]) });

    // Act
    render(<RubricsPage />);

    // Assert
    const table = await screen.findByRole("table", { name: "Versi rubrik" });
    const titles = within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(titles).toEqual(["Versi 2", "Versi 1"]);
    expect(screen.getByRole("heading", { level: 1, name: "Rubrik penilaian" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buat versi baru" })).toHaveAttribute("href", "/admin/rubrics/new");
  });

  // Positive: the rule that versions never change stays next to the title.
  it("says that versions are never changed in place", () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockReturnValue(new Promise(() => undefined)) });

    // Act
    render(<RubricsPage />);

    // Assert
    expect(
      screen.getByText("Versi rubrik tidak pernah diubah. Perubahan dibuat sebagai versi baru, dan hasil lama tetap memakai versinya."),
    ).toBeInTheDocument();
  });

  // State: loading, shown until the list arrives.
  it("shows a loading state first", () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockReturnValue(new Promise(() => undefined)) });

    // Act
    render(<RubricsPage />);

    // Assert
    expect(screen.getByText("Memuat konten…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // State: empty, the button to start is still there.
  it("shows the empty state and keeps the button when there is no version yet", async () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([]) });

    // Act
    render(<RubricsPage />);

    // Assert
    expect((await screen.findAllByText("Belum ada versi rubrik")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Buat versi baru" })).toBeInTheDocument();
  });

  // State (A3): error, says the data is safe and offers a retry that loads again.
  it("shows an error with a retry that loads the list again", async () => {
    // Arrange
    const user = userEvent.setup();
    const listVersions = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR")).mockResolvedValueOnce([v1]);
    gateway.current = makeFakeGateway({ listVersions });
    render(<RubricsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Daftar versi rubrik gagal dimuat. Periksa koneksi, lalu coba lagi. Data rubrik tidak berubah.");

    // Act
    await user.click(within(alert).getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("table", { name: "Versi rubrik" })).toBeInTheDocument();
    expect(listVersions).toHaveBeenCalledTimes(2);
  });

  // Edge: the button stays when the list fails; edge because a first version must still be writable while the list is down.
  it("keeps the new version button when the list fails to load", async () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL_ERROR")) });

    // Act
    render(<RubricsPage />);
    await screen.findByRole("alert");

    // Assert
    expect(screen.getByRole("link", { name: "Buat versi baru" })).toBeInTheDocument();
  });
});
