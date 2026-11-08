import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualAttemptSlot } from "@/types/measurement";
import { ManualAnswerBox } from "./ManualAnswerBox";

const RESPONSE = { attempt_id: "att-1" } as ManualAnswerResponse;

function slot(overrides: Partial<ManualAttemptSlot> = {}): ManualAttemptSlot {
  return {
    attempt_id: "att-1",
    repetition_no: 1,
    filled: false,
    answered_at_platform: null,
    source: "manual",
    platform_refused: false,
    evidence_count: 0,
    ...overrides,
  };
}

function setup(options: { slot?: ManualAttemptSlot; canEdit?: boolean; save?: ManualAnswerGateway["saveAnswer"] } = {}) {
  const saveAnswer = vi.fn<ManualAnswerGateway["saveAnswer"]>(options.save ?? (() => Promise.resolve(RESPONSE)));
  const getHistory = vi.fn().mockResolvedValue([]);
  const listEvidence = vi.fn().mockResolvedValue([]);
  const gateway = { saveAnswer, getHistory, listEvidence } as unknown as ManualAnswerGateway;
  const onSaved = vi.fn();
  const onDirtyChange = vi.fn();
  const view = render(
    <ManualAnswerBox
      sessionId="sesi-1"
      snapshotItemId="snap-1"
      slot={options.slot ?? slot()}
      gateway={gateway}
      canEdit={options.canEdit ?? true}
      currentUserId="u-2"
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />,
  );
  return { saveAnswer, getHistory, listEvidence, onSaved, onDirtyChange, ...view };
}

function type(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Jawaban Percobaan 1" }), { target: { value: text } });
}

describe("ManualAnswerBox header", () => {
  // Positive: the attempt number and the empty status.
  it("shows the attempt number and that it is not filled yet", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByRole("group", { name: "Percobaan 1" })).toBeInTheDocument();
    expect(screen.getByText("Belum diisi")).toBeInTheDocument();
  });

  // Positive: a saved answer shows its status and when it was saved.
  it("shows the saved status and the time the answer was obtained", () => {
    // Arrange
    const saved = slot({ filled: true, answer_md: "Isi", answered_at_platform: "2026-11-07T01:00:00Z" });

    // Act
    setup({ slot: saved });

    // Assert
    expect(screen.getByText("Terisi")).toBeInTheDocument();
    expect(screen.getByText(/07 Nov 2026, 08\.00 WIB/)).toBeInTheDocument();
  });

  // Edge: a refusal counts as filled but says so.
  it("labels a refusal", () => {
    // Arrange
    const refused = slot({ filled: true, platform_refused: true, note: "Ditolak", answered_at_platform: "2026-11-07T01:00:00Z" });

    // Act
    setup({ slot: refused });

    // Assert
    expect(screen.getByText("Platform menolak")).toBeInTheDocument();
  });
});

describe("ManualAnswerBox saving (AC4, AC6)", () => {
  // Positive: type, save, the server gets the text and the parent is told.
  it("saves the typed answer and tells the parent", async () => {
    // Arrange
    const { saveAnswer, onSaved } = setup();
    type("Jawaban platform");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Simpan jawaban" }));

    // Assert
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(RESPONSE));
    expect(saveAnswer).toHaveBeenCalledWith(
      "sesi-1",
      expect.objectContaining({ snapshot_item_id: "snap-1", attempt_no: 1, answer_md: "Jawaban platform", confirm: false }),
    );
  });

  // Negative: AC6 an empty answer is refused on screen and not sent.
  it("shows the empty answer error and does not call the server", async () => {
    // Arrange
    const { saveAnswer } = setup();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Simpan jawaban" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Jawaban tidak boleh kosong");
    expect(saveAnswer).not.toHaveBeenCalled();
  });

  // Negative: a server failure is shown and the text stays.
  it("shows the server error and keeps the text", async () => {
    // Arrange
    setup({ save: vi.fn().mockRejectedValue(new ApiError(409, "MANUAL_SESSION_FINALIZED")) });
    type("Jawaban");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Simpan jawaban" }));

    // Assert
    expect(await screen.findByText("Sesi ini sudah ditandai selesai, jawaban tidak bisa diubah lagi.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Jawaban Percobaan 1" })).toHaveValue("Jawaban");
  });

  // Edge: while saving the button says so and cannot be pressed again.
  it("disables the button while saving", async () => {
    // Arrange
    let finish: (value: ManualAnswerResponse) => void = () => undefined;
    setup({ save: vi.fn().mockImplementation(() => new Promise<ManualAnswerResponse>((r) => (finish = r))) });
    type("Jawaban");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Simpan jawaban" }));

    // Assert
    expect(screen.getByRole("button", { name: "Menyimpan..." })).toBeDisabled();
    finish(RESPONSE);
    await waitFor(() => expect(screen.getByRole("button", { name: "Simpan jawaban" })).toBeEnabled());
  });
});

describe("ManualAnswerBox overwrite (AC5)", () => {
  const saved = () => slot({ filled: true, answer_md: "Lama", answered_at_platform: "2026-11-07T01:00:00Z" });

  // Positive: asks first, says the old answer is kept, then overwrites with confirm.
  it("asks before overwriting and sends confirm=true after the user agrees", async () => {
    // Arrange
    const { saveAnswer, onSaved } = setup({ slot: saved() });
    type("Baru");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Simpan jawaban" }));
    const dialog = screen.getByRole("dialog");
    const explanation = within(dialog).queryByText(/jawaban sebelumnya tetap tersimpan di Riwayat/i);
    expect(saveAnswer).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Timpa jawaban" }));

    // Assert
    expect(explanation).not.toBeNull();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(RESPONSE));
    expect(saveAnswer).toHaveBeenCalledTimes(1);
    expect(saveAnswer.mock.calls[0][1]).toMatchObject({ answer_md: "Baru", confirm: true });
  });

  // Negative: cancelling sends nothing.
  it("sends nothing when the user cancels", async () => {
    // Arrange
    const { saveAnswer } = setup({ slot: saved() });
    type("Baru");
    await userEvent.click(screen.getByRole("button", { name: "Simpan jawaban" }));

    // Act
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));

    // Assert
    expect(saveAnswer).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Jawaban Percobaan 1" })).toHaveValue("Baru");
  });
});

describe("ManualAnswerBox unsaved changes and permissions", () => {
  // Positive: the parent learns when the box becomes dirty and clean again.
  it("reports dirty state to the parent", () => {
    // Arrange
    const { onDirtyChange } = setup();

    // Act
    type("Halo");
    type("");

    // Assert
    expect(onDirtyChange.mock.calls.map((call) => call[1])).toEqual([false, true, false]);
    expect(onDirtyChange.mock.calls[0][0]).toBe("att-1");
  });

  // Edge: a box that disappears is no longer dirty.
  it("reports clean when it unmounts", () => {
    // Arrange
    const { onDirtyChange, unmount } = setup();
    type("Halo");

    // Act
    unmount();

    // Assert
    expect(onDirtyChange).toHaveBeenLastCalledWith("att-1", false);
  });

  // Negative: a Viewer sees the answer but gets no save button.
  it("is read-only without edit permission", () => {
    // Arrange / Act
    setup({ canEdit: false, slot: slot({ filled: true, answer_md: "Isi", answered_at_platform: "2026-11-07T01:00:00Z" }) });

    // Assert
    expect(screen.queryByRole("button", { name: "Simpan jawaban" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Jawaban Percobaan 1" })).toHaveAttribute("readonly");
  });
});

describe("ManualAnswerBox history button (AC5)", () => {
  const filled = () => slot({ filled: true, answer_md: "Isi", answered_at_platform: "2026-11-07T01:00:00Z" });

  // Positive: every saved answer has a Riwayat button that opens the history of that attempt.
  it("opens the history of this attempt", async () => {
    // Arrange
    const { getHistory } = setup({ slot: filled() });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Riwayat" }));

    // Assert
    expect(await screen.findByRole("dialog", { name: "Riwayat Percobaan 1" })).toBeInTheDocument();
    expect(getHistory).toHaveBeenCalledWith("sesi-1", "snap-1", 1);
  });

  // Edge: everyone who can open the session sees it, also without edit permission.
  it("shows the history button to someone who cannot edit", () => {
    // Arrange / Act
    setup({ slot: filled(), canEdit: false });

    // Assert
    expect(screen.getByRole("button", { name: "Riwayat" })).toBeInTheDocument();
  });

  // Negative: an answer that was never saved has no history.
  it("has no history button for an unfilled attempt", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.queryByRole("button", { name: "Riwayat" })).not.toBeInTheDocument();
  });

  // Positive: closing the history dialog removes it.
  it("closes the history dialog", async () => {
    // Arrange
    setup({ slot: filled() });
    await userEvent.click(screen.getByRole("button", { name: "Riwayat" }));
    await screen.findByRole("dialog", { name: "Riwayat Percobaan 1" });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Tutup" }));

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ManualAnswerBox evidence (AC7)", () => {
  // Positive: a saved answer shows its evidence panel.
  it("shows the evidence of a saved answer", async () => {
    // Arrange
    const { listEvidence } = setup({ slot: slot({ filled: true, answer_md: "Isi", answered_at_platform: "2026-11-07T01:00:00Z" }) });

    // Act
    const heading = await screen.findByRole("heading", { name: "Bukti (0 dari 3)" });

    // Assert
    expect(heading).toBeInTheDocument();
    expect(listEvidence).toHaveBeenCalledWith("sesi-1", "snap-1", 1);
  });

  // Edge: an unfilled attempt only explains that the answer has to be saved first.
  it("asks to save the answer before adding evidence", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByText("Simpan jawaban terlebih dahulu untuk menambah bukti.")).toBeInTheDocument();
  });

  // Negative: a role that may not see evidence gets no panel (evidence_count null).
  it("hides the evidence when the role may not see it", () => {
    // Arrange
    const hidden = slot({ filled: true, answer_md: "Isi", answered_at_platform: "2026-11-07T01:00:00Z", evidence_count: null });

    // Act
    const { listEvidence } = setup({ slot: hidden });

    // Assert
    expect(screen.queryByRole("region", { name: "Bukti jawaban" })).not.toBeInTheDocument();
    expect(listEvidence).not.toHaveBeenCalled();
  });
});
