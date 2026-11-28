import { describe, expect, it } from "vitest";

import type { SessionStatus } from "@/types/measurement";
import { SCORE_DOWNLOAD_REASON, scoreDownloadDecision, type ScoreDownloadSession, type ScoreGrading } from "./scoreDownload";

/** Kalimat unduhan di server (score_files._PESAN_UNDUH), satu kode per status. */
const NOT_FINISHED =
  "Sesi ini belum selesai, jadi berkas skornya belum bisa diunduh. Tunggu sampai sesi selesai.";
const CANCELLED =
  "Sesi ini dibatalkan, jadi berkas skornya belum bisa diunduh. Lanjutkan sesi sampai selesai dulu.";
const RUN_FAILED = "Proses run sesi ini gagal, jadi tidak ada skor yang bisa diunduh. Buat sesi baru.";
const NOT_ACCEPTED =
  "Sesi ini selesai dengan kegagalan dan belum diterima apa adanya oleh Admin, jadi berkas skornya belum bisa diunduh.";
const NOT_GRADED = "Sesi ini belum dinilai, jadi berkas skornya belum bisa diunduh.";

const REASON = "Dua kasus gagal karena batas penyedia.";

function session(overrides: Partial<ScoreDownloadSession> = {}): ScoreDownloadSession {
  return {
    status: "finished",
    session_type: "automatic",
    accepted_as_is_at: null,
    accepted_as_is_reason: null,
    ...overrides,
  };
}

function decision(overrides: Partial<ScoreDownloadSession> = {}, grading: ScoreGrading = "ungraded") {
  return scoreDownloadDecision(session(overrides), grading);
}

describe("scoreDownloadDecision (SCRUM-83 AC6, SCRUM-329)", () => {
  it("allows a finished session that already has a grading result", () => {
    expect(decision({ status: "finished" }, "graded")).toEqual({ eligible: true });
  });

  it("allows an automatic session accepted as-is when it is also graded", () => {
    expect(
      decision(
        {
          status: "finished_with_failures",
          accepted_as_is_at: "2026-11-12T04:15:00Z",
          accepted_as_is_reason: REASON,
        },
        "graded",
      ),
    ).toEqual({ eligible: true });
  });

  // D2: the accept mark is not a score. The file still needs a finished grading run.
  it("explains an accepted session that has no grading result", () => {
    expect(
      decision(
        {
          status: "finished_with_failures",
          accepted_as_is_at: "2026-11-12T04:15:00Z",
          accepted_as_is_reason: REASON,
        },
        "ungraded",
      ),
    ).toEqual({ eligible: false, reason: NOT_GRADED });
  });

  it("waits, without a reason, while an accepted session's grading result is unknown", () => {
    expect(
      decision(
        {
          status: "finished_with_failures",
          accepted_as_is_at: "2026-11-12T04:15:00Z",
          accepted_as_is_reason: REASON,
        },
        "unknown",
      ),
    ).toEqual({ eligible: false, reason: null });
  });

  // D2: a manual session is eligible once it is Selesai (finalized) and graded. Dinilai is not.
  it("allows a finalized manual session that already has a grading result", () => {
    expect(decision({ status: "finalized", session_type: "manual" }, "graded")).toEqual({ eligible: true });
  });

  it("explains a finalized session that has no grading result", () => {
    expect(decision({ status: "finalized", session_type: "manual" }, "ungraded")).toEqual({
      eligible: false,
      reason: NOT_GRADED,
    });
  });

  it("waits, without a reason, while a finalized session's grading result is unknown", () => {
    expect(decision({ status: "finalized", session_type: "manual" }, "unknown")).toEqual({
      eligible: false,
      reason: null,
    });
  });

  // The download route rejects an archived session even when it would otherwise be eligible.
  it("explains an archived session instead of offering the file", () => {
    expect(decision({ status: "finished", archived_at: "2026-11-12T04:15:00Z" }, "graded")).toEqual({
      eligible: false,
      reason: SCORE_DOWNLOAD_REASON.archived,
    });
  });

  it("explains a running session, including one that was already graded", () => {
    expect(decision({ status: "running" }, "graded")).toEqual({
      eligible: false,
      reason: NOT_FINISHED,
    });
  });

  it("explains a cancelled session, including one that was already graded", () => {
    expect(decision({ status: "cancelled" }, "graded")).toEqual({
      eligible: false,
      reason: CANCELLED,
    });
  });

  it("explains a finished-with-failures session that has not been accepted", () => {
    expect(decision({ status: "finished_with_failures" }, "graded")).toEqual({
      eligible: false,
      reason: NOT_ACCEPTED,
    });
  });

  it("explains a finished session that has no grading result", () => {
    expect(decision({ status: "finished" }, "ungraded")).toEqual({
      eligible: false,
      reason: NOT_GRADED,
    });
  });

  // The grading request is still out. Don't claim the session was never graded.
  it("waits, without a reason, while a finished session's grading result is unknown", () => {
    expect(decision({ status: "finished" }, "unknown")).toEqual({ eligible: false, reason: null });
  });

  // Boundary: the accept mark does not count without a reason a person can read.
  it.each([
    ["missing", null],
    ["empty", ""],
    ["spaces", "   "],
    ["zero-width", "\u200B"],
  ])("refuses an accept mark whose reason is %s", (_name, accepted_as_is_reason) => {
    expect(
      decision(
        {
          status: "finished_with_failures",
          accepted_as_is_at: "2026-11-12T04:15:00Z",
          accepted_as_is_reason,
        },
        "graded",
      ),
    ).toEqual({ eligible: false, reason: NOT_ACCEPTED });
  });

  it("refuses a written reason when the session was not actually accepted", () => {
    expect(
      decision(
        {
          status: "finished_with_failures",
          accepted_as_is_at: null,
          accepted_as_is_reason: REASON,
        },
        "graded",
      ),
    ).toEqual({ eligible: false, reason: NOT_ACCEPTED });
  });

  // AC6 names automatic sessions for the accept exception.
  it("does not treat a manual session's accept fields as the exception", () => {
    expect(
      decision(
        {
          status: "finished_with_failures",
          session_type: "manual",
          accepted_as_is_at: "2026-11-12T04:15:00Z",
          accepted_as_is_reason: REASON,
        },
        "graded",
      ),
    ).toEqual({ eligible: false, reason: NOT_ACCEPTED });
  });

  // One sentence per status, the same one the download route returns for that code.
  it.each<[SessionStatus, ScoreGrading, string]>([
    ["queued", "graded", NOT_FINISHED],
    ["running", "graded", NOT_FINISHED],
    ["paused", "graded", NOT_FINISHED],
    ["cancelled", "graded", CANCELLED],
    ["finished_with_failures", "graded", NOT_ACCEPTED],
    ["failed", "graded", RUN_FAILED],
    ["not_filled", "graded", NOT_FINISHED],
    ["partially_filled", "graded", NOT_FINISHED],
    ["complete", "graded", NOT_FINISHED],
    ["graded", "graded", NOT_FINISHED],
    ["finished", "ungraded", NOT_GRADED],
    ["finalized", "ungraded", NOT_GRADED],
  ])("explains %s (%s) with the server sentence", (status, grading, reason) => {
    expect(decision({ status, session_type: "manual" }, grading)).toEqual({ eligible: false, reason });
  });
});

describe("scoreDownloadDecision English", () => {
  it("explains an unfinished session in English", () => {
    expect(scoreDownloadDecision(session({ status: "running" }), "graded", "en")).toEqual({
      eligible: false,
      reason: "This session is not finished, so its score file cannot be downloaded yet. Wait until the session finishes.",
    });
  });
});
