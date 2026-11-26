import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { BUDGET_SHORT_TEXT, NO_ATTEMPTS_TEXT } from "@/lib/grading/gradeEstimate";
import { gradeEstimate, gradingRunQueued } from "@/test/gradingFixtures";
import type { JudgeProviderOption } from "@/types/provider";
import { GradeSessionDialog } from "./GradeSessionDialog";

const TABLE = { name: "Perkiraan biaya penilaian" };
const JUDGE_A: JudgeProviderOption = { id: "judge-a", name: "Judge Alfa", provider_type: "openai_compatible", model_name: "m" };
const JUDGE_B: JudgeProviderOption = { id: "judge-b", name: "Judge Beta", provider_type: "openai_compatible", model_name: "gemini-2.5-pro" };

function renderDialog(
  enqueue: GradingGateway["enqueue"],
  estimate: GradingGateway["estimate"] = () => Promise.resolve(gradeEstimate()),
  judges: JudgeProviderOption[] = [JUDGE_A, JUDGE_B],
) {
  const gateway: GradingGateway = { results: vi.fn(), sessions: vi.fn(), enqueue: vi.fn(enqueue), progress: vi.fn(), runs: vi.fn(), run: vi.fn(), estimate: vi.fn(estimate) };
  const judgeApi: JudgeOptionsApi = { listJudgeOptions: vi.fn().mockResolvedValue(judges) };
  const onQueued = vi.fn();
  const onClose = vi.fn();
  render(
    <GradeSessionDialog
      session={{ id: "s-1", label: "Run November" }}
      gateway={gateway}
      judgeApi={judgeApi}
      onQueued={onQueued}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Nilai sesi ini?" }));
  return { dialog, gateway, onQueued, onClose };
}

/** K-14 (SCRUM-282): LLM judge dipilih di dialog ini, bukan saat membuat sesi. */
async function chooseJudge(
  dialog: ReturnType<typeof within>,
  user: ReturnType<typeof userEvent.setup>,
  judgeId = "judge-a",
) {
  await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), judgeId);
}

describe("GradeSessionDialog (PBI-14 AC6, K-14)", () => {
  // K-16 (SCRUM-288) + SCRUM-375 C1/C2: one sentence on what grading uses; the cost note sits on the
  // judge picker and names the page as the sidebar does (Produk AI).
  it("says in one sentence what grading uses and where the judge cost comes from", async () => {
    const { dialog } = renderDialog(() => Promise.resolve(gradingRunQueued()));

    expect(dialog.getByText(/“Run November”/)).toHaveTextContent(
      "Sesi “Run November” dinilai dengan rubrik versi aktif, lewat aturan deterministik dan penilai LLM.",
    );
    expect(await dialog.findByLabelText(/Penilai LLM/)).toHaveAccessibleDescription(
      "Biayanya memotong anggaran bulanan produk ini di halaman Produk AI.",
    );
    expect(dialog.queryByText(/halaman Penyedia/)).not.toBeInTheDocument();
  });

  // K-14: the judge is chosen here, so nothing is estimated or sent before one is picked.
  it("starts with no judge, asks for no estimate and keeps Nilai off until one is chosen", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => Promise.resolve(gradingRunQueued()));
    const button = dialog.getByRole("button", { name: "Nilai" });

    await waitFor(() => expect(dialog.getByLabelText(/Penilai LLM/)).toHaveValue(""));
    expect(button).toBeDisabled();
    expect(gateway.estimate).not.toHaveBeenCalled();

    await chooseJudge(dialog, user);
    await dialog.findByRole("table", TABLE);

    expect(button).toBeEnabled();
  });

  // Edge: no active automatic product yet, so the Admin is sent to set one up and cannot start.
  it("keeps Nilai off and explains when no judge is active", async () => {
    const { dialog } = renderDialog(() => Promise.resolve(gradingRunQueued()), undefined, []);

    expect(await dialog.findByText(/Belum ada penilai LLM yang aktif/)).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
  });

  // K-13 (SCRUM-285): the server answers 202 once the run is queued; the page closes the dialog
  // and follows the progress, so the Admin is not held in the pop-up while the judge runs.
  it("queues grading with the chosen judge and hands the queued run to the page", async () => {
    const user = userEvent.setup();
    const queued = gradingRunQueued({ grading_run_id: "run-9" });
    const { dialog, gateway, onQueued } = renderDialog(() => Promise.resolve(queued));
    await chooseJudge(dialog, user, "judge-b");

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(gateway.enqueue).toHaveBeenCalledWith("s-1", { judgeProviderId: "judge-b" });
    await waitFor(() => expect(onQueued).toHaveBeenCalledWith(queued));
  });

  it("says grading runs in the background", () => {
    const { dialog } = renderDialog(() => Promise.resolve(gradingRunQueued()));

    expect(dialog.getByText(/latar belakang/)).toHaveTextContent(
      "Berjalan di latar belakang. Dialog tertutup setelah penilaian masuk antrean, progresnya tampil di halaman sesi.",
    );
  });

  // A second click while the request is on its way must not queue a second run.
  it("locks both buttons while the request is sent", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => new Promise(() => {}));
    await chooseJudge(dialog, user);

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(dialog.getByRole("button", { name: "Mengirim…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(gateway.enqueue).toHaveBeenCalledTimes(1);
  });

  // Negative: another Admin (or another tab) already started grading this session (server#142).
  it("explains a GRADING_IN_PROGRESS refusal and reports the failure on close", async () => {
    const user = userEvent.setup();
    const { dialog, onQueued, onClose } = renderDialog(() => Promise.reject(new ApiError(409, "GRADING_IN_PROGRESS")));
    await chooseJudge(dialog, user);

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Penilaian sesi ini masih berjalan. Tunggu sampai selesai; progresnya tampil di halaman sesi.",
    );
    expect(onQueued).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  // Negative: the session was archived in another tab, so the server refuses.
  it("shows why the server refused and reports the failure on close", async () => {
    const user = userEvent.setup();
    const { dialog, onQueued, onClose } = renderDialog(() => Promise.reject(new ApiError(409, "SESSION_ARCHIVED")));
    await chooseJudge(dialog, user);

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi yang sudah diarsipkan tidak bisa dinilai.");
    expect(onQueued).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  // Negative: the server still refuses a grade without a judge (an older client or a raced request).
  it("explains a JUDGE_REQUIRED refusal", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog(() => Promise.reject(new ApiError(422, "JUDGE_REQUIRED")));
    await chooseJudge(dialog, user);

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Pilih LLM judge dulu sebelum menilai.");
  });

  it("closes without grading on Batal", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onClose } = renderDialog(() => Promise.resolve(gradingRunQueued()));

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(gateway.enqueue).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });

  // AC6: the Admin sees what grading will cost with the chosen judge before pressing Nilai.
  it("shows the estimate table for the chosen judge before Nilai", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => Promise.resolve(gradingRunQueued()));

    // Act
    await chooseJudge(dialog, user);

    // Assert
    const table = within(await dialog.findByRole("table", TABLE));
    expect(gateway.estimate).toHaveBeenCalledWith("s-1", { judgeProviderId: "judge-a" });
    expect(table.getByRole("rowheader", { name: "Jumlah percobaan" }).nextElementSibling).toHaveTextContent("12");
    expect(table.getByRole("rowheader", { name: "Perkiraan biaya" }).nextElementSibling).toHaveTextContent("Rp 15.251");
    expect(table.getByRole("rowheader", { name: "Sisa anggaran bulanan penilai" }).nextElementSibling).toHaveTextContent("Rp 500.000");
    expect(table.getByRole("rowheader", { name: "Versi rubrik" }).nextElementSibling).toHaveTextContent("Versi 1 · aktif");
  });

  it("keeps Nilai off while the estimate loads", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => Promise.resolve(gradingRunQueued()), () => new Promise(() => {}));

    // Act
    await chooseJudge(dialog, user);

    // Assert
    expect(await dialog.findByRole("status")).toHaveTextContent("Memuat perkiraan biaya…");
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });

  // AC6: a short budget warns and turns the start button off.
  it("warns and keeps Nilai off when the estimated cost is above the remaining budget", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(
      () => Promise.resolve(gradingRunQueued()),
      () => Promise.resolve(gradeEstimate({ budget_sufficient: false, estimated_cost_idr: "600000.00" })),
    );
    await chooseJudge(dialog, user);

    // Act
    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    // Assert
    expect(dialog.getByRole("alert")).toHaveTextContent(BUDGET_SHORT_TEXT);
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });

  // Negative: without a cost the Admin must not start; the error offers a retry that brings Nilai back.
  it("keeps Nilai off when the estimate fails and enables it after a successful retry", async () => {
    // Arrange
    const user = userEvent.setup();
    const estimate = vi
      .fn<GradingGateway["estimate"]>()
      .mockRejectedValueOnce(new ApiError(422, "JUDGE_PRICING_MISSING"))
      .mockResolvedValueOnce(gradeEstimate());
    const { dialog } = renderDialog(() => Promise.resolve(gradingRunQueued()), estimate);

    // Act / Assert
    await chooseJudge(dialog, user);
    expect(await dialog.findByRole("alert")).toHaveTextContent("Harga token penilai ini belum lengkap");
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Coba lagi" }));
    await dialog.findByRole("table", TABLE);
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeEnabled();
  });

  // Edge: nothing to send to the judge costs nothing; the server decides what happens.
  it("keeps Nilai on and explains when there are no attempts to grade", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog } = renderDialog(
      () => Promise.resolve(gradingRunQueued()),
      () => Promise.resolve(gradeEstimate({ attempts_to_grade: 0, estimated_cost_idr: "0.00" })),
    );

    // Act
    await chooseJudge(dialog, user);

    // Assert
    expect(await dialog.findByText(NO_ATTEMPTS_TEXT)).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeEnabled();
  });
});

// K-19 (SCRUM-290): after a failed run the same dialog confirms "Coba Nilai Ulang" with its own words.
describe("GradeSessionDialog as the retry confirmation (K-19, SCRUM-290)", () => {
  const RETRY_TITLE = "Coba nilai ulang sesi ini?";

  function renderRetry(estimate: GradingGateway["estimate"] = () => Promise.resolve(gradeEstimate())) {
    const gateway: GradingGateway = {
      results: vi.fn(),
      sessions: vi.fn(),
      enqueue: vi.fn(() => Promise.resolve(gradingRunQueued({ grading_run_id: "run-retry" }))),
      progress: vi.fn(),
      runs: vi.fn(),
      run: vi.fn(),
      estimate: vi.fn(estimate),
    };
    const judgeApi: JudgeOptionsApi = { listJudgeOptions: vi.fn().mockResolvedValue([JUDGE_A, JUDGE_B]) };
    const onQueued = vi.fn();
    render(
      <GradeSessionDialog
        session={{ id: "s-1", label: "Run November" }}
        gateway={gateway}
        judgeApi={judgeApi}
        title={RETRY_TITLE}
        confirmLabel="Coba Nilai Ulang"
        onQueued={onQueued}
        onClose={vi.fn()}
      />,
    );
    return { dialog: within(screen.getByRole("dialog", { name: RETRY_TITLE })), gateway, onQueued };
  }

  // Positive: the Admin sees the cost estimate before confirming, then a new run is queued.
  it("shows the cost estimate and queues a new run with the chosen judge", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onQueued } = renderRetry();
    await chooseJudge(dialog, user, "judge-b");

    expect(await dialog.findByRole("table", TABLE)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Coba Nilai Ulang" }));

    expect(gateway.enqueue).toHaveBeenCalledWith("s-1", { judgeProviderId: "judge-b" });
    await waitFor(() => expect(onQueued).toHaveBeenCalledWith(gradingRunQueued({ grading_run_id: "run-retry" })));
  });

  // Negative: nothing is sent before a judge is chosen, so a click-through cannot queue a blind run.
  it("keeps the retry button off until a judge is chosen", async () => {
    const { dialog, gateway } = renderRetry();

    await waitFor(() => expect(dialog.getByLabelText(/Penilai LLM/)).toHaveValue(""));

    expect(dialog.getByRole("button", { name: "Coba Nilai Ulang" })).toBeDisabled();
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });

  // Negative: the judge that failed may still have no prices; the estimate is refused and so is the retry.
  it("keeps the retry button off when the estimate is refused for missing prices", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderRetry(() => Promise.reject(new ApiError(422, "JUDGE_PRICING_MISSING")));
    await chooseJudge(dialog, user);

    expect(await dialog.findByRole("alert")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Coba Nilai Ulang" })).toBeDisabled();
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });
});
