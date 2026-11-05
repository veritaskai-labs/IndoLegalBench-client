import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { AttemptStatus, SessionStatus } from "@/types/measurement";
import {
  canCancel,
  canPause,
  canResume,
  canRetry,
  controlErrorMessage,
  failedAttemptCount,
  failedCases,
  retrySelection,
} from "./sessionControl";

const ARCHIVED_AT = "2026-11-05T04:00:00Z";

function session(status: SessionStatus, overrides: { archived_at?: string | null; resume_error_code?: "MODEL_VERSION_CHANGED" | null } = {}) {
  return { status, archived_at: null, resume_error_code: null, ...overrides };
}

const ALL: SessionStatus[] = ["queued", "running", "paused", "cancelled", "finished", "finished_with_failures", "failed"];

// server#102 transitions: running→paused; queued/running/paused→cancelled; paused/cancelled→running.
describe.each([
  ["canPause", canPause, ["running"]],
  ["canCancel", canCancel, ["queued", "running", "paused"]],
  ["canResume", canResume, ["paused", "cancelled"]],
] as const)("%s (PBI-12 AC7, AC8)", (_name, rule, allowed) => {
  it.each(allowed)("offers it to Admin on a %s session", (status) => {
    expect(rule(session(status), "admin")).toBe(true);
  });

  // Negative: every other status gets 409 INVALID_TRANSITION / SESSION_NOT_RESUMABLE.
  it.each(ALL.filter((status) => !(allowed as readonly SessionStatus[]).includes(status)))(
    "never offers it on a %s session",
    (status) => {
      expect(rule(session(status), "admin")).toBe(false);
    },
  );

  // Negative: server#102 keeps controls for Admin unless the Developer AI flag is on, and the
  // client cannot see that flag, so it follows the default.
  it.each<Role | null>(["developer_ai", "contributor", "viewer", null])("never offers it to %s", (role) => {
    expect(rule(session(allowed[0]), role)).toBe(false);
  });

  // Negative: 409 SESSION_ARCHIVED.
  it("never offers it on an archived session", () => {
    expect(rule(session(allowed[0], { archived_at: ARCHIVED_AT }), "admin")).toBe(false);
  });
});

describe("canResume after the model version changed (AC8)", () => {
  // The server stops the session and answers 409 MODEL_VERSION_CHANGED to every later resume.
  it("does not offer it once the version changed", () => {
    expect(canResume(session("paused", { resume_error_code: "MODEL_VERSION_CHANGED" }), "admin")).toBe(false);
  });

  // Cancel stays: the session can still be closed for good.
  it("still offers Batalkan on that session", () => {
    expect(canCancel(session("paused", { resume_error_code: "MODEL_VERSION_CHANGED" }), "admin")).toBe(true);
  });
});

describe("controlErrorMessage", () => {
  it.each([
    ["INVALID_TRANSITION", "Status sesi sudah berubah. Muat ulang halaman."],
    ["SESSION_NOT_RESUMABLE", "Sesi ini tidak sedang dijeda atau dibatalkan. Muat ulang halaman."],
    ["SESSION_ARCHIVED", "Sesi yang sudah diarsipkan tidak bisa dikontrol."],
    ["SESSION_ACCEPTED", "Sesi ini sudah diterima apa adanya. Hapus tandanya dulu."],
    ["SESSION_NOT_AUTOMATIC", "Hanya sesi otomatis yang bisa dijeda, dibatalkan, atau dilanjutkan."],
    ["MODEL_VERSION_CHANGED", "Versi model produk sudah berbeda dari saat sesi dimulai. Buat sesi baru untuk mengukur lagi."],
    ["ANOTHER_SESSION_RUNNING", "Masih ada sesi otomatis lain yang berjalan. Lanjutkan setelah sesi itu selesai."],
    ["ATTEMPT_RECOVERY_REQUIRED", "Ada percobaan yang hasilnya belum pasti. Coba lagi setelah pemulihan selesai."],
    ["MEASUREMENT_NOT_FOUND", "Sesi tidak ditemukan. Muat ulang halaman."],
    ["NOT_YOUR_SESSION", "Anda hanya bisa mengontrol sesi yang Anda buat."],
    ["FORBIDDEN", "Peran Anda tidak bisa mengontrol sesi ini. Muat ulang halaman."],
    ["ADMIN_CONFIRMATION_REQUIRED", "Melanjutkan tanpa versi model terverifikasi perlu konfirmasi Admin."],
    ["SESSION_NOT_RETRYABLE", "Hanya sesi yang selesai dengan kegagalan yang bisa dicoba ulang."],
    ["ATTEMPT_NOT_RETRYABLE", "Sebagian percobaan yang dipilih sudah tidak gagal. Muat ulang halaman."],
    ["NO_FAILED_ATTEMPTS", "Tidak ada percobaan yang gagal untuk dicoba ulang. Muat ulang halaman."],
  ])("explains %s", (code, message) => {
    expect(controlErrorMessage(new ApiError(409, code))).toBe(message);
  });

  it.each([new TypeError("Failed to fetch"), new ApiError(500, "INTERNAL_ERROR")])("asks to try again after %s", (error) => {
    expect(controlErrorMessage(error)).toBe("Permintaan gagal. Coba lagi.");
  });
});

type RetryCase = { attempts: { status: AttemptStatus }[] };

function retryable(overrides: { status?: SessionStatus; archived_at?: string | null; accepted_as_is_at?: string | null; created_by?: string; cases?: RetryCase[] } = {}) {
  return {
    status: "finished_with_failures" as SessionStatus,
    archived_at: null,
    accepted_as_is_at: null,
    created_by: "dev-1",
    cases: [
      { attempts: [{ status: "succeeded" as AttemptStatus }, { status: "technical_failure" as AttemptStatus }] },
      { attempts: [{ status: "technical_failure" as AttemptStatus }, { status: "technical_failure" as AttemptStatus }] },
    ],
    ...overrides,
  };
}

const ADMIN = { id: "admin-1", role: "admin" as const };
const OWNER = { id: "dev-1", role: "developer_ai" as const };

describe("failedAttemptCount (PBI-12 AC3)", () => {
  it("counts every technical failure across cases", () => {
    expect(failedAttemptCount(retryable().cases)).toBe(3);
  });

  it("is zero when nothing failed", () => {
    expect(failedAttemptCount([{ attempts: [{ status: "succeeded" }] }])).toBe(0);
  });
});

describe("canRetry (PBI-12 AC3, server#99)", () => {
  it("offers it to Admin on a session that finished with failures", () => {
    expect(canRetry(retryable(), ADMIN)).toBe(true);
  });

  // server#99: Developer AI may retry its own sessions (same rule as archive in #91).
  it("offers it to Developer AI on its own session", () => {
    expect(canRetry(retryable(), OWNER)).toBe(true);
  });

  // Negative: 403 NOT_YOUR_SESSION.
  it("does not offer it to Developer AI on someone else's session", () => {
    expect(canRetry(retryable({ created_by: "someone-else" }), OWNER)).toBe(false);
  });

  it.each<Role | null>(["contributor", "viewer"])("never offers it to %s", (role) => {
    expect(canRetry(retryable(), role === null ? null : { id: "dev-1", role })).toBe(false);
  });

  it("offers nothing while the user is unknown", () => {
    expect(canRetry(retryable(), null)).toBe(false);
  });

  // Negative: 409 SESSION_NOT_RETRYABLE for every other status.
  it.each(ALL.filter((status) => status !== "finished_with_failures"))("never offers it on a %s session", (status) => {
    expect(canRetry(retryable({ status }), ADMIN)).toBe(false);
  });

  // Negative: 409 SESSION_ACCEPTED, 409 SESSION_ARCHIVED, 422 NO_FAILED_ATTEMPTS.
  it("does not offer it once the session is accepted as-is", () => {
    expect(canRetry(retryable({ accepted_as_is_at: ARCHIVED_AT }), ADMIN)).toBe(false);
  });

  it("does not offer it on an archived session", () => {
    expect(canRetry(retryable({ archived_at: ARCHIVED_AT }), ADMIN)).toBe(false);
  });

  // Edge: a session can finish with failures in the list yet have nothing left to retry here.
  it("does not offer it when no attempt failed", () => {
    expect(canRetry(retryable({ cases: [{ attempts: [{ status: "succeeded" }] }] }), ADMIN)).toBe(false);
  });
});

type CaseRow = {
  snapshot_item_id: string;
  case_code: string;
  title: string;
  masked: boolean;
  attempts: { id: string; status: AttemptStatus }[];
};

function caseRow(key: string, statuses: AttemptStatus[], overrides: Partial<CaseRow> = {}): CaseRow {
  return {
    snapshot_item_id: key,
    case_code: `QA-${key}`,
    title: `Kasus sintetis ${key}`,
    masked: false,
    attempts: statuses.map((status, index) => ({ id: `${key}-a${index + 1}`, status })),
    ...overrides,
  };
}

describe("failedCases (PBI-12 AC3: one checkbox per case)", () => {
  it("lists only cases with a failed attempt, with the ids of their failed attempts", () => {
    const rows = [
      caseRow("1", ["succeeded", "technical_failure"]),
      caseRow("2", ["succeeded", "succeeded"]),
      caseRow("3", ["technical_failure", "technical_failure"]),
    ];

    expect(failedCases(rows)).toEqual([
      { key: "1", label: "QA-1 · Kasus sintetis 1", attemptIds: ["1-a2"] },
      { key: "3", label: "QA-3 · Kasus sintetis 3", attemptIds: ["3-a1", "3-a2"] },
    ]);
  });

  // Developer AI sees a test case masked (server#91); the label keeps the masked title only.
  it("labels a masked case by its masked title", () => {
    const rows = [caseRow("9", ["technical_failure"], { masked: true, case_code: "TERSEMBUNYI", title: "Kasus test disembunyikan" })];

    expect(failedCases(rows)[0].label).toBe("Kasus test disembunyikan");
  });
});

describe("retrySelection (PBI-12 AC3: per case or all)", () => {
  const failed = [
    { key: "1", label: "QA-1", attemptIds: ["1-a2"] },
    { key: "3", label: "QA-3", attemptIds: ["3-a1", "3-a2"] },
  ];

  it("sends the failed attempts of the ticked cases", () => {
    expect(retrySelection(new Set(["3"]), failed)).toEqual({ attemptIds: ["3-a1", "3-a2"] });
  });

  // Every failed case ticked means "semua yang gagal", which the server handles as all_failed.
  it("asks for all failed attempts when every failed case is ticked", () => {
    expect(retrySelection(new Set(["1", "3"]), failed)).toEqual({ allFailed: true });
  });

  // Edge: nothing ticked, nothing to send; the button stays off.
  it("returns nothing when no case is ticked", () => {
    expect(retrySelection(new Set(), failed)).toBeNull();
  });
});
