import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { submitVerdict } from "@/lib/reviews/reviewApi";
import { ASSIGNMENT_ID, makeVerdictResult } from "@/test/reviewFixtures";
import { VerdictForm } from "./VerdictForm";

vi.mock("@/lib/reviews/reviewApi", () => ({ submitVerdict: vi.fn() }));

const submitMock = vi.mocked(submitVerdict);

const send = () => screen.getByRole("button", { name: "Kirim penilaian" });
const approve = () => screen.getByRole("radio", { name: /Dapat dipertahankan sebagaimana tertulis/ });
const revise = () => screen.getByRole("radio", { name: /Perlu revisi/ });
const comment = () => screen.getByLabelText("Komentar untuk penulis");

function renderForm(onSubmitted = vi.fn()) {
  render(<VerdictForm assignmentId={ASSIGNMENT_ID} versionNo={3} onSubmitted={onSubmitted} />);
  return { onSubmitted, user: userEvent.setup() };
}

beforeEach(() => {
  submitMock.mockReset();
});

describe("VerdictForm", () => {
  // Positive
  it("offers both decisions with what each one means, and the version it is recorded against", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(approve()).not.toBeChecked();
    expect(revise()).not.toBeChecked();
    expect(screen.getByText("Saya bersedia mempertahankan referensi ini di depan advokat lain.")).toBeInTheDocument();
    expect(screen.getByText("Mengirim kasus kembali ke penulis beserta komentar Anda.")).toBeInTheDocument();
    expect(screen.getByText("Dicatat terhadap versi 3")).toBeInTheDocument();
  });

  // Negative: nothing chosen yet.
  it("keeps the send button disabled until a decision is picked", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(send()).toBeDisabled();
  });

  // Positive: the comment is optional when approving.
  it("sends an approval without a comment and hands the result to onSubmitted", async () => {
    // Arrange
    const created = makeVerdictResult({ decision: "approve" });
    submitMock.mockResolvedValue(created);
    const { user, onSubmitted } = renderForm();

    // Act
    await user.click(approve());
    await user.click(send());

    // Assert
    expect(submitMock).toHaveBeenCalledWith(ASSIGNMENT_ID, { decision: "approve", comment: null });
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(created));
  });

  // Negative + edge: a revision needs words, and spaces are not words.
  it("keeps the send button disabled for a revision until the comment has text", async () => {
    // Arrange
    const { user } = renderForm();
    await user.click(revise());
    const emptyAtFirst = send().hasAttribute("disabled");

    // Act
    await user.type(comment(), "   ");
    const blankAfterSpaces = send().hasAttribute("disabled");
    await user.type(comment(), "Pasal salah");

    // Assert
    expect(emptyAtFirst).toBe(true);
    expect(blankAfterSpaces).toBe(true);
    expect(send()).toBeEnabled();
  });

  // Positive
  it("sends a revision with the trimmed comment", async () => {
    // Arrange
    submitMock.mockResolvedValue(makeVerdictResult({ decision: "revise", comment: "Pasal salah" }));
    const { user } = renderForm();

    // Act
    await user.click(revise());
    await user.type(comment(), "  Pasal salah ");
    await user.click(send());

    // Assert
    expect(submitMock).toHaveBeenCalledWith(ASSIGNMENT_ID, { decision: "revise", comment: "Pasal salah" });
  });

  // Edge: the comment is marked as required only for a revision.
  it("marks the comment as required only when asking for a revision", async () => {
    // Arrange
    const { user } = renderForm();

    // Act
    await user.click(approve());
    const requiredForApproval = comment().getAttribute("aria-required");
    await user.click(revise());

    // Assert
    expect(requiredForApproval).toBe("false");
    expect(comment()).toHaveAttribute("aria-required", "true");
  });

  // Negative: the reviewer must not lose what they wrote.
  it("shows the server's message and keeps what was typed when sending fails", async () => {
    // Arrange
    submitMock.mockRejectedValue(new ApiError(409, "VERDICT_ALREADY_SUBMITTED"));
    const { user, onSubmitted } = renderForm();
    await user.click(revise());
    await user.type(comment(), "Pasal salah");

    // Act
    await user.click(send());

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Penilaian untuk penugasan ini sudah dikirim.");
    expect(comment()).toHaveValue("Pasal salah");
    expect(revise()).toBeChecked();
    expect(send()).toBeEnabled();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  // Edge: no second send while the first is on its way.
  it("disables the button and says it is sending while the request is pending", async () => {
    // Arrange
    let finish: (value: ReturnType<typeof makeVerdictResult>) => void = () => undefined;
    submitMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { user } = renderForm();
    await user.click(approve());

    // Act
    await user.click(send());

    // Assert
    const sending = await screen.findByRole("button", { name: "Mengirim…" });
    expect(sending).toBeDisabled();
    finish(makeVerdictResult());
    await waitFor(() => expect(screen.getByRole("button", { name: "Kirim penilaian" })).toBeEnabled());
    expect(submitMock).toHaveBeenCalledTimes(1);
  });
});
