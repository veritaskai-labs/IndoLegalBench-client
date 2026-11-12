import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import { gradingResponse, gradingRunSummary } from "@/test/gradingFixtures";
import { makeFakeGateway, makeRubricSummary } from "@/test/rubricFixtures";
import type { Role } from "@/types";
import type { SessionGradingResponse } from "@/types/grading";
import { RegradeSection } from "./RegradeSection";

const v1 = makeRubricSummary({ id: "id-1", version_no: 1, is_active: false });
const v2 = makeRubricSummary({ id: "id-2", version_no: 2 });
const SESSION = { id: "s-1", status: "finished" as const, archived_at: null as string | null };
const BUTTON = "Nilai ulang";
const REGRADED = gradingResponse({ grading_run_id: "run-2", kind: "regrade", rubric_version: "v2" });
const JUDGE_A = { judge_provider_id: "judge-a", name: "DeepSeek", model_version: "deepseek-chat", cost_idr: null };
const judgeApi: JudgeOptionsApi = {
  listJudgeOptions: () =>
    Promise.resolve([{ id: "judge-a", name: "DeepSeek", provider_type: "openai_compatible" as const, model_name: "deepseek-chat" }]),
};

function setup({
  rubrics = {},
  grade = vi.fn().mockResolvedValue(REGRADED),
  role = "admin",
  latest = gradingResponse({ judge: JUDGE_A }),
  session = SESSION,
  runs = vi.fn().mockResolvedValue([gradingRunSummary()]),
  selectedRunId = null,
}: {
  rubrics?: Partial<RubricsGateway>;
  grade?: GradingGateway["grade"];
  role?: Role | null;
  latest?: SessionGradingResponse | null;
  session?: typeof SESSION;
  runs?: GradingGateway["runs"];
  selectedRunId?: string | null;
} = {}) {
  const rubricsGateway = makeFakeGateway({ listVersions: vi.fn().mockResolvedValue([v1, v2]), ...rubrics });
  const gradingGateway: GradingGateway = { grade, results: vi.fn(), sessions: vi.fn(), runs, run: vi.fn(), estimate: vi.fn() };
  const onChanged = vi.fn();
  const onSelectRun = vi.fn();
  render(
    <ToastProvider>
      <RegradeSection
        session={session}
        role={role}
        latest={latest}
        gradingGateway={gradingGateway}
        rubricsGateway={rubricsGateway}
        judgeApi={judgeApi}
        selectedRunId={selectedRunId}
        onSelectRun={onSelectRun}
        onChanged={onChanged}
      />
    </ToastProvider>,
  );
  return { rubricsGateway, gradingGateway, onChanged, onSelectRun, user: userEvent.setup() };
}

describe("RegradeSection (AC7, K-17/K-18: Nilai ulang dengan versi atau penilai lain)", () => {
  // Positive: graded with v1 and v2 exists, so the Admin can re-grade.
  it("offers the button to an Admin when a newer rubric version exists", async () => {
    // Arrange / Act
    setup();

    // Assert
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
  });

  it("opens the dialog for the newest version and says the old result stays", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Assert
    const dialog = within(screen.getByRole("dialog", { name: "Nilai ulang sesi ini?" }));
    expect(dialog.getByLabelText("Versi rubrik")).toHaveValue("v2");
    expect(dialog.getByText(/Hasil lama tetap tersimpan/)).toBeInTheDocument();
  });

  // Negative: other roles never see it, and nothing is requested (a 403 would redirect them away).
  it.each(["developer_ai", "viewer", "contributor", null] as const)("renders nothing and requests nothing for role %s", (role) => {
    // Arrange / Act
    const { rubricsGateway, gradingGateway } = setup({ role });

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(rubricsGateway.listVersions).not.toHaveBeenCalled();
    expect(gradingGateway.runs).not.toHaveBeenCalled();
  });

  // Edge: the reason the button is off is written next to it.
  it.each([
    ["no rubric version", { rubrics: { listVersions: vi.fn().mockResolvedValue([]) } }, "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik."],
    ["a session never graded", { latest: null }, "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu."],
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

  // K-17: the newest version was already used, but another judge can still grade the same answers.
  it("keeps the button on when the latest result already used the newest version", async () => {
    // Arrange / Act
    setup({ latest: gradingResponse({ rubric_version: "v2", judge: JUDGE_A }) });

    // Assert
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
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

  // AC7: every earlier result stays visible with its rubric version, only the newest carries the marker.
  it("lists every grading run with its rubric version and marks only the latest", async () => {
    // Arrange
    const history = [
      gradingRunSummary({ grading_run_id: "run-2", kind: "regrade", rubric_version: "v2", triggered_at: "2026-11-07T05:00:00Z" }),
      gradingRunSummary({ grading_run_id: "run-1", is_latest: false, triggered_at: "2026-11-07T03:00:00Z" }),
    ];
    setup({ runs: vi.fn().mockResolvedValue(history) });

    // Act
    const list = await screen.findByRole("list", { name: "Riwayat penilaian" });

    // Assert
    const [newer, older] = within(list).getAllByRole("listitem");
    expect(newer).toHaveTextContent("Nilai ulang");
    expect(newer).toHaveTextContent("Versi 2");
    expect(within(newer).getByText("Terbaru")).toBeInTheDocument();
    expect(older).toHaveTextContent("Nilai pertama");
    expect(older).toHaveTextContent("Versi 1");
    expect(within(older).queryByText("Terbaru")).not.toBeInTheDocument();
  });

  // State: nothing is shown while the history loads, so the button does not flash on and off.
  it("shows nothing while the history is loading", () => {
    // Arrange / Act
    setup({ runs: vi.fn().mockReturnValue(new Promise(() => undefined)) });

    // Assert
    expect(screen.queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
  });

  // State: error with a retry. A failed history must not leave the button silently off.
  it("shows an error with a retry when the history cannot be loaded", async () => {
    // Arrange
    const user = userEvent.setup();
    const runs = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR")).mockResolvedValueOnce([gradingRunSummary()]);
    setup({ runs });
    const alert = await screen.findByRole("alert");

    // Act
    await user.click(within(alert).getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(alert).toHaveTextContent("Gagal memuat riwayat penilaian. Coba lagi.");
    expect(await screen.findByRole("button", { name: BUTTON })).toBeEnabled();
    expect(runs).toHaveBeenCalledTimes(2);
  });

  // Edge: a history with no runs yet is not an error.
  it("says there is no result yet when the history is empty", async () => {
    // Arrange / Act
    setup({ runs: vi.fn().mockResolvedValue([]) });

    // Assert
    expect(await screen.findByText("Belum ada hasil penilaian untuk sesi ini.")).toBeInTheDocument();
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
    expect(gradingGateway.grade).toHaveBeenCalledWith("s-1", { rubricVersion: "v2", judgeProviderId: "judge-a" });
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(gradingGateway.runs).toHaveBeenCalledTimes(2);
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
    const { user, onChanged, gradingGateway } = setup({ grade: vi.fn().mockRejectedValue(refusal) });
    await user.click(await screen.findByRole("button", { name: BUTTON }));
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));
    await dialog.findByRole("alert");

    // Act
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    // Assert
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(gradingGateway.runs).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // K-17/K-18: an older run can be opened from the history.
  it("tells the page when the Admin opens an older run", async () => {
    // Arrange
    const history = [
      gradingRunSummary({ grading_run_id: "run-2", kind: "regrade", triggered_at: "2026-11-07T05:00:00Z" }),
      gradingRunSummary({ grading_run_id: "run-1", is_latest: false, triggered_at: "2026-11-07T03:00:00Z" }),
    ];
    const { user, onSelectRun } = setup({ runs: vi.fn().mockResolvedValue(history) });
    const list = await screen.findByRole("list", { name: "Riwayat penilaian" });
    const [, older] = within(list).getAllByRole("listitem");

    // Act
    await user.click(within(older).getByRole("button"));

    // Assert
    expect(onSelectRun).toHaveBeenCalledWith("run-1");
  });

  // Edge: a result graded before server#134 has no judge, so the dialog asks for one before re-grading.
  it("asks for a judge when the latest result has none", async () => {
    // Arrange
    const { user } = setup({ latest: gradingResponse({ judge: null }) });

    // Act
    await user.click(await screen.findByRole("button", { name: BUTTON }));

    // Assert
    const dialog = within(screen.getByRole("dialog", { name: "Nilai ulang sesi ini?" }));
    await waitFor(() => expect(dialog.getByLabelText(/Provider Penilai/)).toHaveValue(""));
    expect(dialog.getByRole("button", { name: "Nilai ulang" })).toBeDisabled();
  });
});
