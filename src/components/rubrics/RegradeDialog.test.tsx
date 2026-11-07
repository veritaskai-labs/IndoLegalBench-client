import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { makeRubricSummary } from "@/test/rubricFixtures";
import { RegradeDialog } from "./RegradeDialog";

const REGRADED = gradingResponse({ grading_run_id: "run-2", kind: "regrade", rubric_version: "v2" });

function setup(grade = vi.fn().mockResolvedValue(REGRADED)) {
  const gateway: GradingGateway = { grade, results: vi.fn(), sessions: vi.fn() };
  const onRegraded = vi.fn();
  const onClose = vi.fn();
  render(
    <RegradeDialog
      session={{ id: "s-1" }}
      version={makeRubricSummary({ id: "id-2", version_no: 2 })}
      latest={gradingResponse()}
      gateway={gateway}
      onRegraded={onRegraded}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Nilai ulang dengan versi terbaru?" }));
  return { dialog, gateway, onRegraded, onClose };
}

describe("RegradeDialog (AC7)", () => {
  // Positive: the dialog says which version is used and that old results stay.
  it("names the version and says the old results stay as they are", () => {
    // Arrange / Act
    const { dialog } = setup();

    // Assert
    expect(
      dialog.getByText(
        "Sesi ini akan dinilai ulang dengan Versi 2. Hasil lama tetap tersimpan dan tetap memakai rubrik lamanya. Hasil baru ditandai Terbaru.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the current result with its rubric version so the Admin sees what is kept", () => {
    // Arrange / Act
    const { dialog } = setup();

    // Assert
    const history = dialog.getByRole("list", { name: "Riwayat penilaian" });
    expect(within(history).getByText("Nilai pertama")).toBeInTheDocument();
    expect(within(history).getByText("Versi 1")).toBeInTheDocument();
  });

  it("re-grades with the label of the shown version and tells the page", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway, onRegraded } = setup();

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(onRegraded).toHaveBeenCalledWith(REGRADED));
    expect(gateway.grade).toHaveBeenCalledWith("s-1", "v2");
  });

  // Negative: each refusal shows its own sentence in the dialog and reports nothing.
  it.each([
    [new ApiError(409, "SESSION_NOT_GRADABLE"), "Sesi ini belum bisa dinilai. Hanya sesi yang berjalan atau sudah selesai yang bisa dinilai."],
    [new ApiError(404, "RUBRIC_VERSION_NOT_FOUND"), "Versi rubrik yang dipilih tidak ditemukan. Muat ulang halaman."],
    [new ApiError(403, "FORBIDDEN"), "Hanya Admin yang bisa memicu penilaian. Muat ulang halaman."],
  ])("shows the reason for %s and stays open", async (refusal, message) => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, onRegraded, onClose } = setup(vi.fn().mockRejectedValue(refusal));

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
    const user = userEvent.setup();
    const { dialog, onClose } = setup(vi.fn().mockRejectedValue(new ApiError(404, "MEASUREMENT_NOT_FOUND")));
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
    const user = userEvent.setup();
    const { dialog, gateway } = setup();

    // Act
    await user.dblClick(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(gateway.grade).toHaveBeenCalledTimes(1));
  });

  // Negative: backing out starts nothing.
  it("closes without a request when the Admin backs out", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway, onClose } = setup();

    // Act
    await user.click(dialog.getByRole("button", { name: "Batal" }));

    // Assert
    expect(onClose).toHaveBeenCalledWith(false);
    expect(gateway.grade).not.toHaveBeenCalled();
  });
});
