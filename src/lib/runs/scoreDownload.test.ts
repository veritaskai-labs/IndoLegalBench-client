import { describe, expect, it } from "vitest";

import type { SessionStatus } from "@/types/measurement";
import { SCORE_DOWNLOAD_REASON, scoreDownloadDecision, type ScoreDownloadSession, type ScoreGrading } from "./scoreDownload";

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
    ).toEqual({ eligible: false, reason: SCORE_DOWNLOAD_REASON.notGraded });
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
      reason: SCORE_DOWNLOAD_REASON.notGraded,
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
      reason: SCORE_DOWNLOAD_REASON.inProgress,
    });
  });

  it("explains a cancelled session, including one that was already graded", () => {
    expect(decision({ status: "cancelled" }, "graded")).toEqual({
      eligible: false,
      reason: SCORE_DOWNLOAD_REASON.resume,
    });
  });

  it("explains a finished-with-failures session that has not been accepted", () => {
    expect(decision({ status: "finished_with_failures" }, "graded")).toEqual({
      eligible: false,
      reason: SCORE_DOWNLOAD_REASON.notAccepted,
    });
  });

  it("explains a finished session that has no grading result", () => {
    expect(decision({ status: "finished" }, "ungraded")).toEqual({
      eligible: false,
      reason: SCORE_DOWNLOAD_REASON.notGraded,
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
    ).toEqual({ eligible: false, reason: SCORE_DOWNLOAD_REASON.notAccepted });
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
    ).toEqual({ eligible: false, reason: SCORE_DOWNLOAD_REASON.notAccepted });
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
    ).toEqual({ eligible: false, reason: SCORE_DOWNLOAD_REASON.notAccepted });
  });

  // Negative: no other status becomes eligible, graded or not.
  it.each<[SessionStatus, ScoreGrading, string]>([
    ["queued", "graded", SCORE_DOWNLOAD_REASON.inProgress],
    ["paused", "graded", SCORE_DOWNLOAD_REASON.resume],
    ["failed", "graded", SCORE_DOWNLOAD_REASON.notGraded],
    ["not_filled", "ungraded", SCORE_DOWNLOAD_REASON.inProgress],
    ["partially_filled", "graded", SCORE_DOWNLOAD_REASON.inProgress],
    ["complete", "graded", SCORE_DOWNLOAD_REASON.notGraded],
    ["graded", "graded", SCORE_DOWNLOAD_REASON.notGraded],
  ])("blocks %s (%s) with the same kind of explanation", (status, grading, reason) => {
    expect(decision({ status }, grading)).toEqual({ eligible: false, reason });
  });
});
