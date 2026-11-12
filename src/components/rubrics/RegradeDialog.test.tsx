import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { makeRubricSummary } from "@/test/rubricFixtures";
import type { JudgeProviderOption } from "@/types/provider";
import { RegradeDialog } from "./RegradeDialog";

const REGRADED = gradingResponse({ grading_run_id: "run-2", kind: "regrade", rubric_version: "v2" });
const V1 = makeRubricSummary({ id: "id-1", version_no: 1, is_active: false });
const V2 = makeRubricSummary({ id: "id-2", version_no: 2 });
const JUDGE_A: JudgeProviderOption = { id: "judge-a", name: "DeepSeek", provider_type: "openai_compatible", model_name: "deepseek-chat" };
const JUDGE_B: JudgeProviderOption = { id: "judge-b", name: "Gemini", provider_type: "openai_compatible", model_name: "gemini-2.5-pro" };
const TITLE = "Nilai ulang sesi ini?";

function setup({
  grade = vi.fn().mockResolvedValue(REGRADED),
  defaultJudgeId = "judge-a",
  judges = [JUDGE_A, JUDGE_B],
}: {
  grade?: GradingGateway["grade"];
  defaultJudgeId?: string;
  judges?: JudgeProviderOption[];
} = {}) {
  const gateway: GradingGateway = { grade, results: vi.fn(), sessions: vi.fn(), runs: vi.fn(), run: vi.fn(), estimate: vi.fn() };
  const judgeApi: JudgeOptionsApi = { listJudgeOptions: vi.fn().mockResolvedValue(judges) };
  const onRegraded = vi.fn();
  const onClose = vi.fn();
  render(
    <RegradeDialog
      session={{ id: "s-1" }}
      versions={[V1, V2]}
      defaultVersion={V2}
      defaultJudgeId={defaultJudgeId}
      gateway={gateway}
      judgeApi={judgeApi}
      onRegraded={onRegraded}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: TITLE }));
  return { dialog, gateway, onRegraded, onClose, user: userEvent.setup() };
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
    await waitFor(() => expect(dialog.getByLabelText(/Provider Penilai/)).toHaveValue("judge-a"));
  });

  // K-17: same answers, another judge.
  it("re-grades with the chosen judge and version and tells the page", async () => {
    // Arrange
    const { dialog, gateway, onRegraded, user } = setup();
    await user.selectOptions(await dialog.findByLabelText(/Provider Penilai/), "judge-b");
    await user.selectOptions(dialog.getByLabelText("Versi rubrik"), "v1");

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(onRegraded).toHaveBeenCalledWith(REGRADED));
    expect(gateway.grade).toHaveBeenCalledWith("s-1", { rubricVersion: "v1", judgeProviderId: "judge-b" });
  });

  // Edge: an older run without a judge leaves the choice empty, so nothing is sent until one is picked.
  it("keeps the button off until a judge is chosen", async () => {
    // Arrange
    const { dialog, user } = setup({ defaultJudgeId: "" });
    const button = dialog.getByRole("button", { name: "Nilai ulang" });
    expect(button).toBeDisabled();

    // Act
    await user.selectOptions(await dialog.findByLabelText(/Provider Penilai/), "judge-a");

    // Assert
    expect(button).toBeEnabled();
  });

  // Negative: each refusal shows its own sentence in the dialog and reports nothing.
  it.each([
    [new ApiError(422, "JUDGE_NOT_ELIGIBLE"), "Penilai yang dipilih tidak aktif atau bukan produk otomatis. Pilih penilai lain."],
    [new ApiError(409, "SESSION_NOT_GRADABLE"), "Sesi ini belum bisa dinilai. Hanya sesi yang berjalan atau sudah selesai yang bisa dinilai."],
    [new ApiError(404, "RUBRIC_VERSION_NOT_FOUND"), "Versi rubrik yang dipilih tidak ditemukan. Muat ulang halaman."],
    [new ApiError(403, "FORBIDDEN"), "Hanya Admin yang bisa memicu penilaian. Muat ulang halaman."],
  ])("shows the reason for %s and stays open", async (refusal, message) => {
    // Arrange
    const { dialog, onRegraded, onClose, user } = setup({ grade: vi.fn().mockRejectedValue(refusal) });
    await dialog.findByRole("option", { name: "DeepSeek" });

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    expect(await dialog.findByRole("alert")).toHaveTextContent(message);
    expect(onRegraded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Edge: after an error the data may be stale, so closing tells the page.
  it("tells the page the data may be stale when closed after an error", async () => {
    // Arrange
    const { dialog, onClose, user } = setup({ grade: vi.fn().mockRejectedValue(new ApiError(404, "MEASUREMENT_NOT_FOUND")) });
    await dialog.findByRole("option", { name: "DeepSeek" });
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

    // Act
    await user.dblClick(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(gateway.grade).toHaveBeenCalledTimes(1));
  });

  // Negative: backing out starts nothing.
  it("closes without a request when the Admin backs out", async () => {
    // Arrange
    const { dialog, gateway, onClose, user } = setup();

    // Act
    await user.click(dialog.getByRole("button", { name: "Batal" }));

    // Assert
    expect(onClose).toHaveBeenCalledWith(false);
    expect(gateway.grade).not.toHaveBeenCalled();
  });

  // Review on client#92: the latest result's judge was turned off since, so the dialog asks for another one.
  it("asks for a judge again when the latest judge is not active any more", async () => {
    // Arrange / Act
    const { dialog } = setup({ defaultJudgeId: "judge-yang-sudah-nonaktif" });

    // Assert
    await waitFor(() => expect(dialog.getByRole("button", { name: "Nilai ulang" })).toBeDisabled());
    expect(dialog.getByLabelText(/Provider Penilai/)).toHaveValue("");
  });
});

