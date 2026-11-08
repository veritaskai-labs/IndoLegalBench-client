import { describe, expect, it } from "vitest";
import {
  buildSaveRequest,
  draftFromSlot,
  emptyDraft,
  isDirty,
  validateDraft,
  type AnswerDraft,
} from "./manualAnswerRules";
import type { ManualAttemptSlot } from "@/types/measurement";

const NOW = new Date("2026-11-08T03:30:00Z");

function draft(overrides: Partial<AnswerDraft> = {}): AnswerDraft {
  return {
    answerMd: "Jawaban platform",
    platformRefused: false,
    note: "",
    obtainedAt: "2026-11-08T10:30",
    ...overrides,
  };
}

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

describe("validateDraft (AC6, AC7)", () => {
  // Positive: a pasted answer with a valid time passes.
  it("accepts an answer with a valid time", () => {
    // Arrange
    const input = draft();

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors).toEqual({});
  });

  // Negative: AC6 rejects an empty answer.
  it("rejects an empty answer", () => {
    // Arrange
    const input = draft({ answerMd: "" });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors.answer).toBe(
      "Jawaban tidak boleh kosong. Tempel jawaban platform, atau pilih \"Platform menolak menjawab\".",
    );
  });

  // Edge: spaces and line breaks only are as empty as nothing.
  it("rejects an answer made of whitespace only", () => {
    // Arrange
    const input = draft({ answerMd: "  \n\t  \n" });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors.answer).toBeDefined();
  });

  // Edge: a long answer (about 30 pages) has no character limit.
  it("accepts a very long answer", () => {
    // Arrange
    const input = draft({ answerMd: "kalimat panjang. ".repeat(100_000) });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors).toEqual({});
  });

  // Positive: AC6 exception, a refusal with a note counts as filled even with no answer text.
  it("accepts a refusal with a note and an empty answer", () => {
    // Arrange
    const input = draft({ answerMd: "", platformRefused: true, note: "Platform menolak: di luar cakupan" });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors).toEqual({});
  });

  // Negative: a refusal without a note is refused, the legal team has to say why.
  it.each(["", "   "])("rejects a refusal with the note %j", (note) => {
    // Arrange
    const input = draft({ answerMd: "", platformRefused: true, note });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors.note).toBe("Catatan wajib diisi bila platform menolak menjawab.");
    expect(errors.answer).toBeUndefined();
  });

  // Negative: a cleared or broken time cannot be sent.
  it.each(["", "2026-02-31T10:00"])("rejects the time %j", (obtainedAt) => {
    // Arrange
    const input = draft({ obtainedAt });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(errors.obtainedAt).toBe("Tanggal dan jam jawaban diperoleh tidak valid.");
  });

  // Edge: several problems are reported together so the form can mark every field.
  it("reports every invalid field at once", () => {
    // Arrange
    const input = draft({ answerMd: " ", obtainedAt: "" });

    // Act
    const errors = validateDraft(input);

    // Assert
    expect(Object.keys(errors).sort()).toEqual(["answer", "obtainedAt"]);
  });
});

describe("buildSaveRequest (AC4, AC6, AC7)", () => {
  // Positive: the answer goes to the server as is, the time as ISO UTC.
  it("builds a request with the answer, the UTC time and the ids", () => {
    // Arrange
    const input = draft();

    // Act
    const request = buildSaveRequest(input, "snap-1", 2, false);

    // Assert
    expect(request).toEqual({
      snapshot_item_id: "snap-1",
      attempt_no: 2,
      answer_md: "Jawaban platform",
      obtained_at: "2026-11-08T03:30:00.000Z",
      platform_refused: false,
      note: null,
      confirm: false,
    });
  });

  // Edge: AC4 keeps the answer exactly as pasted, tables, disclaimers and edge spaces included.
  it("does not trim or change the answer text", () => {
    // Arrange
    const raw = "\n  | a | b |\n|---|---|\n| 1 | 2 |\n\nPenafian: bukan nasihat hukum.  \n";
    const input = draft({ answerMd: raw });

    // Act
    const request = buildSaveRequest(input, "snap-1", 1, false);

    // Assert
    expect(request?.answer_md).toBe(raw);
  });

  // Edge: a refusal sends an explicit null answer and the trimmed note.
  it("sends a null answer and the trimmed note for a refusal", () => {
    // Arrange
    const input = draft({ answerMd: "sisa teks", platformRefused: true, note: "  ditolak  " });

    // Act
    const request = buildSaveRequest(input, "snap-1", 1, false);

    // Assert
    expect(request?.answer_md).toBeNull();
    expect(request?.note).toBe("ditolak");
    expect(request?.platform_refused).toBe(true);
  });

  // Edge: a note left over from a refusal that was switched off is not sent.
  it("drops the note when the platform did answer", () => {
    // Arrange
    const input = draft({ platformRefused: false, note: "catatan lama" });

    // Act
    const request = buildSaveRequest(input, "snap-1", 1, false);

    // Assert
    expect(request?.note).toBeNull();
  });

  // Positive: AC5 the overwrite is sent with confirm=true after the user agrees.
  it("passes the confirm flag for an overwrite", () => {
    // Arrange
    const input = draft();

    // Act
    const request = buildSaveRequest(input, "snap-1", 1, true);

    // Assert
    expect(request?.confirm).toBe(true);
  });

  // Negative: an invalid draft never produces a request.
  it("returns null for an invalid draft", () => {
    // Arrange
    const input = draft({ answerMd: "" });

    // Act
    const request = buildSaveRequest(input, "snap-1", 1, false);

    // Assert
    expect(request).toBeNull();
  });
});

describe("emptyDraft and draftFromSlot (AC7)", () => {
  // Positive: AC7 the time defaults to now, shown in WIB.
  it("starts empty with the current time in WIB", () => {
    // Arrange
    // (NOW is fixed)

    // Act
    const result = emptyDraft(NOW);

    // Assert
    expect(result).toEqual({
      answerMd: "",
      platformRefused: false,
      note: "",
      obtainedAt: "2026-11-08T10:30",
    });
  });

  // Positive: a saved answer comes back into the form with its own time.
  it("fills the draft from a saved answer", () => {
    // Arrange
    const saved = slot({
      filled: true,
      answer_md: "Tersimpan",
      answered_at_platform: "2026-11-07T01:00:00Z",
    });

    // Act
    const result = draftFromSlot(saved, NOW);

    // Assert
    expect(result).toEqual({
      answerMd: "Tersimpan",
      platformRefused: false,
      note: "",
      obtainedAt: "2026-11-07T08:00",
    });
  });

  // Positive: a saved refusal keeps its note and has no answer text.
  it("fills the draft from a saved refusal", () => {
    // Arrange
    const saved = slot({
      filled: true,
      answer_md: null,
      platform_refused: true,
      note: "Ditolak",
      answered_at_platform: "2026-11-07T01:00:00Z",
    });

    // Act
    const result = draftFromSlot(saved, NOW);

    // Assert
    expect(result.platformRefused).toBe(true);
    expect(result.answerMd).toBe("");
    expect(result.note).toBe("Ditolak");
  });

  // Edge: an unfilled slot is the same as an empty draft.
  it("gives an empty draft for an unfilled slot", () => {
    // Arrange
    const unfilled = slot({ filled: false });

    // Act
    const result = draftFromSlot(unfilled, NOW);

    // Assert
    expect(result).toEqual(emptyDraft(NOW));
  });

  // Edge: a filled slot without a time falls back to now instead of an empty field.
  it("uses the current time when a saved answer has no time", () => {
    // Arrange
    const saved = slot({ filled: true, answer_md: "x", answered_at_platform: null });

    // Act
    const result = draftFromSlot(saved, NOW);

    // Assert
    expect(result.obtainedAt).toBe("2026-11-08T10:30");
  });
});

describe("isDirty (unsaved changes warning)", () => {
  // Positive: identical drafts are clean.
  it("is false when nothing changed", () => {
    // Arrange
    const base = draft();

    // Act
    const dirty = isDirty({ ...base }, base);

    // Assert
    expect(dirty).toBe(false);
  });

  // Positive: every editable field counts.
  it.each<[string, Partial<AnswerDraft>]>([
    ["answer", { answerMd: "lain" }],
    ["refusal", { platformRefused: true }],
    ["note", { note: "x" }],
    ["time", { obtainedAt: "2026-11-09T10:30" }],
  ])("is true when the %s changed", (_name, change) => {
    // Arrange
    const base = draft();

    // Act
    const dirty = isDirty({ ...base, ...change }, base);

    // Assert
    expect(dirty).toBe(true);
  });

  // Edge: typing and then deleting back to the saved text is not a change.
  it("is false after the user restores the saved text", () => {
    // Arrange
    const base = draft({ answerMd: "asli" });
    const edited = { ...base, answerMd: "asli diubah" };
    const restored = { ...edited, answerMd: "asli" };

    // Act
    const dirty = isDirty(restored, base);

    // Assert
    expect(dirty).toBe(false);
  });
});
