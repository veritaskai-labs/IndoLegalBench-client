import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import type { JudgeProviderOption } from "@/types/provider";
import { GradeSessionDialog } from "./GradeSessionDialog";

const JUDGE_A: JudgeProviderOption = { id: "judge-a", name: "DeepSeek", provider_type: "openai_compatible", model_name: "deepseek-chat" };
const JUDGE_B: JudgeProviderOption = { id: "judge-b", name: "Gemini", provider_type: "openai_compatible", model_name: "gemini-2.5-pro" };

function renderDialog(grade: GradingGateway["grade"], judges: JudgeProviderOption[] = [JUDGE_A, JUDGE_B]) {
  const gateway: GradingGateway = { grade: vi.fn(grade), results: vi.fn(), sessions: vi.fn(), runs: vi.fn(), run: vi.fn() };
  const judgeApi: JudgeOptionsApi = { listJudgeOptions: vi.fn().mockResolvedValue(judges) };
  const onGraded = vi.fn();
  const onClose = vi.fn();
  render(
    <GradeSessionDialog
      session={{ id: "s-1", label: "Run November" }}
      gateway={gateway}
      judgeApi={judgeApi}
      onGraded={onGraded}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Nilai sesi ini?" }));
  return { dialog, gateway, onGraded, onClose };
}

/** K-14 (SCRUM-282): LLM judge dipilih di dialog ini, bukan saat membuat sesi. */
async function chooseJudge(
  dialog: ReturnType<typeof within>,
  user: ReturnType<typeof userEvent.setup>,
  judgeId = "judge-a",
) {
  await user.selectOptions(await dialog.findByLabelText(/Provider Penilai/), judgeId);
}

describe("GradeSessionDialog (PBI-14 AC6)", () => {
  // AC6: the judge cost goes to its own budget, so the Admin hears that before spending it.
  it("says what grading uses and where its cost goes before doing it", () => {
    const { dialog } = renderDialog(() => Promise.resolve(gradingResponse()));

    expect(dialog.getByText(/“Run November”/)).toHaveTextContent("rubrik versi aktif");
    expect(dialog.getByText(/Biaya penilai LLM/)).toHaveTextContent("anggaran penilai");
  });

  // K-14: the judge is chosen here, so nothing is sent before one is picked.
  it("starts with no judge and keeps Nilai off until one is chosen", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog(() => Promise.resolve(gradingResponse()));
    const button = dialog.getByRole("button", { name: "Nilai" });

    await waitFor(() => expect(dialog.getByLabelText(/Provider Penilai/)).toHaveValue(""));
    expect(button).toBeDisabled();

    await chooseJudge(dialog, user);

    expect(button).toBeEnabled();
  });

  // Edge: no active automatic product yet, so the Admin is sent to set one up and cannot start.
  it("keeps Nilai off and explains when no judge is active", async () => {
    const { dialog } = renderDialog(() => Promise.resolve(gradingResponse()), []);

    expect(await dialog.findByText(/Belum ada provider yang aktif/)).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
  });

  it("grades the session with the chosen judge and hands the result to the page", async () => {
    const user = userEvent.setup();
    const graded = gradingResponse();
    const { dialog, gateway, onGraded } = renderDialog(() => Promise.resolve(graded));
    await chooseJudge(dialog, user, "judge-b");

    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(gateway.grade).toHaveBeenCalledWith("s-1", { judgeProviderId: "judge-b" });
    await waitFor(() => expect(onGraded).toHaveBeenCalledWith(graded));
  });

  // Grading can take a while (the judge runs per attempt); a second click must not send a second request.
  it("locks both buttons while grading runs", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => new Promise(() => {}));
    await chooseJudge(dialog, user);

    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(dialog.getByRole("button", { name: "Menilai…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(gateway.grade).toHaveBeenCalledTimes(1);
  });

  // Negative: the session was archived in another tab, so the server refuses.
  it("shows why the server refused and reports the failure on close", async () => {
    const user = userEvent.setup();
    const { dialog, onGraded, onClose } = renderDialog(() => Promise.reject(new ApiError(409, "SESSION_ARCHIVED")));
    await chooseJudge(dialog, user);

    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi yang sudah diarsipkan tidak bisa dinilai.");
    expect(onGraded).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  // Negative: the server still refuses a grade without a judge (an older client or a raced request).
  it("explains a JUDGE_REQUIRED refusal", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog(() => Promise.reject(new ApiError(422, "JUDGE_REQUIRED")));
    await chooseJudge(dialog, user);

    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Pilih LLM judge dulu sebelum menilai.");
  });

  it("closes without grading on Batal", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onClose } = renderDialog(() => Promise.resolve(gradingResponse()));

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(gateway.grade).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
