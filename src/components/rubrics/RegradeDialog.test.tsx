import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { BUDGET_SHORT_TEXT } from "@/lib/grading/gradeEstimate";
import { gradeEstimate, gradingRunQueued } from "@/test/gradingFixtures";
import { makeRubricSummary } from "@/test/rubricFixtures";
import type { JudgeProviderOption } from "@/types/provider";
import { RegradeDialog } from "./RegradeDialog";

const QUEUED = gradingRunQueued({ grading_run_id: "run-2" });
const V1 = makeRubricSummary({ id: "id-1", version_no: 1, is_active: false });
const V2 = makeRubricSummary({ id: "id-2", version_no: 2 });
const JUDGE_A: JudgeProviderOption = { id: "judge-a", name: "DeepSeek", provider_type: "openai_compatible", model_name: "deepseek-chat" };
const JUDGE_B: JudgeProviderOption = { id: "judge-b", name: "Gemini", provider_type: "openai_compatible", model_name: "gemini-2.5-pro" };
const TITLE = "Nilai ulang sesi ini?";
const TABLE = { name: "Perkiraan biaya penilaian" };

function setup({
  enqueue = vi.fn().mockResolvedValue(QUEUED),
  defaultJudgeId = "judge-a",
  judges = [JUDGE_A, JUDGE_B],
  estimate = vi.fn().mockResolvedValue(gradeEstimate()),
}: {
  enqueue?: GradingGateway["enqueue"];
  estimate?: GradingGateway["estimate"];
  defaultJudgeId?: string;
  judges?: JudgeProviderOption[];
} = {}) {
  const gateway: GradingGateway = { results: vi.fn(), sessions: vi.fn(), enqueue, progress: vi.fn(), runs: vi.fn(), run: vi.fn(), estimate };
  const judgeApi: JudgeOptionsApi = { listJudgeOptions: vi.fn().mockResolvedValue(judges) };
  const onQueued = vi.fn();
  const onClose = vi.fn();
  render(
    <RegradeDialog
      session={{ id: "s-1" }}
      versions={[V1, V2]}
      defaultVersion={V2}
      defaultJudgeId={defaultJudgeId}
      gateway={gateway}
      judgeApi={judgeApi}
      onQueued={onQueued}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: TITLE }));
  return { dialog, gateway, onQueued, onClose, user: userEvent.setup() };
}

describe("RegradeDialog (AC6, AC7, K-17/K-18)", () => {
  // Positive: the dialog says old results stay, whatever judge or version is picked.
  it("says the old results stay with their own rubric and judge", () => {
    // Arrange / Act
    const { dialog } = setup();

    // Assert
    expect(
      dialog.getByText("Hasil lama tetap tersimpan dengan rubrik dan penilainya sendiri. Hasil baru ditandai Terbaru."),
    ).toBeInTheDocument();
  });

  // Positive: defaults are the newest version and the judge of the latest result.
  it("starts with the newest version and the judge of the latest result", async () => {
    // Arrange / Act
    const { dialog } = setup();

    // Assert
    expect(dialog.getByLabelText("Versi rubrik")).toHaveValue("v2");
    await waitFor(() => expect(dialog.getByLabelText(/Penilai LLM/)).toHaveValue("judge-a"));
  });

  // K-17: same answers, another judge.
  // K-13 (SCRUM-285): the re-grade is queued; the server answers 202 and the page follows the progress.
  it("queues the re-grade with the chosen judge and version and hands the queued run to the page", async () => {
    // Arrange
    const { dialog, gateway, onQueued, user } = setup();
    await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), "judge-b");
    await user.selectOptions(dialog.getByLabelText("Versi rubrik"), "v1");
    await dialog.findByRole("table", TABLE);

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(onQueued).toHaveBeenCalledWith(QUEUED));
    expect(gateway.enqueue).toHaveBeenCalledWith("s-1", { rubricVersion: "v1", judgeProviderId: "judge-b" });
  });

  // Edge: an older run without a judge leaves the choice empty, so nothing is sent until one is picked.
  it("keeps the button off until a judge is chosen", async () => {
    // Arrange
    const { dialog, user } = setup({ defaultJudgeId: "" });
    const button = dialog.getByRole("button", { name: "Nilai ulang" });
    expect(button).toBeDisabled();

    // Act
    await user.selectOptions(await dialog.findByLabelText(/Penilai LLM/), "judge-a");

    // Assert
    await dialog.findByRole("table", TABLE);
    expect(button).toBeEnabled();
  });

  // Negative: each refusal shows its own sentence in the dialog and reports nothing.
  it.each([
    [new ApiError(422, "JUDGE_NOT_ELIGIBLE"), "Penilai yang dipilih tidak aktif atau bukan produk otomatis. Pilih penilai lain."],
    [new ApiError(409, "SESSION_NOT_GRADABLE"), "Sesi ini belum bisa dinilai. Hanya sesi yang berjalan atau sudah selesai yang bisa dinilai."],
    [new ApiError(404, "RUBRIC_VERSION_NOT_FOUND"), "Versi rubrik yang dipilih tidak ditemukan. Muat ulang halaman."],
    [new ApiError(403, "FORBIDDEN"), "Hanya Admin yang bisa memicu penilaian. Muat ulang halaman."],
    [new ApiError(409, "GRADING_IN_PROGRESS"), "Penilaian sesi ini masih berjalan. Tunggu sampai selesai; progresnya tampil di halaman sesi."],
  ])("shows the reason for %s and stays open", async (refusal, message) => {
    // Arrange
    const { dialog, onQueued, onClose, user } = setup({ enqueue: vi.fn().mockRejectedValue(refusal) });
    await dialog.findByRole("option", { name: "DeepSeek" });
    await dialog.findByRole("table", TABLE);

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    expect(await dialog.findByRole("alert")).toHaveTextContent(message);
    expect(onQueued).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Edge: after an error the data may be stale, so closing tells the page.
  it("tells the page the data may be stale when closed after an error", async () => {
    // Arrange
    const { dialog, onClose, user } = setup({ enqueue: vi.fn().mockRejectedValue(new ApiError(404, "MEASUREMENT_NOT_FOUND")) });
    await dialog.findByRole("option", { name: "DeepSeek" });
    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));
    await dialog.findByRole("alert");

    // Act
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    // Assert
    expect(onClose).toHaveBeenCalledWith(true);
  });

  // Edge: a double click must not start two re-grades.
  it("sends one request for a double click", async () => {
    // Arrange
    const { dialog, gateway, user } = setup();
    await dialog.findByRole("option", { name: "DeepSeek" });
    await dialog.findByRole("table", TABLE);

    // Act
    await user.dblClick(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(gateway.enqueue).toHaveBeenCalledTimes(1));
  });

  // Negative: backing out starts nothing.
  it("closes without a request when the Admin backs out", async () => {
    // Arrange
    const { dialog, gateway, onClose, user } = setup();

    // Act
    await user.click(dialog.getByRole("button", { name: "Batal" }));

    // Assert
    expect(onClose).toHaveBeenCalledWith(false);
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });

  // Review on client#92: the latest result's judge was turned off since, so the dialog asks for another one.
  it("asks for a judge again when the latest judge is not active any more", async () => {
    // Arrange / Act
    const { dialog } = setup({ defaultJudgeId: "judge-yang-sudah-nonaktif" });

    // Assert
    await waitFor(() => expect(dialog.getByRole("button", { name: "Nilai ulang" })).toBeDisabled());
    expect(dialog.getByLabelText(/Penilai LLM/)).toHaveValue("");
  });

  // AC6: the table is for the judge and version the Admin is about to use.
  it("estimates with the default judge and version", async () => {
    // Arrange
    const estimate = vi.fn().mockResolvedValue(gradeEstimate({ judge_provider_id: "judge-a", rubric_version: "v2" }));

    // Act
    const { dialog } = setup({ estimate });

    // Assert
    const table = within(await dialog.findByRole("table", TABLE));
    expect(estimate).toHaveBeenCalledWith("s-1", { rubricVersion: "v2", judgeProviderId: "judge-a" });
    // Nilai ulang picks the version itself, so the row does not claim it is the active one.
    expect(table.getByRole("rowheader", { name: "Versi rubrik" }).nextElementSibling).toHaveTextContent(/^Versi 2$/);
  });

  it("loads the estimate again when the judge changes", async () => {
    // Arrange
    const estimate = vi.fn().mockResolvedValue(gradeEstimate({ judge_provider_id: "judge-b" }));
    const { dialog, user } = setup({ estimate });
    await dialog.findByRole("table", TABLE);

    // Act
    await user.selectOptions(dialog.getByLabelText(/Penilai LLM/), "judge-b");

    // Assert
    await waitFor(() => expect(estimate).toHaveBeenLastCalledWith("s-1", { rubricVersion: "v2", judgeProviderId: "judge-b" }));
    expect(await dialog.findByRole("table", TABLE)).toBeInTheDocument();
  });

  it("loads the estimate again when the rubric version changes", async () => {
    // Arrange
    const estimate = vi.fn().mockResolvedValue(gradeEstimate({ rubric_version: "v1" }));
    const { dialog, user } = setup({ estimate });
    await dialog.findByRole("table", TABLE);

    // Act
    await user.selectOptions(dialog.getByLabelText("Versi rubrik"), "v1");

    // Assert
    await waitFor(() => expect(estimate).toHaveBeenLastCalledWith("s-1", { rubricVersion: "v1", judgeProviderId: "judge-a" }));
  });

  // The old estimate belongs to the old judge, so the button waits for the new one.
  it("keeps the button off while the estimate for a new choice loads", async () => {
    // Arrange
    const estimate = vi.fn().mockResolvedValueOnce(gradeEstimate()).mockReturnValueOnce(new Promise(() => {}));
    const { dialog, user } = setup({ estimate });
    await dialog.findByRole("table", TABLE);

    // Act
    await user.selectOptions(dialog.getByLabelText(/Penilai LLM/), "judge-b");

    // Assert
    expect(dialog.getByRole("status")).toHaveTextContent("Memuat perkiraan biaya…");
    expect(dialog.getByRole("button", { name: "Nilai ulang" })).toBeDisabled();
  });

  // Edge: no judge yet means no estimate; one for the session's old judge would mislead.
  it("asks for no estimate until a judge is chosen", async () => {
    // Arrange
    const estimate = vi.fn().mockResolvedValue(gradeEstimate());
    const { dialog, user } = setup({ defaultJudgeId: "", estimate });
    await dialog.findByRole("option", { name: "DeepSeek" });

    // Act / Assert
    expect(estimate).not.toHaveBeenCalled();
    expect(dialog.queryByRole("table")).not.toBeInTheDocument();
    await user.selectOptions(dialog.getByLabelText(/Penilai LLM/), "judge-a");
    await dialog.findByRole("table", TABLE);
    expect(estimate).toHaveBeenCalledWith("s-1", { rubricVersion: "v2", judgeProviderId: "judge-a" });
  });

  // AC6: a short budget warns and turns the start button off.
  it("warns and keeps the button off when the estimated cost is above the remaining budget", async () => {
    // Arrange
    const estimate = vi.fn().mockResolvedValue(gradeEstimate({ budget_sufficient: false, estimated_cost_idr: "600000.00" }));
    const { dialog, gateway, user } = setup({ estimate });

    // Act
    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    expect(dialog.getByRole("alert")).toHaveTextContent(BUDGET_SHORT_TEXT);
    expect(dialog.getByRole("button", { name: "Nilai ulang" })).toBeDisabled();
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });

  it("keeps the button off when the estimate fails", async () => {
    // Arrange
    const estimate = vi.fn().mockRejectedValue(new ApiError(422, "JUDGE_PRICING_MISSING"));

    // Act
    const { dialog } = setup({ estimate });

    // Assert
    expect(await dialog.findByRole("alert")).toHaveTextContent("Harga token penilai ini belum lengkap");
    expect(dialog.getByRole("button", { name: "Nilai ulang" })).toBeDisabled();
  });
});
