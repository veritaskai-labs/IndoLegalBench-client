import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
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

function renderPage() {
  render(
    <ToastProvider>
      <RubricsPage />
    </ToastProvider>,
  );
}

const v1 = makeRubricVersion();
const v2 = makeRubricVersion({ id: "v-2", version_no: 2, is_active: false, approved_by_name: null, approved_at: null });

beforeEach(() => {
  gateway.current = makeFakeGateway();
});

describe("Rubrik page (/admin/rubrics, PBI-14 AC7)", () => {
  // Positive
  it("lists the versions newest first with the form to write a new one below", async () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([v1, v2]) });

    // Act
    renderPage();

    // Assert
    const table = await screen.findByRole("table", { name: "Versi rubrik" });
    const titles = within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(titles).toEqual(["Versi 2", "Versi 1"]);
    expect(screen.getByRole("heading", { level: 1, name: "Rubrik penilaian" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan versi baru" })).toBeInTheDocument();
  });

  // State: loading, shown until the list arrives.
  it("shows a loading state first", () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockReturnValue(new Promise(() => undefined)) });

    // Act
    renderPage();

    // Assert
    expect(screen.getByText("Memuat konten…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // State: empty, the way to start is the form and the v1 template.
  it("shows an empty state and still offers the form when there is no version yet", async () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([]) });

    // Act
    renderPage();

    // Assert
    expect(await screen.findByText("Belum ada versi rubrik")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Isi dari template rubrik v1" })).toBeInTheDocument();
  });

  // State: error, with a retry that loads again.
  it("shows an error with a retry that loads the list again", async () => {
    // Arrange
    const user = userEvent.setup();
    const listVersions = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR")).mockResolvedValueOnce([v1]);
    gateway.current = makeFakeGateway({ listVersions });
    renderPage();
    const alert = await screen.findByRole("alert");

    // Act
    await user.click(within(alert).getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(alert).toHaveTextContent("Gagal memuat daftar versi rubrik. Coba lagi.");
    expect(await screen.findByRole("table", { name: "Versi rubrik" })).toBeInTheDocument();
    expect(listVersions).toHaveBeenCalledTimes(2);
  });

  // Edge: the form is still there when the list fails, so a first version can be written anyway.
  it("keeps the form when the list fails to load", async () => {
    // Arrange
    gateway.current = makeFakeGateway({ listVersions: vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL_ERROR")) });

    // Act
    renderPage();
    await screen.findByRole("alert");

    // Assert
    expect(screen.getByRole("button", { name: "Simpan versi baru" })).toBeInTheDocument();
  });

  // Positive: a saved version shows up in the list and the Admin is told.
  it("reloads the list and says so after a version is saved", async () => {
    // Arrange
    const user = userEvent.setup();
    const created = makeRubricVersion({ id: "v-2", version_no: 2, is_active: false });
    const listVersions = vi.fn().mockResolvedValueOnce([v1]).mockResolvedValueOnce([v1, created]);
    gateway.current = makeFakeGateway({ listVersions, createVersion: vi.fn().mockResolvedValue(created) });
    renderPage();
    await screen.findByRole("table", { name: "Versi rubrik" });

    // Act
    await user.click(screen.getByRole("button", { name: "Simpan versi baru" }));

    // Assert
    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Versi 2")).toBeInTheDocument());
    expect(listVersions).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Versi 2 berhasil dibuat.")).toBeInTheDocument();
  });

  // Negative: a refused version is not added to the list and no success message is shown.
  it("does not reload or announce anything when the server refuses the version", async () => {
    // Arrange
    const user = userEvent.setup();
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Nama aspek wajib diisi", "aspects[0].name");
    const listVersions = vi.fn().mockResolvedValue([v1]);
    gateway.current = makeFakeGateway({ listVersions, createVersion: vi.fn().mockRejectedValue(refusal) });
    renderPage();
    await screen.findByRole("table", { name: "Versi rubrik" });

    // Act
    await user.click(screen.getByRole("button", { name: "Simpan versi baru" }));

    // Assert
    expect(await screen.findByText("Nama aspek wajib diisi", { selector: "[role='alert']" })).toBeInTheDocument();
    expect(listVersions).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/berhasil dibuat/)).not.toBeInTheDocument();
  });
});
