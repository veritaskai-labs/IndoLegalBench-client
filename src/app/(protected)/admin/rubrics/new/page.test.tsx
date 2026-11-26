import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeRubricVersion } from "@/test/rubricFixtures";
import NewRubricVersionPage from "./page";

const gateway = vi.hoisted(() => ({ current: null as unknown as import("@/lib/rubrics/rubricsApi").RubricsGateway }));
vi.mock("@/lib/rubrics/rubricsApi", () => ({
  get httpRubricsGateway() {
    return gateway.current;
  },
}));

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

function renderPage() {
  render(
    <ToastProvider>
      <NewRubricVersionPage />
    </ToastProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  pushMock.mockReset();
  gateway.current = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([makeRubricVersion({ version_no: 8 })]) });
});

describe("Buat versi baru page (/admin/rubrics/new, SCRUM-375 B)", () => {
  // Positive: the title says the number the server will give (max + 1), and the trail leads back to the list.
  it("shows the next version number and a trail back to the list", async () => {
    // Arrange
    const user = renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Buat versi baru" })).toBeInTheDocument();
    expect(await screen.findByText("Akan disimpan sebagai Versi 9.")).toBeInTheDocument();

    // Act
    await user.click(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("button", { name: "Rubrik penilaian" }));

    // Assert
    expect(pushMock).toHaveBeenCalledWith("/admin/rubrics");
  });

  // Edge: the list fails; edge because the form must still work, only without a number it cannot know.
  it("keeps the form without a number when the list fails", async () => {
    // Arrange
    const listVersions = vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));
    gateway.current = makeFakeGateway({ listVersions });

    // Act
    renderPage();

    // Assert
    await waitFor(() => expect(listVersions).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Simpan versi" })).toBeInTheDocument();
    expect(screen.queryByText(/Akan disimpan sebagai/)).not.toBeInTheDocument();
  });

  // Positive (B6): Batal on an empty form goes straight back to the list.
  it("goes back to the list on Batal", async () => {
    // Arrange
    const user = renderPage();

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Assert
    expect(pushMock).toHaveBeenCalledWith("/admin/rubrics");
  });

  // Positive: after saving, back to the list with a message naming the number the server gave.
  it("returns to the list and names the saved version", async () => {
    // Arrange
    const created = makeRubricVersion({ id: "v-9", version_no: 9 });
    gateway.current = makeFakeGateway({
      listVersions: vi.fn().mockResolvedValue([makeRubricVersion({ version_no: 8 })]),
      createVersion: vi.fn().mockResolvedValue(created),
    });
    const user = renderPage();
    await screen.findByText("Akan disimpan sebagai Versi 9.");
    await user.click(screen.getByRole("button", { name: "Isi dari template rubrik v1" }));
    await user.click(screen.getByLabelText("Berlaku sejak"));
    await user.paste("2026-12-01");
    for (const label of ["Prompt penilai kualitas", "Prompt penilai format", "Definisi aspek 1", "Definisi aspek 2", "Definisi aspek 3"]) {
      await user.click(screen.getByLabelText(label));
      await user.paste("Teks");
    }

    // Act
    await user.click(screen.getByRole("button", { name: "Simpan versi" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Simpan Versi 9" }));

    // Assert
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin/rubrics"));
    expect(await screen.findByText("Versi 9 berhasil dibuat.")).toBeInTheDocument();
  });
});
