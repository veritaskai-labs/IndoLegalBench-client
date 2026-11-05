import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { resumeSession } from "@/lib/runs/sessionControlApi";
import { ConfirmResumeDialog } from "./ConfirmResumeDialog";

// sessionControlApi has its own request tests (stubbed fetch); here only the dialog's reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({ resumeSession: vi.fn() }));

const resume = vi.mocked(resumeSession);

const resumed = { id: "s-1", status: "running" as const, resumed_after_long_pause: false, model_version_unverified: true };

function renderDialog() {
  const onResumed = vi.fn();
  const onClose = vi.fn();
  render(<ConfirmResumeDialog session={{ id: "s-1", label: "Run November" }} onResumed={onResumed} onClose={onClose} />);
  const dialog = within(screen.getByRole("dialog", { name: "Lanjutkan tanpa versi model terverifikasi?" }));
  return { dialog, onResumed, onClose };
}

beforeEach(() => {
  resume.mockReset();
});

// server#102: a 409 MODEL_VERSION_CONFIRMATION_REQUIRED asks Admin to confirm explicitly.
describe("ConfirmResumeDialog (PBI-12 AC8)", () => {
  it("explains why the version cannot be checked before asking", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText(/belum pernah melaporkan versi model/)).toBeInTheDocument();
    expect(dialog.getByText(/versi model belum terverifikasi/)).toBeInTheDocument();
  });

  it("resumes with the Admin confirmation and tells the page", async () => {
    const user = userEvent.setup();
    resume.mockResolvedValue(resumed);
    const { dialog, onResumed } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Tetap lanjutkan" }));

    expect(resume).toHaveBeenCalledWith("s-1", { confirmUnverifiedVersion: true });
    await waitFor(() => expect(onResumed).toHaveBeenCalledWith(resumed));
  });

  // Negative: another session started in the meantime.
  it("shows why the server refused", async () => {
    const user = userEvent.setup();
    resume.mockRejectedValue(new ApiError(409, "ANOTHER_SESSION_RUNNING"));
    const { dialog } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Tetap lanjutkan" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Masih ada sesi otomatis lain yang berjalan. Lanjutkan setelah sesi itu selesai.",
    );
  });

  it("sends nothing when the user cancels", async () => {
    const user = userEvent.setup();
    const { dialog, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(resume).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
