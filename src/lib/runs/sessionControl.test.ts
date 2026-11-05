import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";
import { canCancel, canPause, canResume, controlErrorMessage } from "./sessionControl";

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
  ])("explains %s", (code, message) => {
    expect(controlErrorMessage(new ApiError(409, code))).toBe(message);
  });

  it.each([new TypeError("Failed to fetch"), new ApiError(500, "INTERNAL_ERROR")])("asks to try again after %s", (error) => {
    expect(controlErrorMessage(error)).toBe("Permintaan gagal. Coba lagi.");
  });
});
