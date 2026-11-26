import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import { PROGRESS_POLL_MS } from "@/hooks/useMeasurementProgress";
import { gradeEstimate, gradingProgress, gradingResponse, gradingRunQueued, gradingRunSummary } from "@/test/gradingFixtures";
import { makeFakeGateway, makeRubricSummary } from "@/test/rubricFixtures";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";
import { SessionGradingSection } from "./SessionGradingSection";

const NOT_GRADED = () => Promise.reject(new ApiError(404, "GRADING_NOT_FOUND"));
const JUDGE_A = { judge_provider_id: "judge-a", name: "DeepSeek", model_version: "deepseek-chat", cost_idr: null };
const judgeApi: JudgeOptionsApi = {
  listJudgeOptions: () =>
    Promise.resolve([{ id: "judge-a", name: "DeepSeek", provider_type: "openai_compatible" as const, model_name: "deepseek-chat" }]),
};

function renderSection({
  results,
  enqueue = () => Promise.resolve(gradingRunQueued()),
  progress = () => Promise.resolve(null),
  role = "admin",
  status = "finished",
  archivedAt = null,
  // Without versions loaded the re-grade section shows nothing, so tests about grading are not disturbed.
  listVersions = () => new Promise(() => {}),
  runs = () => Promise.resolve([]),
  run = () => new Promise(() => {}),
}: {
  results: GradingGateway["results"];
  enqueue?: GradingGateway["enqueue"];
  progress?: GradingGateway["progress"];
  role?: Role | null;
  status?: SessionStatus;
  archivedAt?: string | null;
  listVersions?: RubricsGateway["listVersions"];
  runs?: GradingGateway["runs"];
  run?: GradingGateway["run"];
}) {
  const gateway: GradingGateway = {
    results: vi.fn(results),
    sessions: vi.fn(),
    enqueue: vi.fn(enqueue),
    progress: vi.fn(progress),
    runs: vi.fn(runs),
    run: vi.fn(run),
    estimate: vi.fn(() => Promise.resolve(gradeEstimate())),
  };
  const rubricsGateway = makeFakeGateway({ listVersions: vi.fn(listVersions) });
  render(
    <ToastProvider>
      <SessionGradingSection
        session={{ id: "s-1", label: "Run November", status, archived_at: archivedAt }}
        role={role}
        gateway={gateway}
        rubricsGateway={rubricsGateway}
        judgeApi={judgeApi}
      />
    </ToastProvider>,
  );
  return { gateway, rubricsGateway, section: screen.getByRole("region", { name: "Hasil penilaian" }) };
}

describe("SessionGradingSection (PBI-14 AC6, AC8)", () => {
  it("waits for the results before showing anything to act on", () => {
    const { section } = renderSection({ results: () => new Promise(() => {}) });

    expect(within(section).getByRole("status")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  it("shows the rubric version, the grading time, the three scores and the case table", async () => {
    const { section } = renderSection({ results: () => Promise.resolve(gradingResponse()) });

    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
    expect(within(section).getByRole("table", { name: "Skor per kasus" })).toBeInTheDocument();
    expect(section).toHaveTextContent("Versi rubrik v1");
    expect(section).toHaveTextContent("Dinilai 07 Nov 2026, 10.00 WIB");
  });

  // Positif (K-11, SCRUM-291, TC_88): halaman detail sesi menyebut LLM judge yang menilai hasil yang tampil.
  it("names the LLM judge product and model in the summary", async () => {
    // Arrange
    const results = () => Promise.resolve(gradingResponse({ judge: JUDGE_A }));

    // Act
    const { section } = renderSection({ results });

    // Assert
    expect(await within(section).findByText("LLM judge: DeepSeek · deepseek-chat")).toBeInTheDocument();
  });

  // Edge: cases is optional in the contract (default_factory=list).
  it("shows an empty case table when the result carries no cases", async () => {
    const { section } = renderSection({ results: () => Promise.resolve(gradingResponse({ cases: undefined })) });

    expect(await within(section).findByRole("table", { name: "Skor per kasus" })).toHaveTextContent(
      "Belum ada kasus yang dinilai.",
    );
  });

  // Once there is a result, grading again is SCRUM-228's "Nilai ulang dengan versi terbaru".
  it("offers no Nilai once the session has a result", async () => {
    const { section } = renderSection({ results: () => Promise.resolve(gradingResponse()) });

    await within(section).findByRole("table", { name: "Skor sesi" });
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  // K-13 (SCRUM-285): the dialog closes as soon as the server answers 202, and the Admin is told
  // grading goes on in the background instead of waiting in the pop-up for every attempt.
  it("closes the dialog right after the server queues grading and says it runs in the background", async () => {
    const user = userEvent.setup();
    const { section, gateway } = renderSection({ results: NOT_GRADED, enqueue: () => Promise.resolve(gradingRunQueued()) });

    expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    await user.click(within(section).getByRole("button", { name: "Nilai" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nilai sesi ini?" }));
    await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), "judge-a");
    await dialog.findByRole("table", { name: "Perkiraan biaya penilaian" });
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(gateway.enqueue).toHaveBeenCalledWith("s-1", { judgeProviderId: "judge-a" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Penilaian sesi “Run November” berjalan di latar belakang.")).toBeInTheDocument();
  });

  // AC6 and the binding rule: only Admin sees the action; the server still answers 403 to others.
  it.each<Role | null>(["developer_ai", "viewer", null])("shows %s an empty result without Nilai", async (role) => {
    const { section } = renderSection({ results: NOT_GRADED, role });

    expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  it.each<[string, SessionStatus, string | null]>([
    ["a queued session", "queued", null],
    ["an archived session", "finished", "2026-11-07T03:00:00Z"],
  ])("offers Admin no Nilai on %s", async (_name, status, archivedAt) => {
    const { section } = renderSection({ results: NOT_GRADED, status, archivedAt });

    expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  // server#114: Developer AI may not see the results of a running session.
  it("explains a refused result in the section and keeps the rest of the page", async () => {
    const { section } = renderSection({
      results: () => Promise.reject(new ApiError(403, "FORBIDDEN")),
      role: "developer_ai",
      status: "running",
    });

    expect(await within(section).findByText("Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.")).toBeInTheDocument();
  });

  it("offers a retry when the results fail to load", async () => {
    const user = userEvent.setup();
    const results = vi
      .fn<GradingGateway["results"]>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(gradingResponse());
    const { section } = renderSection({ results });

    await user.click(await within(section).findByRole("button", { name: /coba lagi/i }));

    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
  });

  // After a refusal the shown state may be stale (another Admin graded it first), so it reloads.
  it("reloads the results after a refused grading", async () => {
    const user = userEvent.setup();
    const results = vi
      .fn<GradingGateway["results"]>()
      .mockImplementationOnce(NOT_GRADED)
      .mockResolvedValueOnce(gradingResponse());
    const { section } = renderSection({ results, enqueue: () => Promise.reject(new ApiError(409, "SESSION_NOT_GRADABLE")) });

    await user.click(await within(section).findByRole("button", { name: "Nilai" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nilai sesi ini?" }));
    await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), "judge-a");
    await dialog.findByRole("table", { name: "Perkiraan biaya penilaian" });
    await user.click(dialog.getByRole("button", { name: "Nilai" }));
    await dialog.findByRole("alert");
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    await waitFor(() => expect(results).toHaveBeenCalledTimes(2));
    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
  });

  it("closes the dialog without reloading on Batal", async () => {
    const user = userEvent.setup();
    const { section, gateway } = renderSection({ results: NOT_GRADED });

    await user.click(await within(section).findByRole("button", { name: "Nilai" }));
    await user.click(within(screen.getByRole("dialog", { name: "Nilai sesi ini?" })).getByRole("button", { name: "Batal" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(gateway.results).toHaveBeenCalledTimes(1);
  });

  // K-13 (SCRUM-285): grading runs in the background and its progress shows on the session page.
  describe("background grading progress", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    async function queueFromDialog(section: HTMLElement) {
      const user = userEvent.setup();
      await user.click(await within(section).findByRole("button", { name: "Nilai" }));
      const dialog = within(screen.getByRole("dialog", { name: "Nilai sesi ini?" }));
      await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), "judge-a");
      await dialog.findByRole("table", { name: "Perkiraan biaya penilaian" });
      await user.click(dialog.getByRole("button", { name: "Nilai" }));
      return { user, dialog };
    }

    it("shows the queued run and turns Nilai off right after the dialog closes", async () => {
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(gradingProgress({ status: "queued", attempts_graded: 0, attempts_total: 12, percent: 0 }));
      const { section } = renderSection({ results: NOT_GRADED, progress });

      await queueFromDialog(section);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(await within(section).findByRole("progressbar", { name: "Progres penilaian" })).toBeInTheDocument();
      expect(await within(section).findByText("Menunggu giliran penilaian · 0 dari 12 percobaan (0%)")).toBeInTheDocument();
      expect(within(section).getByRole("button", { name: "Nilai" })).toBeDisabled();
    });

    // AC: refreshing, or leaving and coming back, still shows the run that is going on.
    it("shows a run that is already running when the page opens", async () => {
      const { section } = renderSection({
        results: NOT_GRADED,
        progress: () => Promise.resolve(gradingProgress({ status: "running", attempts_graded: 3, attempts_total: 12, percent: 25 })),
      });

      expect(await within(section).findByText("3 dari 12 percobaan dinilai (25%)")).toBeInTheDocument();
      expect(within(section).getByRole("progressbar", { name: "Progres penilaian" })).toHaveAttribute("value", "25");
      expect(within(section).getByRole("button", { name: "Nilai" })).toBeDisabled();
    });

    // AC: the score table loads by itself when the run ends, no refresh needed.
    it("loads the score table by itself when the run finishes", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const results = vi.fn<GradingGateway["results"]>().mockImplementationOnce(NOT_GRADED).mockResolvedValue(gradingResponse());
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(gradingProgress({ status: "running", percent: 50 }))
        .mockResolvedValue(gradingProgress({ status: "finished", attempts_graded: 12, percent: 100 }));
      const { section } = renderSection({ results, progress });
      expect(await within(section).findByRole("progressbar", { name: "Progres penilaian" })).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

      expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
      expect(within(section).queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.getByText("Sesi “Run November” selesai dinilai.")).toBeInTheDocument();
    });

    it("explains a failed run and offers Nilai again", async () => {
      const { section } = renderSection({
        results: NOT_GRADED,
        progress: () => Promise.resolve(gradingProgress({ status: "failed", error_code: "GRADING_INTERRUPTED" })),
      });

      expect(await within(section).findByRole("alert")).toHaveTextContent("Penilaian terakhir gagal.");
      expect(within(section).getByRole("button", { name: "Nilai" })).toBeEnabled();
    });

    describe("Coba Nilai Ulang (K-19, SCRUM-290)", () => {
      const FAILED = () => Promise.resolve(gradingProgress({ status: "failed", error_code: "judge_budget_exhausted" }));

      async function retryFromAlert(section: HTMLElement) {
        const user = userEvent.setup();
        await user.click(await within(await within(section).findByRole("alert")).findByRole("button", { name: "Coba Nilai Ulang" }));
        const dialog = within(screen.getByRole("dialog", { name: "Coba nilai ulang sesi ini?" }));
        await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), "judge-a");
        await dialog.findByRole("table", { name: "Perkiraan biaya penilaian" });
        return { user, dialog };
      }

      // Positive: the failed first run has no result yet, so the retry cannot depend on the re-grade section.
      it("confirms with the cost estimate and follows the new run", async () => {
        const progress = vi
          .fn<GradingGateway["progress"]>()
          .mockResolvedValueOnce(gradingProgress({ status: "failed", error_code: "judge_budget_exhausted" }))
          .mockResolvedValue(gradingProgress({ grading_run_id: "run-queued", status: "queued", attempts_graded: 0, percent: 0 }));
        const { section, gateway } = renderSection({ results: NOT_GRADED, progress });
        const { user, dialog } = await retryFromAlert(section);

        await user.click(dialog.getByRole("button", { name: "Coba Nilai Ulang" }));

        expect(gateway.enqueue).toHaveBeenCalledWith("s-1", { judgeProviderId: "judge-a" });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(await within(section).findByRole("progressbar", { name: "Progres penilaian" })).toBeInTheDocument();
        expect(within(section).queryByRole("button", { name: "Coba Nilai Ulang" })).not.toBeInTheDocument();
      });

      // Edge: an older result is on the page (re-grade failed); the retry is still offered.
      it("is offered when the session already has an older result", async () => {
        const { section } = renderSection({ results: () => Promise.resolve(gradingResponse()), progress: FAILED });

        expect(await within(await within(section).findByRole("alert")).findByRole("button", { name: "Coba Nilai Ulang" })).toBeEnabled();
      });

      // Negative: another Admin retried first, so the server refuses and the page follows that run.
      it("follows the other run after a GRADING_IN_PROGRESS refusal", async () => {
        const progress = vi
          .fn<GradingGateway["progress"]>()
          .mockResolvedValueOnce(gradingProgress({ status: "failed", error_code: "NO_SCORE" }))
          .mockResolvedValue(gradingProgress({ grading_run_id: "run-other", status: "running", attempts_graded: 6, attempts_total: 12, percent: 50 }));
        const { section } = renderSection({
          results: NOT_GRADED,
          progress,
          enqueue: () => Promise.reject(new ApiError(409, "GRADING_IN_PROGRESS")),
        });
        const { user, dialog } = await retryFromAlert(section);

        await user.click(dialog.getByRole("button", { name: "Coba Nilai Ulang" }));
        await dialog.findByRole("alert");
        await user.click(dialog.getByRole("button", { name: "Tutup" }));

        expect(await within(section).findByText("6 dari 12 percobaan dinilai (50%)")).toBeInTheDocument();
      });

      // Negative: an archived session cannot be graded, so only the message is shown.
      it("is not offered on an archived session", async () => {
        const { section } = renderSection({ results: NOT_GRADED, progress: FAILED, archivedAt: "2026-11-14T00:00:00Z" });

        expect(await within(section).findByRole("alert")).toHaveTextContent("Penilaian terakhir gagal.");
        expect(within(section).queryByRole("button", { name: "Coba Nilai Ulang" })).not.toBeInTheDocument();
      });

      it("is not offered when the failure was that the session got archived", async () => {
        const { section } = renderSection({
          results: NOT_GRADED,
          progress: () => Promise.resolve(gradingProgress({ status: "failed", error_code: "SESSION_ARCHIVED" })),
        });

        expect(await within(section).findByRole("alert")).toHaveTextContent("Sesi diarsipkan saat penilaian berjalan.");
        expect(within(section).queryByRole("button", { name: "Coba Nilai Ulang" })).not.toBeInTheDocument();
      });
    });

    // Another Admin queued it first: after closing the refusal, the page follows that run.
    it("follows the run another Admin started after a GRADING_IN_PROGRESS refusal", async () => {
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(gradingProgress({ status: "running", attempts_graded: 6, attempts_total: 12, percent: 50 }));
      const { section } = renderSection({
        results: NOT_GRADED,
        progress,
        enqueue: () => Promise.reject(new ApiError(409, "GRADING_IN_PROGRESS")),
      });

      const { user, dialog } = await queueFromDialog(section);
      await dialog.findByRole("alert");
      await user.click(dialog.getByRole("button", { name: "Tutup" }));

      expect(await within(section).findByText("6 dari 12 percobaan dinilai (50%)")).toBeInTheDocument();
    });

    // The progress endpoint is Admin only: other roles never call it.
    it.each<Role | null>(["developer_ai", "viewer", null])("does not ask %s for grading progress", async (role) => {
      const { section, gateway } = renderSection({ results: NOT_GRADED, role });

      expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
      expect(gateway.progress).not.toHaveBeenCalled();
    });
  });

  // Re-grade (PBI-14 AC7): the result is shown once, and the re-grade button sits under it.
  describe("re-grade with the latest rubric", () => {
    const V1 = makeRubricSummary({ id: "id-1", version_no: 1, is_active: false });
    const V2 = makeRubricSummary({ id: "id-2", version_no: 2 });
    const BUTTON = "Nilai ulang";

    it("offers Admin the re-grade of a graded session when a newer rubric version exists", async () => {
      const { section } = renderSection({
        results: () => Promise.resolve(gradingResponse({ rubric_version: "v1" })),
        listVersions: () => Promise.resolve([V1, V2]),
      });

      expect(await within(section).findByRole("button", { name: BUTTON })).toBeEnabled();
    });

    // K-13 (SCRUM-285): Nilai ulang is queued too; the page shows the progress and turns the button off.
    it("queues the re-grade, shows its progress and turns Nilai ulang off", async () => {
      const user = userEvent.setup();
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(gradingProgress({ status: "running", attempts_graded: 6, attempts_total: 12, percent: 50 }));
      const { section, gateway } = renderSection({
        results: () => Promise.resolve(gradingResponse({ rubric_version: "v1", judge: JUDGE_A })),
        progress,
        listVersions: () => Promise.resolve([V1, V2]),
      });

      await user.click(await within(section).findByRole("button", { name: BUTTON }));
      await screen.findByRole("table", { name: "Perkiraan biaya penilaian" });
      await user.click(
        within(screen.getByRole("dialog", { name: "Nilai ulang sesi ini?" })).getByRole("button", { name: "Nilai ulang" }),
      );

      expect(gateway.enqueue).toHaveBeenCalledWith("s-1", { rubricVersion: "v2", judgeProviderId: "judge-a" });
      expect(await within(section).findByText("6 dari 12 percobaan dinilai (50%)")).toBeInTheDocument();
      expect(within(section).getByRole("button", { name: BUTTON })).toBeDisabled();
    });

    // When the re-grade ends, the result and the history load again by themselves.
    it("shows the new version as latest once the re-grade finishes", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const results = vi
        .fn<GradingGateway["results"]>()
        .mockResolvedValueOnce(gradingResponse({ rubric_version: "v1", judge: JUDGE_A }))
        .mockResolvedValue(gradingResponse({ rubric_version: "v2", kind: "regrade", judge: JUDGE_A }));
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(gradingProgress({ status: "running" }))
        .mockResolvedValue(gradingProgress({ status: "finished", percent: 100 }));
      const runs = vi.fn<GradingGateway["runs"]>().mockResolvedValue([]);
      const { section } = renderSection({ results, progress, runs, listVersions: () => Promise.resolve([V1, V2]) });
      expect(await within(section).findByRole("progressbar", { name: "Progres penilaian" })).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

      await waitFor(() => expect(section).toHaveTextContent("Versi rubrik v2"));
      expect(results).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(runs).toHaveBeenCalledTimes(2));
      vi.useRealTimers();
    });

    // Only Admin may re-grade, and other roles must not call the Admin only rubric list.
    it.each<Role | null>(["developer_ai", "viewer", null])("shows %s the result without the re-grade button", async (role) => {
      const { section, rubricsGateway } = renderSection({
        results: () => Promise.resolve(gradingResponse()),
        role,
        listVersions: () => Promise.resolve([V1, V2]),
      });

      await within(section).findByRole("table", { name: "Skor sesi" });
      expect(within(section).queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
      expect(rubricsGateway.listVersions).not.toHaveBeenCalled();
    });

    // A session without a result has the Nilai button; re-grading would only repeat it.
    it("does not show the re-grade button before the first grading", async () => {
      const { section, rubricsGateway } = renderSection({ results: NOT_GRADED, listVersions: () => Promise.resolve([V1, V2]) });

      await within(section).findByText("Sesi ini belum dinilai.");
      expect(within(section).queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
      expect(rubricsGateway.listVersions).not.toHaveBeenCalled();
    });
  });

  describe("open an older run (K-17/K-18, SCRUM-283)", () => {
    const V1 = makeRubricSummary({ id: "id-1", version_no: 1 });
    const LATEST = gradingResponse({ grading_run_id: "run-2", kind: "regrade", triggered_at: "2026-11-07T05:00:00Z" });
    const OLDER = gradingResponse({
      grading_run_id: "run-1",
      is_latest: false,
      rubric_version: "v1",
      triggered_at: "2026-11-07T03:00:00Z",
      scores: {
        dev: { deterministic: "0.10", quality: "0.20", format: "0.30" },
        test: { deterministic: "0.10", quality: "0.20", format: "0.30" },
        combined: { deterministic: "0.10", quality: "0.20", format: "0.30" },
      },
    });
    const HISTORY = [
      gradingRunSummary({ grading_run_id: "run-2", kind: "regrade", triggered_at: "2026-11-07T05:00:00Z" }),
      gradingRunSummary({ grading_run_id: "run-1", is_latest: false, triggered_at: "2026-11-07T03:00:00Z" }),
    ];

    async function openOlder(run: GradingGateway["run"]) {
      const user = userEvent.setup();
      const rendered = renderSection({
        results: () => Promise.resolve(LATEST),
        listVersions: () => Promise.resolve([V1]),
        runs: () => Promise.resolve(HISTORY),
        run,
      });
      const list = await within(rendered.section).findByRole("list", { name: "Riwayat penilaian" });
      const [, older] = within(list).getAllByRole("listitem");
      await user.click(within(older).getByRole("button"));
      return { ...rendered, user };
    }

    // Positive: the scores follow the chosen run, and the page says it is not the latest.
    it("shows the scores of the chosen run and says it is not the latest", async () => {
      // Arrange / Act
      const { section, gateway } = await openOlder(() => Promise.resolve(OLDER));

      // Assert
      await waitFor(() => expect(within(section).getByRole("table", { name: "Skor sesi" })).toHaveTextContent("0,10"));
      expect(gateway.run).toHaveBeenCalledWith("s-1", "run-1");
      expect(section).toHaveTextContent("Menampilkan hasil penilaian 07 Nov 2026, 10.00 WIB, bukan yang terbaru.");
    });

    // Positive: going back shows the latest result without asking the server for it again.
    it("goes back to the latest result", async () => {
      // Arrange
      const { section, user, gateway } = await openOlder(() => Promise.resolve(OLDER));
      await within(section).findByText(/bukan yang terbaru/);

      // Act
      await user.click(within(section).getByRole("button", { name: "Kembali ke hasil terbaru" }));

      // Assert
      expect(within(section).queryByText(/bukan yang terbaru/)).not.toBeInTheDocument();
      expect(within(section).getByRole("table", { name: "Skor sesi" })).not.toHaveTextContent("0,10");
      expect(gateway.results).toHaveBeenCalledTimes(1);
    });

    // Negative: the chosen run cannot be loaded; the error says so and the way back stays.
    it("explains when the chosen run cannot be loaded", async () => {
      // Arrange / Act
      const { section } = await openOlder(() => Promise.reject(new ApiError(404, "GRADING_RUN_NOT_FOUND")));

      // Assert
      expect(await within(section).findByText("Hasil penilaian ini tidak ditemukan. Muat ulang halaman.")).toBeInTheDocument();
      expect(within(section).getByRole("button", { name: "Kembali ke hasil terbaru" })).toBeInTheDocument();
    });

    // Edge: choosing the latest run again does not load anything new.
    it("does not load the latest run again when it is chosen from the list", async () => {
      // Arrange
      const user = userEvent.setup();
      const { section, gateway } = renderSection({
        results: () => Promise.resolve(LATEST),
        listVersions: () => Promise.resolve([V1]),
        runs: () => Promise.resolve(HISTORY),
      });
      const list = await within(section).findByRole("list", { name: "Riwayat penilaian" });
      const [newer] = within(list).getAllByRole("listitem");

      // Act
      await user.click(within(newer).getByRole("button"));

      // Assert
      expect(gateway.run).not.toHaveBeenCalled();
      expect(within(section).queryByText(/bukan yang terbaru/)).not.toBeInTheDocument();
    });
  });
});
