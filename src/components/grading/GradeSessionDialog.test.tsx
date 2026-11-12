import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { GradeSessionDialog } from "./GradeSessionDialog";

function renderDialog(grade: GradingGateway["grade"]) {
  const gateway: GradingGateway = { grade: vi.fn(grade), results: vi.fn(), sessions: vi.fn(), runs: vi.fn(), run: vi.fn() };
  const onGraded = vi.fn();
  const onClose = vi.fn();
  render(
    <GradeSessionDialog session={{ id: "s-1", label: "Run November" }} gateway={gateway} onGraded={onGraded} onClose={onClose} />,
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

    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(gateway.grade).toHaveBeenCalledWith("s-1");
    await waitFor(() => expect(onGraded).toHaveBeenCalledWith(graded));
  });

  // Grading can take a while (the judge runs per attempt); a second click must not send a second request.
  it("locks both buttons while grading runs", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(() => new Promise(() => {}));

    await user.click(dialog.getByRole("button", { name: "Nilai" }));

    expect(dialog.getByRole("button", { name: "Menilai…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(gateway.grade).toHaveBeenCalledTimes(1);
  });

  // Negative: the session was archived in another tab, so the server refuses.
  it("shows why the server refused and reports the failure on close", async () => {
    const user = userEvent.setup();
    const { dialog, onGraded, onClose } = renderDialog(() => Promise.reject(new ApiError(409, "SESSION_ARCHIVED")));

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
});
