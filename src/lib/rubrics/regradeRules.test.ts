import { describe, expect, it } from "vitest";

import { gradingResponse } from "@/test/gradingFixtures";
import { makeRubricSummary } from "@/test/rubricFixtures";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";
import { REGRADE_UNAVAILABLE_TEXT, regradeAvailability } from "./regradeRules";

const SESSION = { status: "finished" as SessionStatus, archived_at: null as string | null };
const V1 = makeRubricSummary({ id: "id-1", version_no: 1 });
const V2 = makeRubricSummary({ id: "id-2", version_no: 2 });
const GRADED_WITH_V1 = gradingResponse({ rubric_version: "v1" });

function input(overrides: Partial<Parameters<typeof regradeAvailability>[0]> = {}) {
  return { role: "admin" as Role | null, session: SESSION, versions: [V1, V2], latest: GRADED_WITH_V1, ...overrides };
}

describe("regradeAvailability (AC7: Nilai ulang dengan versi terbaru)", () => {
  // Positive: graded with v1 while v2 exists, so re-grading with v2 makes sense.
  it("offers the newest version to an Admin when the session was graded with an older one", () => {
    // Arrange
    const arranged = input();

    // Act
    const result = regradeAvailability(arranged);

    // Assert
    expect(result).toEqual({ available: true, version: V2 });
  });

  // Edge: "terbaru" is the highest number, whatever order the server listed the versions in.
  it("picks the highest version number whatever the order", () => {
    // Arrange
    const v3 = makeRubricSummary({ id: "id-3", version_no: 3 });

    // Act
    const result = regradeAvailability(input({ versions: [v3, V1, V2] }));

    // Assert
    expect(result).toEqual({ available: true, version: v3 });
  });

  // The server also grades a session that is still running (server#114), so re-grading is offered there too.
  it.each<SessionStatus>(["running", "finished_with_failures"])("is offered on a %s session", (status) => {
    // Arrange / Act
    const result = regradeAvailability(input({ session: { ...SESSION, status } }));

    // Assert
    expect(result).toEqual({ available: true, version: V2 });
  });

  // Negative: only an Admin sees the button, the server still answers 403 to anyone else.
  it.each<Role | null>(["developer_ai", "viewer", "contributor", null])("is not offered to %s", (role) => {
    // Arrange / Act
    const result = regradeAvailability(input({ role }));

    // Assert
    expect(result).toEqual({ available: false, reason: "not_admin" });
  });

  it("reports the role before anything else", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ role: "viewer", versions: [], latest: null }));

    // Assert
    expect(result).toEqual({ available: false, reason: "not_admin" });
  });

  // Negative: the server refuses archived sessions and sessions that are not gradable (409).
  it("is off for an archived session", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ session: { ...SESSION, archived_at: "2026-11-07T03:00:00Z" } }));

    // Assert
    expect(result).toEqual({ available: false, reason: "session_not_gradable" });
  });

  it.each<SessionStatus>(["queued", "paused", "cancelled", "failed"])("is off for a %s session", (status) => {
    // Arrange / Act
    const result = regradeAvailability(input({ session: { ...SESSION, status } }));

    // Assert
    expect(result).toEqual({ available: false, reason: "session_not_gradable" });
  });

  it("needs at least one rubric version", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ versions: [] }));

    // Assert
    expect(result).toEqual({ available: false, reason: "no_rubric" });
  });

  // Edge: the first grading is the Nilai button of SCRUM-227, so there is nothing to re-grade yet.
  it("needs the session to have been graded before", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ latest: null }));

    // Assert
    expect(result).toEqual({ available: false, reason: "never_graded" });
  });

  // K-17/K-18 (SCRUM-283): with the newest version already used, another LLM judge can still re-grade.
  it("stays on when the latest result already used the newest version", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ latest: gradingResponse({ rubric_version: "v2", kind: "regrade" }) }));

    // Assert
    expect(result).toEqual({ available: true, version: V2 });
  });

  // Edge: a result from a version missing in the list still allows a re-grade; the server decides.
  it("stays on when the result used a version newer than anything in the list", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ versions: [V1], latest: gradingResponse({ rubric_version: "v9" }) }));

    // Assert
    expect(result).toEqual({ available: true, version: V1 });
  });

  // Edge: a label the client cannot read must not hide the button forever; the server decides.
  it("offers the newest version when the result label is not a version number", () => {
    // Arrange / Act
    const result = regradeAvailability(input({ latest: gradingResponse({ rubric_version: "legacy" }) }));

    // Assert
    expect(result).toEqual({ available: true, version: V2 });
  });
});

describe("REGRADE_UNAVAILABLE_TEXT", () => {
  // The Admin sees why the button is off; a viewer is not shown the button at all.
  it("explains every reason the button can be off, except not_admin which hides it", () => {
    // Arrange / Act
    const text = REGRADE_UNAVAILABLE_TEXT;

    // Assert
    expect(text).toEqual({
      session_not_gradable: "Sesi ini belum bisa dinilai ulang. Hanya sesi yang berjalan atau sudah selesai, dan belum diarsipkan.",
      no_rubric: "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik.",
      never_graded: "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu.",
    });
  });
});
