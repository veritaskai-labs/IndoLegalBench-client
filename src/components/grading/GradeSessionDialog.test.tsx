import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { BUDGET_SHORT_TEXT, NO_ATTEMPTS_TEXT } from "@/lib/grading/gradeEstimate";
import { gradeEstimate, gradingResponse } from "@/test/gradingFixtures";
import { GradeSessionDialog } from "./GradeSessionDialog";

const TABLE = { name: "Perkiraan biaya penilaian" };

function renderDialog(
  grade: GradingGateway["grade"],
  estimate: GradingGateway["estimate"] = () => Promise.resolve(gradeEstimate()),
) {
  const gateway: GradingGateway = { grade: vi.fn(grade), results: vi.fn(), sessions: vi.fn(), runs: vi.fn(), run: vi.fn(), estimate: vi.fn(estimate) };
  const judgeApi: JudgeOptionsApi = {
    listJudgeOptions: vi.fn().mockResolvedValue([{ id: "judge-a", name: "Judge Alfa", provider_type: "openai_compatible", model_name: "m" }]),
  };
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

describe("GradeSessionDialog (PBI-14 AC6)", () => {
  // AC6: the judge cost goes to its own budget, so the Admin hears that before spending it.
  it("says what grading uses and where its cost goes before doing it", () => {
    const { dialog } = renderDialog(() => Promise.resolve(gradingResponse()));

    expect(dialog.getByText(/“Run November”/)).toHaveTextContent("rubrik versi aktif");
    expect(dialog.getByText(/Biaya penilai LLM/)).toHaveTextContent("anggaran penilai");
  });

  it("grades the session and hands the result to the page", async () => {
    const user = userEvent.setup();
    const graded = gradingResponse();
    const { dialog, gateway, onGraded } = renderDialog(() => Promise.resolve(graded));

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(gateway.grade).toHaveBeenCalledWith("s-1");
    await waitFor(() => expect(onGraded).toHaveBeenCalledWith(graded));
  });

  // Grading can take a while (the judge runs per attempt); a second click must not send a second request.
  it("locks both buttons while grading runs", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => new Promise(() => {}));

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(dialog.getByRole("button", { name: "Menilai…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(gateway.grade).toHaveBeenCalledTimes(1);
  });

  // Negative: the session was archived in another tab, so the server refuses.
  it("shows why the server refused and reports the failure on close", async () => {
    const user = userEvent.setup();
    const { dialog, onGraded, onClose } = renderDialog(() => Promise.reject(new ApiError(409, "SESSION_ARCHIVED")));

    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi yang sudah diarsipkan tidak bisa dinilai.");
    expect(onGraded).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("closes without grading on Batal", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onClose } = renderDialog(() => Promise.resolve(gradingResponse()));

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(gateway.grade).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });

  // AC6: the Admin sees what grading will cost before pressing Nilai.
  it("shows the estimate table for the session's judge before Nilai", async () => {
    // Arrange / Act
    const { dialog, gateway } = renderDialog(() => Promise.resolve(gradingResponse()));

    // Assert
    const table = within(await dialog.findByRole("table", TABLE));
    expect(gateway.estimate).toHaveBeenCalledWith("s-1", {});
    expect(table.getByRole("rowheader", { name: "Jumlah percobaan" }).nextElementSibling).toHaveTextContent("12");
    expect(table.getByRole("rowheader", { name: "Perkiraan biaya" }).nextElementSibling).toHaveTextContent("Rp 15.251");
    expect(table.getByRole("rowheader", { name: "Sisa anggaran judge" }).nextElementSibling).toHaveTextContent("Rp 500.000");
    await waitFor(() => expect(table.getByRole("rowheader", { name: "LLM judge" }).nextElementSibling).toHaveTextContent("Judge Alfa"));
  });

  it("keeps Nilai off while the estimate loads", async () => {
    // Arrange / Act
    const { dialog, gateway } = renderDialog(() => Promise.resolve(gradingResponse()), () => new Promise(() => {}));

    // Assert
    expect(await dialog.findByRole("status")).toHaveTextContent("Memuat perkiraan biaya…");
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
    expect(gateway.grade).not.toHaveBeenCalled();
  });

  // AC6: a short budget warns and turns the start button off.
  it("warns and keeps Nilai off when the estimated cost is above the remaining budget", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(
      () => Promise.resolve(gradingResponse()),
      () => Promise.resolve(gradeEstimate({ budget_sufficient: false, estimated_cost_idr: "600000.00" })),
    );

    // Act
    await dialog.findByRole("table", TABLE);
    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    // Assert
    expect(dialog.getByRole("alert")).toHaveTextContent(BUDGET_SHORT_TEXT);
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
    expect(gateway.grade).not.toHaveBeenCalled();
  });

  // Negative: without a cost the Admin must not start; the error offers a retry that brings Nilai back.
  it("keeps Nilai off when the estimate fails and enables it after a successful retry", async () => {
    // Arrange
    const user = userEvent.setup();
    const estimate = vi
      .fn<GradingGateway["estimate"]>()
      .mockRejectedValueOnce(new ApiError(422, "JUDGE_PRICING_MISSING"))
      .mockResolvedValueOnce(gradeEstimate());
    const { dialog } = renderDialog(() => Promise.resolve(gradingResponse()), estimate);

    // Act / Assert
    expect(await dialog.findByRole("alert")).toHaveTextContent("Harga token penilai ini belum lengkap");
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Coba lagi" }));
    await dialog.findByRole("table", TABLE);
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeEnabled();
  });

  // Edge: nothing to send to the judge costs nothing; the server decides what happens.
  it("keeps Nilai on and explains when there are no attempts to grade", async () => {
    // Arrange / Act
    const { dialog } = renderDialog(
      () => Promise.resolve(gradingResponse()),
      () => Promise.resolve(gradeEstimate({ attempts_to_grade: 0, estimated_cost_idr: "0.00" })),
    );

    // Assert
    expect(await dialog.findByText(NO_ATTEMPTS_TEXT)).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Nilai" })).toBeEnabled();
  });
});
