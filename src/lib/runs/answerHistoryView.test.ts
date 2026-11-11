import { describe, expect, it } from "vitest";
import { actorLabel, toHistoryVersions } from "./answerHistoryView";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";

function entry(overrides: Partial<ManualAnswerHistoryEntry> = {}): ManualAnswerHistoryEntry {
  return {
    id: "h-1",
    attempt_id: "att-1",
    answer_md: "Jawaban lama",
    filled_by: "u-1",
    filled_at: "2026-11-07T01:00:00Z",
    obtained_at: "2026-11-07T00:30:00Z",
    platform_refused: false,
    note: null,
    overwritten_by: "u-2",
    overwritten_at: "2026-11-07T03:00:00Z",
    ...overrides,
  };
}

describe("actorLabel (AC5: who filled, who overwrote)", () => {
  // Positive: the current user sees "Anda".
  it("says Anda for the current user", () => {
    // Arrange
    const actor = "u-1";

    // Act
    const label = actorLabel(actor, "u-1");

    // Assert
    expect(label).toBe("Anda");
  });

  // Positive: someone else.
  it("says Anggota lain for another user", () => {
    // Arrange
    const actor = "u-2";

    // Act
    const label = actorLabel(actor, "u-1");

    // Assert
    expect(label).toBe("Anggota lain");
  });

  // Edge: the contract allows a null filler (data from before the field existed) and the current user may be unknown.
  it.each<[string | null, string | null]>([
    [null, "u-1"],
    [null, null],
  ])("says Tidak diketahui when the actor is %j and the current user is %j", (actor, current) => {
    // Arrange
    // (values come from the table)

    // Act
    const label = actorLabel(actor, current);

    // Assert
    expect(label).toBe("Tidak diketahui");
  });

  it("does not claim Anda when the current user is unknown", () => {
    // Arrange
    const actor = "u-1";

    // Act
    const label = actorLabel(actor, null);

    // Assert
    expect(label).toBe("Anggota lain");
  });
});

describe("toHistoryVersions", () => {
  // Positive: numbered versions with WIB times and actors.
  it("turns an entry into a numbered version with WIB times", () => {
    // Arrange
    const entries = [entry()];

    // Act
    const [version] = toHistoryVersions(entries, "u-2");

    // Assert
    expect(version).toEqual({
      key: "h-1",
      title: "Versi 1",
      filledBy: "Anggota lain",
      filledAt: "07 Nov 2026, 08.00 WIB",
      obtainedAt: "07 Nov 2026, 07.30 WIB",
      overwrittenBy: "Anda",
      overwrittenAt: "07 Nov 2026, 10.00 WIB",
      refused: false,
      note: null,
      answerMd: "Jawaban lama",
    });
  });

  // Edge: the server sends oldest first and the numbers follow that order.
  it("keeps the server order and numbers the versions from 1", () => {
    // Arrange
    const entries = [entry({ id: "h-1" }), entry({ id: "h-2" }), entry({ id: "h-3" })];

    // Act
    const titles = toHistoryVersions(entries, null).map((version) => version.title);

    // Assert
    expect(titles).toEqual(["Versi 1", "Versi 2", "Versi 3"]);
  });

  // Edge: an old refusal has no answer text, only the note.
  it("keeps a refusal with its note and no answer text", () => {
    // Arrange
    const entries = [entry({ answer_md: null, platform_refused: true, note: "Di luar cakupan" })];

    // Act
    const [version] = toHistoryVersions(entries, null);

    // Assert
    expect(version.refused).toBe(true);
    expect(version.note).toBe("Di luar cakupan");
    expect(version.answerMd).toBeNull();
  });

  // Edge: a missing obtained time is shown as null, not as a broken date.
  it("gives null when the platform time is missing", () => {
    // Arrange
    const entries = [entry({ obtained_at: null })];

    // Act
    const [version] = toHistoryVersions(entries, null);

    // Assert
    expect(version.obtainedAt).toBeNull();
  });

  // Negative: nothing was overwritten yet.
  it("returns an empty list for an answer that was never overwritten", () => {
    // Arrange
    const entries: ManualAnswerHistoryEntry[] = [];

    // Act
    const versions = toHistoryVersions(entries, "u-1");

    // Assert
    expect(versions).toEqual([]);
  });
});
