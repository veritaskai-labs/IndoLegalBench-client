import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";
import {
  canGrade,
  canSeeGradedSessions,
  gradeErrorMessage,
  isNotGraded,
  resultsErrorMessage,
  runsErrorMessage,
  sessionsErrorMessage,
} from "./gradingRules";

/*
 * Test design for canGrade: Input Space Partitioning with Base Choice Coverage.
 * Characteristics and blocks:
 *   role     : admin* | developer_ai | viewer | contributor | null (still loading)
 *   status   : finished* | finished_with_failures | running | queued | paused | cancelled | failed
 *   archived : no* | yes
 *   graded   : no* | yes
 * (* = base choice). The base test takes every base block; each other test changes one
 * characteristic to one other block, so a failure points at that one characteristic.
 */
const BASE = {
  session: { status: "finished" as SessionStatus, archived_at: null as string | null },
  role: "admin" as Role | null,
  graded: false,
};

describe("canGrade (PBI-14 AC6, server#114 ensure_session_gradable)", () => {
  it("offers Nilai to Admin on a finished, unarchived session that has not been graded (base choice)", () => {
    expect(canGrade(BASE)).toBe(true);
  });

  // server#114 GRADABLE_SESSION_STATUSES: running, finished, finished_with_failures.
  it.each<SessionStatus>(["finished_with_failures", "running"])("offers it on a %s session too", (status) => {
    expect(canGrade({ ...BASE, session: { ...BASE.session, status } })).toBe(true);
  });

  it.each<SessionStatus>(["queued", "paused", "cancelled", "failed"])(
    "does not offer it on a %s session, which the server refuses with 409",
    (status) => {
      expect(canGrade({ ...BASE, session: { ...BASE.session, status } })).toBe(false);
    },
  );

  // Only Admin may trigger grading; the server still answers 403 to anyone else.
  it.each<Role | null>(["developer_ai", "viewer", "contributor", null])("hides it from %s", (role) => {
    expect(canGrade({ ...BASE, role })).toBe(false);
  });

  it("does not offer it on an archived session", () => {
    expect(canGrade({ ...BASE, session: { ...BASE.session, archived_at: "2026-11-07T03:00:00Z" } })).toBe(false);
  });

  // Once there is a result, grading again is "Nilai ulang dengan versi terbaru" from SCRUM-228.
  it("leaves a session that already has a result to the re-grade button", () => {
    expect(canGrade({ ...BASE, graded: true })).toBe(false);
  });
});

describe("isNotGraded", () => {
  it("recognises the 404 the server sends before the first grading", () => {
    expect(isNotGraded(new ApiError(404, "GRADING_NOT_FOUND"))).toBe(true);
  });

  // Negative: a missing session is a real error, not an empty result.
  it.each([
    ["a missing session", new ApiError(404, "MEASUREMENT_NOT_FOUND")],
    ["a refusal", new ApiError(403, "FORBIDDEN")],
    ["a network error", new TypeError("Failed to fetch")],
  ])("does not treat %s as not graded", (_name, error) => {
    expect(isNotGraded(error)).toBe(false);
  });
});

describe("gradeErrorMessage", () => {
  it.each([
    [new ApiError(409, "SESSION_NOT_GRADABLE"), "Sesi ini belum bisa dinilai. Hanya sesi yang berjalan atau sudah selesai yang bisa dinilai."],
    [new ApiError(409, "SESSION_ARCHIVED"), "Sesi yang sudah diarsipkan tidak bisa dinilai."],
    [new ApiError(404, "MEASUREMENT_NOT_FOUND"), "Sesi tidak ditemukan. Muat ulang halaman."],
    // gradeSession is silentForbidden, so a 403 (role changed while the page was open) lands here.
    [new ApiError(403, "FORBIDDEN"), "Hanya Admin yang bisa memicu penilaian. Muat ulang halaman."],
    // Re-grading with a chosen version (AC7): the chosen version can be gone.
    [new ApiError(404, "RUBRIC_VERSION_NOT_FOUND"), "Versi rubrik yang dipilih tidak ditemukan. Muat ulang halaman."],
    // server#114 (session_grade.py) answers 409 when no rubric version is active. Retrying can't fix
    // that, so the message says what has to happen first (review on #77).
    [new ApiError(409, "RUBRIC_NOT_ACTIVE"), "Belum ada versi rubrik yang aktif. Aktifkan satu versi rubrik dulu, lalu nilai lagi."],
  ])("explains %s", (error, message) => {
    expect(gradeErrorMessage(error)).toBe(message);
  });

  it.each([
    ["an unknown code", new ApiError(500, "INTERNAL_ERROR")],
    ["a network error", new TypeError("Failed to fetch")],
    ["a non-error value", "boom"],
  ])("falls back to a retry message for %s", (_name, error) => {
    expect(gradeErrorMessage(error)).toBe("Penilaian gagal. Coba lagi.");
  });
});

describe("resultsErrorMessage (AC8)", () => {
  // server#114: the results of a running session are for Admin only.
  it("explains that only Admin sees results while the session runs", () => {
    expect(resultsErrorMessage(new ApiError(403, "FORBIDDEN"))).toBe(
      "Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.",
    );
  });

  it("explains a missing session", () => {
    expect(resultsErrorMessage(new ApiError(404, "MEASUREMENT_NOT_FOUND"))).toBe("Sesi tidak ditemukan. Muat ulang halaman.");
  });

  it.each([
    ["an unknown code", new ApiError(500, "INTERNAL_ERROR")],
    ["a network error", new TypeError("Failed to fetch")],
  ])("falls back to a retry message for %s", (_name, error) => {
    expect(resultsErrorMessage(error)).toBe("Gagal memuat hasil penilaian. Coba lagi.");
  });
});

describe("sessionsErrorMessage (AC8, Laporan list)", () => {
  // server#114 list_graded_sessions: only Admin and Viewer may list graded sessions.
  it("explains that only Admin and Viewer may see the list", () => {
    expect(sessionsErrorMessage(new ApiError(403, "FORBIDDEN"))).toBe(
      "Daftar hasil penilaian hanya dapat dilihat Admin dan Viewer.",
    );
  });

  it.each([
    ["an unknown code", new ApiError(500, "INTERNAL_ERROR")],
    ["a network error", new TypeError("Failed to fetch")],
  ])("falls back to a retry message for %s", (_name, error) => {
    expect(sessionsErrorMessage(error)).toBe("Gagal memuat daftar sesi yang dinilai. Coba lagi.");
  });
});

// server#114 list_graded_sessions answers 403 to every other role, so the list is not offered to them.
// The API stays the real gate (AGENTS.md: hiding alone is not enough).
describe("canSeeGradedSessions (AC8, PO decision: Viewer reads results under Laporan)", () => {
  it.each<[Role, boolean]>([
    ["admin", true],
    ["viewer", true],
    ["contributor", false],
    ["developer_ai", false],
  ])("answers %s with %s", (role, allowed) => {
    expect(canSeeGradedSessions(role)).toBe(allowed);
  });

  it("offers nothing while the role is still loading", () => {
    expect(canSeeGradedSessions(null)).toBe(false);
  });
});

describe("runsErrorMessage (GET /measurements/{id}/grading-runs, PBI-14 AC7)", () => {
  it.each([
    // The history is Admin only (server#122); a role change while the page is open lands here.
    [new ApiError(403, "FORBIDDEN"), "Riwayat penilaian hanya dapat dilihat Admin. Muat ulang halaman."],
    [new ApiError(404, "MEASUREMENT_NOT_FOUND"), "Sesi tidak ditemukan. Muat ulang halaman."],
  ])("explains %s", (error, message) => {
    expect(runsErrorMessage(error)).toBe(message);
  });

  it.each([
    ["an unknown code", new ApiError(500, "INTERNAL_ERROR")],
    ["a network error", new TypeError("Failed to fetch")],
    ["a non-error value", "boom"],
  ])("falls back to a retry message for %s", (_name, error) => {
    expect(runsErrorMessage(error)).toBe("Gagal memuat riwayat penilaian. Coba lagi.");
  });
});
