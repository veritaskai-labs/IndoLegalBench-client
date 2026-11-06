import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { Role } from "@/types";
import { makeFakeGateway, makeGradingRun, makeRubricVersion } from "@/test/rubricFixtures";
import { RegradeSection } from "./RegradeSection";

const v1 = makeRubricVersion();
const v2 = makeRubricVersion({ id: "v-2", version_no: 2, is_active: false });
const BUTTON = "Nilai ulang dengan versi terbaru";

function setup(overrides: Partial<RubricsGateway> = {}, role: Role | null = "admin") {
  const gateway = makeFakeGateway({
    listVersions: vi.fn().mockResolvedValue([v1, v2]),
    listGradingRuns: vi.fn().mockResolvedValue([makeGradingRun()]),
    ...overrides,
  });
  render(
    <ToastProvider>
      <RegradeSection sessionId="s-1" role={role} gateway={gateway} />
    </ToastProvider>,
  );
  return { gateway, user: userEvent.setup() };
}

describe("RegradeSection (AC7: Nilai ulang dengan versi terbaru)", () => {
  // Positive: graded with v1 and v2 exists, so the Admin can re-grade.
  it("offers the button to an Admin when a newer rubric version exists", async () => {
    // Arrange / Act
    setup();

    // Assert
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
  });

  it("opens the dialog for the newest version and keeps the old results visible", async () => {
    // Arrange
    const { user } = setup();
    const button = await screen.findByRole("button", { name: BUTTON });

    // Act
    await user.click(button);

    // Assert
    const dialog = within(screen.getByRole("dialog", { name: "Nilai ulang dengan versi terbaru?" }));
    expect(dialog.getByText(/akan dinilai ulang dengan Versi 2/)).toBeInTheDocument();
    expect(dialog.getByRole("list", { name: "Riwayat penilaian" })).toBeInTheDocument();
  });

  // Negative: other roles never see it, and nothing is requested (a 403 would redirect them away).
  it.each(["developer_ai", "viewer", "contributor", null] as const)("renders nothing and requests nothing for role %s", (role) => {
    // Arrange / Act
    const { gateway } = setup({}, role);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(gateway.listVersions).not.toHaveBeenCalled();
    expect(gateway.listGradingRuns).not.toHaveBeenCalled();
  });

  // Edge: the reason the button is off is written next to it.
  it.each([
    ["no rubric version", { listVersions: vi.fn().mockResolvedValue([]) }, "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik."],
    ["a session never graded", { listGradingRuns: vi.fn().mockResolvedValue([]) }, "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu."],
    ["a result already on the newest version", { listVersions: vi.fn().mockResolvedValue([v1]) }, "Hasil terbaru sudah memakai versi rubrik terbaru."],
    [
      "a grading run in progress",
      { listGradingRuns: vi.fn().mockResolvedValue([makeGradingRun({ id: "r-2", status: "running", is_latest: false }), makeGradingRun()]) },
      "Penilaian sedang berjalan. Tunggu sampai selesai.",
    ],
  ] as const)("turns the button off and explains %s", async (_name, overrides, reason) => {
    // Arrange / Act
    setup(overrides);

    // Assert
    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: BUTTON })).toBeDisabled();
  });

  // State: nothing is shown while the data loads, so the button does not flash on and off.
  it("shows nothing while the data is loading", () => {
    // Arrange / Act
    setup({ listVersions: vi.fn().mockReturnValue(new Promise(() => undefined)) });

    // Assert
    expect(screen.queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
  });

  // State: error, with a retry.
  it("shows an error with a retry when the history cannot be loaded", async () => {
    // Arrange
    const user = userEvent.setup();
    const listGradingRuns = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR")).mockResolvedValueOnce([makeGradingRun()]);
    setup({ listGradingRuns });
    const alert = await screen.findByRole("alert");

    // Act
    await user.click(within(alert).getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(alert).toHaveTextContent("Gagal memuat riwayat penilaian. Coba lagi.");
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
  });

  // State: error on the other call. The rubric list failing must not leave the button silently off.
  it("shows an error with a retry when the rubric versions cannot be loaded", async () => {
    // Arrange
    const user = userEvent.setup();
    const listVersions = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR")).mockResolvedValueOnce([v1, v2]);
    setup({ listVersions });
    const alert = await screen.findByRole("alert");

    // Act
    await user.click(within(alert).getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(alert).toHaveTextContent("Gagal memuat daftar versi rubrik. Coba lagi.");
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
  });

  // Positive: after the re-grade starts, the dialog closes, the history reloads and the Admin is told.
  it("closes the dialog, reloads the history and says the re-grade started", async () => {
    // Arrange
    const started = makeGradingRun({ id: "r-2", kind: "regrade", rubric_version_id: "v-2", rubric_version_no: 2, status: "queued", is_latest: false });
    const listGradingRuns = vi.fn().mockResolvedValueOnce([makeGradingRun()]).mockResolvedValueOnce([started, makeGradingRun()]);
    const { user, gateway } = setup({ listGradingRuns, regrade: vi.fn().mockResolvedValue(started) });
    await user.click(await screen.findByRole("button", { name: BUTTON }));
    const dialog = within(screen.getByRole("dialog"));

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(gateway.regrade).toHaveBeenCalledWith("s-1", { rubric_version_id: "v-2" });
    expect(listGradingRuns).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Penilaian ulang dimulai dengan Versi 2.")).toBeInTheDocument();
  });

  // Edge: a run in progress turns the button off right after the re-grade started.
  it("turns the button off once the reloaded history has a run in progress", async () => {
    // Arrange
    const started = makeGradingRun({ id: "r-2", kind: "regrade", rubric_version_no: 2, status: "queued", is_latest: false });
    const listGradingRuns = vi.fn().mockResolvedValueOnce([makeGradingRun()]).mockResolvedValueOnce([started, makeGradingRun()]);
    const { user } = setup({ listGradingRuns, regrade: vi.fn().mockResolvedValue(started) });
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Act
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Nilai ulang" }));

    // Assert
    expect(await screen.findByText("Penilaian sedang berjalan. Tunggu sampai selesai.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: BUTTON })).toBeDisabled();
  });

  // Negative: backing out starts nothing and reloads nothing.
  it("closes the dialog without a request when the Admin backs out", async () => {
    // Arrange
    const { user, gateway } = setup();
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Act
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(gateway.regrade).not.toHaveBeenCalled();
    expect(gateway.listGradingRuns).toHaveBeenCalledTimes(1);
  });

  // Edge: after a refusal the history may no longer match the server, so closing reloads it.
  it("reloads the history when the dialog is closed after an error", async () => {
    // Arrange
    const refusal = new ApiError(409, "SESSION_NOT_GRADABLE", "Sesi masih berjalan");
    const { user, gateway } = setup({ regrade: vi.fn().mockRejectedValue(refusal) });
    await user.click(await screen.findByRole("button", { name: BUTTON }));
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));
    await dialog.findByRole("alert");

    // Act
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    // Assert
    await waitFor(() => expect(gateway.listGradingRuns).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
