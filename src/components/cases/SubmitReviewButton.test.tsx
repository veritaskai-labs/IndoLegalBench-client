import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { submitForReview } from "@/lib/cases/submitApi";
import { SubmitReviewButton } from "./SubmitReviewButton";

vi.mock("@/lib/cases/submitApi", () => ({ submitForReview: vi.fn() }));
const submit = vi.mocked(submitForReview);

const SUBMITTED = {
  case_id: "c1",
  version: 1,
  status: "in_review" as const,
  round_no: 1,
  round_status: "awaiting_assignment",
};

beforeEach(() => {
  submit.mockReset();
});

describe("SubmitReviewButton", () => {
  // Positive
  it("submits the case and hands the result back", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    submit.mockResolvedValue(SUBMITTED);

    render(<SubmitReviewButton caseId="c1" ready onSubmitted={onSubmitted} />);
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    expect(submit).toHaveBeenCalledWith("c1");
    expect(onSubmitted).toHaveBeenCalledWith(SUBMITTED);
  });

  it("stays disabled while the case is not ready", async () => {
    const user = userEvent.setup();

    render(
      <SubmitReviewButton caseId="c1" ready={false} onSubmitted={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    expect(submit).not.toHaveBeenCalled();
  });

  it("lists every section that blocks the submission", async () => {
    const user = userEvent.setup();
    submit.mockRejectedValue(
      new ApiError(422, "CASE_NOT_READY", null, null, [
        { field: "legal_refs", message: "Minimal satu rujukan hukum" },
        { field: "split_tag", message: "Tag dataset belum dipilih" },
      ]),
    );

    render(<SubmitReviewButton caseId="c1" ready onSubmitted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    expect(
      await screen.findByText("Minimal satu rujukan hukum"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tag dataset belum dipilih")).toBeInTheDocument();
  });

  // Negative
  it("shows one message when the version cannot be submitted again", async () => {
    const user = userEvent.setup();
    submit.mockRejectedValue(new ApiError(409, "VERSION_NOT_SUBMITTABLE"));

    render(<SubmitReviewButton caseId="c1" ready onSubmitted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "sedang ditinjau atau sudah disetujui",
    );
  });

  // Corner
  it("does not submit twice on a double click", async () => {
    const user = userEvent.setup();
    submit.mockImplementation(() => new Promise(() => undefined));

    render(<SubmitReviewButton caseId="c1" ready onSubmitted={vi.fn()} />);
    const button = screen.getByRole("button", { name: /ajukan review/i });
    await user.click(button);
    await user.click(button);

    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("refuses to submit while there are unsaved changes", async () => {
    const user = userEvent.setup();

    render(
      <SubmitReviewButton caseId="c1" ready dirty onSubmitted={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    expect(submit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Simpan perubahan dulu sebelum mengajukan."),
    ).toBeInTheDocument();
  });

  // Corner: tanpa perubahan tertunda, petunjuk itu tidak muncul.
  it("does not show the save hint when nothing is pending", () => {
    render(<SubmitReviewButton caseId="c1" ready onSubmitted={vi.fn()} />);

    expect(
      screen.queryByText("Simpan perubahan dulu sebelum mengajukan."),
    ).not.toBeInTheDocument();
  });
  // a11y: terhalang bukan berarti hilang dari papan tunjuk; alasannya harus terbaca.
  it("keeps the button focusable and links the save hint to it", () => {
    render(<SubmitReviewButton caseId="c1" ready dirty onSubmitted={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Ajukan review" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(
      "Simpan perubahan dulu sebelum mengajukan.",
    );
  });
  // Negative: diajukan dari tab lain → 409, halaman harus diberi tahu supaya menyegarkan status.
  // Dipasang di bar yang menempel di bawah layar: pesan di atas tombol, tingginya dibatasi.
  it("shows the blockers above the button in a scrollable panel with a capped height", async () => {
    // Arrange
    const user = userEvent.setup();
    submit.mockRejectedValue(
      new ApiError(422, "CASE_NOT_READY", null, null, [
        { field: "legal_refs", message: "Minimal satu rujukan hukum" },
      ]),
    );
    render(<SubmitReviewButton caseId="c1" ready onSubmitted={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Ajukan review" });

    // Act
    await user.click(button);

    // Assert
    const alert = await screen.findByRole("alert");
    expect(alert.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alert).toHaveClass("max-h-40", "overflow-y-auto");
  });

  it("shows the save hint above the button", () => {
    // Arrange / Act
    render(<SubmitReviewButton caseId="c1" ready dirty onSubmitted={vi.fn()} />);

    // Assert
    const hint = screen.getByText("Simpan perubahan dulu sebelum mengajukan.");
    const button = screen.getByRole("button", { name: "Ajukan review" });
    expect(hint.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("tells the page the case is stale when the version cannot be submitted again", async () => {
    const user = userEvent.setup();
    const onStale = vi.fn();
    submit.mockRejectedValue(new ApiError(409, "VERSION_NOT_SUBMITTABLE"));

    render(
      <SubmitReviewButton
        caseId="c1"
        ready
        onStale={onStale}
        onSubmitted={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    await screen.findByRole("alert");
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  // Corner: kegagalan lain tidak memicu penyegaran.
  it("does not call onStale for a failure that is not about the version", async () => {
    const user = userEvent.setup();
    const onStale = vi.fn();
    submit.mockRejectedValue(new ApiError(422, "SUITE_NOT_ACTIVE"));

    render(
      <SubmitReviewButton
        caseId="c1"
        ready
        onStale={onStale}
        onSubmitted={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ajukan review" }));

    await screen.findByRole("alert");
    expect(onStale).not.toHaveBeenCalled();
  });

});
