import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { SessionListItem, SessionStatus } from "@/types/measurement";
import {
  archiveErrorMessage,
  canArchive,
  canUnarchive,
  caseCountText,
  formatProgress,
  hasEnded,
  isSettled,
  shouldPollSessions,
  SESSION_STATUS_LABEL,
  sessionStatusLabel,
  unarchiveErrorMessage,
  unknownName,
} from "./sessionRules";

const ADMIN = { id: "admin-1", role: "admin" } as const;
const DEV_AI = { id: "dev-1", role: "developer_ai" } as const;

function session(overrides: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: "s-1",
    label: "Uji Coba DeepSeek",
    created_at: "2026-11-03T02:00:00Z",
    created_by: "dev-1",
    created_by_name: "Uji Developer AI",
    product_id: "p-1",
    product_name: "DeepSeek",
    case_count: 20,
    repetitions: 3,
    status: "finished",
    session_type: "automatic",
    progress: { completed: 60, total: 60, completed_cases: 20, total_cases: 20, percent_cases_complete: 100 },
    ...overrides,
  };
}

describe("SESSION_STATUS_LABEL (PBI-11 AC10, PBI-12 AC9, D4 status enum)", () => {
  it.each<[SessionStatus, string]>([
    ["queued", "Menunggu"],
    ["running", "Berjalan"],
    ["finished", "Selesai"],
    ["finished_with_failures", "Selesai dengan kegagalan"],
    ["failed", "Gagal"],
    // server#97 (SCRUM-214): Jeda lands on paused, Batalkan on cancelled.
    ["paused", "Dijeda"],
    ["cancelled", "Dibatalkan"],
    // server#116 (PBI-22): manual session statuses, labelled as in server runs/models.py.
    ["not_filled", "Belum terisi"],
    ["partially_filled", "Terisi sebagian"],
    ["complete", "Lengkap"],
    ["graded", "Dinilai"],
    ["finalized", "Selesai"],
  ])("names %s as %s", (status, label) => {
    expect(SESSION_STATUS_LABEL[status]).toBe(label);
  });
});

// server#97: paused covers Jeda and a system stop; stop_reason tells them apart (Rafa, group chat).
describe("sessionStatusLabel (PBI-12 AC9: Dijeda vs Dihentikan)", () => {
  it("names a session the user paused Dijeda", () => {
    expect(sessionStatusLabel("paused", "user")).toBe("Dijeda");
  });

  // server#102: error on a paused session means the model version changed after a resume.
  it.each(["budget", "restart", "error"] as const)("names a session the system stopped (%s) Dihentikan", (reason) => {
    expect(sessionStatusLabel("paused", reason)).toBe("Dihentikan");
  });

  // Edge: a session paused before stop_reason existed, or a list row that does not carry it.
  it.each([null, undefined])("falls back to Dijeda when the reason is %s", (reason) => {
    expect(sessionStatusLabel("paused", reason)).toBe("Dijeda");
  });

  // Negative: the reason only refines paused; a failed session with reason error stays Gagal.
  it("keeps every other status on its own label", () => {
    expect(sessionStatusLabel("failed", "error")).toBe("Gagal");
    expect(sessionStatusLabel("running", null)).toBe("Berjalan");
  });
});

describe("formatProgress (SCRUM-266: cases with a whole percentage)", () => {
  function progress(completed_cases: number, total_cases: number, percent_cases_complete: number) {
    return { completed: completed_cases * 3, total: total_cases * 3, completed_cases, total_cases, percent_cases_complete };
  }

  it("shows finished cases out of all cases with the percentage, the way the ticket spells it", () => {
    expect(formatProgress(session({ status: "running", progress: progress(7, 20, 35) }))).toBe("7 dari 20 kasus · 35%");
  });

  // The list and the panel show the same numbers, so they group thousands the same way.
  it("groups thousands like the progress panel", () => {
    expect(formatProgress(session({ status: "running", progress: progress(1200, 1500, 80) }))).toBe(
      "1.200 dari 1.500 kasus · 80%",
    );
  });

  it("shows a running session that has not finished a case yet as 0%", () => {
    expect(formatProgress(session({ status: "running", progress: progress(0, 20, 0) }))).toBe("0 dari 20 kasus · 0%");
  });

  it("shows a finished session as complete", () => {
    expect(formatProgress(session())).toBe("20 dari 20 kasus · 100%");
  });

  // The snapshot is made when the session starts, so a queued session has no cases yet.
  it("says a queued session is waiting instead of 0 dari 0", () => {
    expect(formatProgress(session({ status: "queued", progress: progress(0, 0, 0) }))).toBe("Menunggu antrean");
  });

  // server#91 07648e5: a queued session can fail before it starts, still with no cases.
  it("keeps 0 dari 0 for a session that ended without cases", () => {
    expect(formatProgress(session({ status: "failed", progress: progress(0, 0, 0) }))).toBe("0 dari 0 kasus · 0%");
  });

  it("never prints past 100% even if the server sends a broken number", () => {
    expect(formatProgress(session({ status: "running", progress: progress(20, 20, 140) }))).toBe("20 dari 20 kasus · 100%");
  });
});

describe("canArchive (AC10, D10: Developer AI only own sessions)", () => {
  it.each<SessionStatus>(["finished", "finished_with_failures", "failed"])(
    "lets Admin archive a %s session of someone else",
    (status) => {
      expect(canArchive(session({ status, created_by: "someone-else" }), ADMIN)).toBe(true);
    },
  );

  // paused and cancelled can still be resumed (D4), so they have not ended either.
  it.each<SessionStatus>(["queued", "running", "paused", "cancelled"])("never offers it for a %s session, even to Admin", (status) => {
    expect(canArchive(session({ status }), ADMIN)).toBe(false);
  });

  it("lets Developer AI archive an ended session it started", () => {
    expect(canArchive(session({ created_by: "dev-1" }), DEV_AI)).toBe(true);
  });

  it("hides it from Developer AI on a session someone else started", () => {
    expect(canArchive(session({ created_by: "admin-1" }), DEV_AI)).toBe(false);
  });

  it.each(["contributor", "viewer"] as const)("hides it from %s, who cannot open the page anyway", (role) => {
    expect(canArchive(session({ created_by: "u-1" }), { id: "u-1", role })).toBe(false);
  });
});

describe("archiveErrorMessage", () => {
  it.each([
    [new ApiError(409, "SESSION_NOT_ARCHIVABLE"), "Sesi yang masih antre atau berjalan belum bisa diarsipkan."],
    [new ApiError(409, "SESSION_ALREADY_ARCHIVED"), "Sesi ini sudah diarsipkan."],
    [new ApiError(403, "NOT_YOUR_SESSION"), "Developer AI hanya bisa mengarsipkan sesi yang ia buat."],
    [new ApiError(404, "MEASUREMENT_NOT_FOUND"), "Sesi tidak ditemukan. Muat ulang daftar."],
    // archiveSession is silentForbidden, so a plain 403 (role changed while the page was open)
    // lands here; "Coba lagi" would send the user into a retry that keeps failing (Nizar, #67).
    [new ApiError(403, "FORBIDDEN"), "Peran Anda tidak lagi boleh mengarsipkan sesi. Muat ulang halaman."],
  ])("explains %s", (error, message) => {
    expect(archiveErrorMessage(error)).toBe(message);
  });

  it.each([
    ["an unknown code", new ApiError(500, "INTERNAL_ERROR")],
    ["a network error", new TypeError("Failed to fetch")],
    ["a non-error value", "boom"],
  ])("falls back to a retry message for %s", (_name, error) => {
    expect(archiveErrorMessage(error)).toBe("Sesi gagal diarsipkan. Coba lagi.");
  });
});

describe("canUnarchive (AC10, D10: Developer AI only own sessions)", () => {
  // An archived session has ended by definition and the server ignores its status, so does the rule.
  it.each<SessionStatus>(["finished", "finished_with_failures", "failed"])(
    "lets Admin restore a %s session of someone else",
    (status) => {
      expect(canUnarchive(session({ status, created_by: "someone-else" }), ADMIN)).toBe(true);
    },
  );

  it("lets Developer AI restore a session it started", () => {
    expect(canUnarchive(session({ created_by: "dev-1" }), DEV_AI)).toBe(true);
  });

  it("hides it from Developer AI on a session someone else started", () => {
    expect(canUnarchive(session({ created_by: "admin-1" }), DEV_AI)).toBe(false);
  });

  it.each(["contributor", "viewer"] as const)("hides it from %s, who cannot open the page anyway", (role) => {
    expect(canUnarchive(session({ created_by: "u-1" }), { id: "u-1", role })).toBe(false);
  });
});

describe("unarchiveErrorMessage", () => {
  it.each([
    [new ApiError(409, "SESSION_NOT_ARCHIVED"), "Sesi ini sudah dikembalikan. Muat ulang daftar."],
    [new ApiError(403, "NOT_YOUR_SESSION"), "Developer AI hanya bisa mengembalikan sesi yang ia buat."],
    [new ApiError(404, "MEASUREMENT_NOT_FOUND"), "Sesi tidak ditemukan. Muat ulang daftar."],
    // unarchiveSession is silentForbidden, so a plain 403 (role changed while the page was open)
    // lands here; "Coba lagi" would only retry something that keeps failing.
    [new ApiError(403, "FORBIDDEN"), "Peran Anda tidak lagi boleh mengembalikan sesi. Muat ulang halaman."],
  ])("explains %s", (error, message) => {
    expect(unarchiveErrorMessage(error)).toBe(message);
  });

  it.each([
    ["an unknown code", new ApiError(500, "INTERNAL_ERROR")],
    ["a network error", new TypeError("Failed to fetch")],
    ["a non-error value", "boom"],
  ])("falls back to a retry message for %s", (_name, error) => {
    expect(unarchiveErrorMessage(error)).toBe("Sesi gagal dikembalikan. Coba lagi.");
  });
});

describe("caseCountText and unknownName", () => {
  // case_count is null while queued: the snapshot does not exist yet.
  it("shows a dash before the snapshot exists, and the count after", () => {
    expect(caseCountText(null)).toBe("–");
    expect(caseCountText(0)).toBe("0");
    expect(caseCountText(20)).toBe("20");
  });

  // created_by_name / product_name are null when the account or product is gone.
  it("names a missing account or product", () => {
    expect(unknownName(null)).toBe("Tidak diketahui");
    expect(unknownName("")).toBe("Tidak diketahui");
    expect(unknownName("DeepSeek")).toBe("DeepSeek");
  });
});

// server has_ended: cancelled can still be resumed (server#102), so it has not ended. It does not
// change on its own either, so the detail page stops polling it (#70 meant the same).
describe("hasEnded and isSettled (PBI-12 AC8, SCRUM-219 polling)", () => {
  // server#116 added finalized (a manual session Admin closed) to has_ended.
  it.each<SessionStatus>(["finished", "finished_with_failures", "failed", "finalized"])("treats %s as ended and settled", (status) => {
    expect(hasEnded(status)).toBe(true);
    expect(isSettled(status)).toBe(true);
  });

  it("treats cancelled as settled but not ended", () => {
    expect(hasEnded("cancelled")).toBe(false);
    expect(isSettled("cancelled")).toBe(true);
  });

  // Same as #70: only ended (and now cancelled) sessions stop polling; paused keeps it.
  it.each<SessionStatus>(["queued", "running", "paused"])("keeps %s unsettled", (status) => {
    expect(isSettled(status)).toBe(false);
  });
});

describe("shouldPollSessions (SCRUM-266, list progress column)", () => {
  // Only a queued or running session changes by itself; the list follows it about every 5 seconds.
  it.each<SessionStatus>(["queued", "running"])("polls while a session is %s", (status) => {
    expect(shouldPollSessions([session({ status: "finished" }), session({ id: "s-2", status })])).toBe(true);
  });

  // paused and cancelled wait for a person; manual sessions change when someone fills them in.
  it.each<SessionStatus>([
    "paused",
    "cancelled",
    "finished",
    "finished_with_failures",
    "failed",
    "not_filled",
    "partially_filled",
    "complete",
    "graded",
    "finalized",
  ])("does not poll for a list that only has %s sessions", (status) => {
    expect(shouldPollSessions([session({ status })])).toBe(false);
  });

  it("does not poll an empty list", () => {
    expect(shouldPollSessions([])).toBe(false);
  });
});
