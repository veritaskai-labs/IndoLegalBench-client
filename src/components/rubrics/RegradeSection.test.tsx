import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { makeFakeGateway, makeRubricSummary } from "@/test/rubricFixtures";
import type { Role } from "@/types";
import type { SessionGradingResponse } from "@/types/grading";
import { RegradeSection } from "./RegradeSection";

const v1 = makeRubricSummary({ id: "id-1", version_no: 1, is_active: false });
const v2 = makeRubricSummary({ id: "id-2", version_no: 2 });
const SESSION = { id: "s-1", status: "finished" as const, archived_at: null as string | null };
const BUTTON = "Nilai ulang dengan versi terbaru";
const REGRADED = gradingResponse({ grading_run_id: "run-2", kind: "regrade", rubric_version: "v2" });

function setup({
  rubrics = {},
  grade = vi.fn().mockResolvedValue(REGRADED),
  role = "admin",
  latest = gradingResponse(),
  session = SESSION,
}: {
  rubrics?: Partial<RubricsGateway>;
  grade?: GradingGateway["grade"];
  role?: Role | null;
  latest?: SessionGradingResponse | null;
  session?: typeof SESSION;
} = {}) {
  const rubricsGateway = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([v1, v2]), ...rubrics });
  const gradingGateway: GradingGateway = { grade, results: vi.fn(), sessions: vi.fn(), runs: vi.fn() };
  const onChanged = vi.fn();
  render(
    <ToastProvider>
      <RegradeSection
        session={session}
        role={role}
        latest={latest}
        gradingGateway={gradingGateway}
        rubricsGateway={rubricsGateway}
        onChanged={onChanged}
      />
    </ToastProvider>,
  );
  return { rubricsGateway, gradingGateway, onChanged, user: userEvent.setup() };
}

describe("RegradeSection (AC7: Nilai ulang dengan versi terbaru)", () => {
  // Positive: graded with v1 and v2 exists, so the Admin can re-grade.
  it("offers the button to an Admin when a newer rubric version exists", async () => {
    // Arrange / Act
    setup();

    // Assert
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
  });

  it("opens the dialog for the newest version and shows the result that stays", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Assert
    const dialog = within(screen.getByRole("dialog", { name: "Nilai ulang dengan versi terbaru?" }));
    expect(dialog.getByText(/akan dinilai ulang dengan Versi 2/)).toBeInTheDocument();
    expect(dialog.getByRole("list", { name: "Riwayat penilaian" })).toBeInTheDocument();
  });

  // Negative: other roles never see it, and nothing is requested (a 403 would redirect them away).
  it.each(["developer_ai", "viewer", "contributor", null] as const)("renders nothing and requests nothing for role %s", (role) => {
    // Arrange / Act
    const { rubricsGateway } = setup({ role });

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(rubricsGateway.listVersions).not.toHaveBeenCalled();
  });

  // Edge: the reason the button is off is written next to it.
  it.each([
    ["no rubric version", { rubrics: { listVersions: vi.fn().mockResolvedValue([]) } }, "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik."],
    ["a session never graded", { latest: null }, "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu."],
    ["a result already on the newest version", { latest: gradingResponse({ rubric_version: "v2" }) }, "Hasil terbaru sudah memakai versi rubrik terbaru."],
    [
      "an archived session",
      { session: { ...SESSION, archived_at: "2026-11-07T03:00:00Z" } },
      "Sesi ini belum bisa dinilai ulang. Hanya sesi yang berjalan atau sudah selesai, dan belum diarsipkan.",
    ],
  ])("turns the button off and explains %s", async (_name, overrides, reason) => {
    // Arrange / Act
    setup(overrides);

    // Assert
    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: BUTTON })).toBeDisabled();
  });

  // State: nothing is shown while the versions load, so the button does not flash on and off.
  it("shows nothing while the rubric versions are loading", () => {
    // Arrange / Act
    setup({ rubrics: { listVersions: vi.fn().mockReturnValue(new Promise(() => undefined)) } });

    // Assert
    expect(screen.queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
  });

  // State: error, with a retry. The failed list must not leave the button silently off.
  it("shows an error with a retry when the rubric versions cannot be loaded", async () => {
    // Arrange
    const user = userEvent.setup();
    const listVersions = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR")).mockResolvedValueOnce([v1, v2]);
    setup({ rubrics: { listVersions } });
    const alert = await screen.findByRole("alert");

    // Act
    await user.click(within(alert).getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(alert).toHaveTextContent("Gagal memuat daftar versi rubrik. Coba lagi.");
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
  });

  // Positive: after the re-grade the dialog closes, the page reloads the result and the Admin is told.
  it("closes the dialog, asks the page to reload and says the re-grade finished", async () => {
    // Arrange
    const { user, gradingGateway, onChanged } = setup();
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Act
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(gradingGateway.grade).toHaveBeenCalledWith("s-1", "v2");
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Penilaian ulang selesai dengan Versi 2.")).toBeInTheDocument();
  });

  // Negative: backing out starts nothing and reloads nothing.
  it("closes the dialog without a request when the Admin backs out", async () => {
    // Arrange
    const { user, gradingGateway, onChanged } = setup();
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Act
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(gradingGateway.grade).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  // Edge: after a refusal the shown result may no longer match the server, so closing asks for a reload.
  it("asks the page to reload when the dialog is closed after an error", async () => {
    // Arrange
    const refusal = new ApiError(409, "SESSION_NOT_GRADABLE");
    const { user, onChanged } = setup({ grade: vi.fn().mockRejectedValue(refusal) });
    await user.click(await screen.findByRole("button", { name: BUTTON }));
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));
    await dialog.findByRole("alert");

    // Act
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    // Assert
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
