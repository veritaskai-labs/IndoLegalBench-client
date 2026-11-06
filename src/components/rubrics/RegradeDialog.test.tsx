import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeGradingRun, makeRubricVersion } from "@/test/rubricFixtures";
import { RegradeDialog } from "./RegradeDialog";

function setup(regrade = vi.fn().mockResolvedValue(makeGradingRun({ id: "r-2", kind: "regrade", status: "queued" }))) {
  const gateway = makeFakeGateway({ regrade });
  const onRegraded = vi.fn();
  const onClose = vi.fn();
  render(
    <RegradeDialog
      sessionId="s-1"
      version={makeRubricVersion({ id: "v-2", version_no: 2 })}
      runs={[makeGradingRun()]}
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

  it("shows the grading history so the Admin sees what is kept", () => {
    // Arrange / Act
    const { dialog } = setup();

    // Assert
    const history = dialog.getByRole("list", { name: "Riwayat penilaian" });
    expect(within(history).getByText("Nilai pertama")).toBeInTheDocument();
  });

  it("starts the re-grade with the shown version and tells the page", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog, gateway, onRegraded } = setup();

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    await waitFor(() => expect(onRegraded).toHaveBeenCalledWith(expect.objectContaining({ id: "r-2", kind: "regrade" })));
    expect(gateway.regrade).toHaveBeenCalledWith("s-1", { rubric_version_id: "v-2" });
  });

  // Negative: the server cannot grade now; the reason shows in the dialog and nothing is reported.
  it("shows the reason from the server on a 409 and stays open", async () => {
    // Arrange
    const user = userEvent.setup();
    const refusal = new ApiError(409, "SESSION_NOT_GRADABLE", "Sesi masih berjalan");
    const { dialog, onRegraded, onClose } = setup(vi.fn().mockRejectedValue(refusal));

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi masih berjalan");
    expect(onRegraded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("explains a role change on a 403", async () => {
    // Arrange
    const user = userEvent.setup();
    const { dialog } = setup(vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")));

    // Act
    await user.click(dialog.getByRole("button", { name: "Nilai ulang" }));

    // Assert
    expect(await dialog.findByRole("alert")).toHaveTextContent("Peran Anda tidak lagi boleh menilai ulang sesi. Muat ulang halaman.");
  });

  // Edge: after an error the Admin can try again, and the close button tells the page the data may be stale.
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
    const button = dialog.getByRole("button", { name: "Nilai ulang" });

    // Act
    await user.dblClick(button);

    // Assert
    await waitFor(() => expect(gateway.regrade).toHaveBeenCalledTimes(1));
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
    expect(gateway.regrade).not.toHaveBeenCalled();
  });
});
