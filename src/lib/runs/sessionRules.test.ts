import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { SessionListItem, SessionStatus } from "@/types/measurement";
import {
  archiveErrorMessage,
  canArchive,
  caseCountText,
  formatProgress,
  SESSION_STATUS_LABEL,
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
    progress: { completed: 60, total: 60 },
    ...overrides,
  };
}

describe("SESSION_STATUS_LABEL (PBI-11 AC10, D2 status enum)", () => {
  it.each<[SessionStatus, string]>([
    ["queued", "Menunggu"],
    ["running", "Berjalan"],
    ["finished", "Selesai"],
    ["finished_with_failures", "Selesai dengan kegagalan"],
    ["failed", "Gagal"],
  ])("names %s as %s", (status, label) => {
    expect(SESSION_STATUS_LABEL[status]).toBe(label);
  });
});

describe("formatProgress", () => {
  it("shows finished attempts out of all attempts", () => {
    expect(formatProgress(session({ status: "running", progress: { completed: 12, total: 60 } }))).toBe("12 dari 60");
  });

  it("shows a finished session as complete", () => {
    expect(formatProgress(session())).toBe("60 dari 60");
  });

  // The snapshot is made when the session starts, so a queued session has no attempts yet.
  it("says a queued session is waiting instead of 0 dari 0", () => {
    expect(formatProgress(session({ status: "queued", progress: { completed: 0, total: 0 } }))).toBe("Menunggu antrean");
  });

  // server#91 07648e5: a queued session can fail before it starts, still with no attempts.
  it("keeps 0 dari 0 for a session that ended without attempts", () => {
    expect(formatProgress(session({ status: "failed", progress: { completed: 0, total: 0 } }))).toBe("0 dari 0");
  });
});

describe("canArchive (AC10, D10: Developer AI only own sessions)", () => {
  it.each<SessionStatus>(["finished", "finished_with_failures", "failed"])(
    "lets Admin archive a %s session of someone else",
    (status) => {
      expect(canArchive(session({ status, created_by: "someone-else" }), ADMIN)).toBe(true);
    },
  );

  it.each<SessionStatus>(["queued", "running"])("never offers it for a %s session, even to Admin", (status) => {
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
