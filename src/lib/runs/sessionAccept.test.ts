import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";
import { acceptErrorMessage, canAcceptAsIs, canClearAcceptAsIs, isReasonWritten } from "./sessionAccept";

const ACCEPTED_AT = "2026-11-05T03:00:00Z";

function session(status: SessionStatus = "finished_with_failures", accepted_as_is_at: string | null = null) {
  return { status, accepted_as_is_at };
}

describe("canAcceptAsIs (PBI-12 AC9, server#97: Admin only, finished_with_failures only)", () => {
  it("offers it to Admin on a session that finished with failures", () => {
    expect(canAcceptAsIs(session(), "admin")).toBe(true);
  });

  // Negative: every other status gets 409 SESSION_NOT_ACCEPTABLE on the server.
  it.each<SessionStatus>(["queued", "running", "paused", "cancelled", "finished", "failed"])(
    "never offers it on a %s session, even to Admin",
    (status) => {
      expect(canAcceptAsIs(session(status), "admin")).toBe(false);
    },
  );

  // Negative: the server answers 409 ALREADY_ACCEPTED; the page shows the mark instead.
  it("does not offer it again once the session is accepted", () => {
    expect(canAcceptAsIs(session("finished_with_failures", ACCEPTED_AT), "admin")).toBe(false);
  });

  // Negative: the server answers 403 to every other role.
  it.each<Role>(["developer_ai", "contributor", "viewer"])("never offers it to %s", (role) => {
    expect(canAcceptAsIs(session(), role)).toBe(false);
  });

  it("offers nothing while the role is unknown", () => {
    expect(canAcceptAsIs(session(), null)).toBe(false);
  });
});

describe("canClearAcceptAsIs (AC9: Admin removes the mark so the session can be retried)", () => {
  it("offers it to Admin on an accepted session", () => {
    expect(canClearAcceptAsIs(session("finished_with_failures", ACCEPTED_AT), "admin")).toBe(true);
  });

  // Negative: nothing to clear; the server answers 409 NOT_ACCEPTED.
  it("offers nothing while the session is not accepted", () => {
    expect(canClearAcceptAsIs(session(), "admin")).toBe(false);
  });

  it.each<Role | null>(["developer_ai", "contributor", "viewer", null])("never offers it to %s", (role) => {
    expect(canClearAcceptAsIs(session("finished_with_failures", ACCEPTED_AT), role)).toBe(false);
  });
});

describe("isReasonWritten (AC9: a written reason is required)", () => {
  it("accepts a reason with words in it", () => {
    expect(isReasonWritten("Kegagalan dari batas kuota penyedia")).toBe(true);
  });

  // Boundary: the shortest reason that counts.
  it("accepts a single visible character", () => {
    expect(isReasonWritten("x")).toBe(true);
  });

  // Negative / boundary: nothing a reader could see. server#97 part 2 rejects the same characters.
  it.each([
    ["empty", ""],
    ["spaces", "   "],
    ["tab and newline", "\t\n"],
    ["non-breaking space", " "],
    ["zero-width space", "​"],
    ["zero-width joiner and BOM", "‍﻿"],
  ])("refuses a reason that is only %s", (_name, reason) => {
    expect(isReasonWritten(reason)).toBe(false);
  });
});

describe("acceptErrorMessage", () => {
  it.each([
    [new ApiError(422, "REASON_REQUIRED"), "Tulis alasan menerima sesi ini."],
    [new ApiError(409, "ALREADY_ACCEPTED"), "Sesi ini sudah diterima apa adanya. Muat ulang halaman."],
    [new ApiError(409, "SESSION_NOT_ACCEPTABLE"), "Hanya sesi yang selesai dengan kegagalan yang bisa diterima apa adanya."],
    [new ApiError(409, "NOT_ACCEPTED"), "Sesi ini belum diterima apa adanya. Muat ulang halaman."],
    [new ApiError(404, "MEASUREMENT_NOT_FOUND"), "Sesi tidak ditemukan. Muat ulang halaman."],
    // Shared by accept and clear, so it names the mark, not one of the two actions.
    [new ApiError(403, "FORBIDDEN"), "Hanya Admin yang bisa mengubah tanda terima apa adanya. Muat ulang halaman."],
  ])("explains %s", (error, message) => {
    expect(acceptErrorMessage(error)).toBe(message);
  });

  // Network failure or server error: nothing the user did wrong, so trying again is the advice.
  it.each([new TypeError("Failed to fetch"), new ApiError(500, "INTERNAL_ERROR")])("asks to try again after %s", (error) => {
    expect(acceptErrorMessage(error)).toBe("Permintaan gagal. Coba lagi.");
  });
});
