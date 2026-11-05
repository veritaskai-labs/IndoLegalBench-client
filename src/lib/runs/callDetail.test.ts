import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import {
  callErrorText,
  callResultText,
  durationText,
  mapCallDetailError,
  maskedNotice,
  rawResponseText,
  tryLabel,
} from "@/lib/runs/callDetail";
import type { CallAttemptLog } from "@/types/measurement";

function call(
  overrides: Partial<CallAttemptLog> = {}
): CallAttemptLog {
  return {
    try_no: 1,
    is_manual_retry: false,
    started_at: "2026-11-05T03:00:00Z",
    ended_at: "2026-11-05T03:00:02Z",
    duration_ms: 1840,
    result: "ok",
    failure_kind: null,
    model_version: "gemini-2.0-flash",
    error_summary: null,
    raw_response: { text: "jawaban" },
    ...overrides,
  };
}

describe("tryLabel", () => {
  it("labels the first call", () => {
    expect(tryLabel(call())).toBe("Upaya ke-1");
  });

  it("labels a manual retry", () => {
    expect(
      tryLabel(call({ try_no: 2, is_manual_retry: true }))
    ).toBe("Upaya ke-2 (coba ulang)");
  });
});

describe("durationText", () => {
  it("shows milliseconds below one second", () => {
    expect(durationText(840)).toBe("840 ms");
  });

  it("shows seconds for longer calls", () => {
    expect(durationText(1840)).toBe("1,8 detik");
  });

  it("handles invalid durations", () => {
    expect(durationText(Number.NaN)).toBe("–");
  });
});

describe("callResultText", () => {
  it("shows success", () => {
    expect(callResultText(call())).toBe("Berhasil");
  });

  it("shows the failure kind", () => {
    expect(
      callResultText(
        call({ result: "error", failure_kind: "timeout" })
      )
    ).toBe("timeout");
  });

  it("falls back to result", () => {
    expect(
      callResultText(
        call({ result: "rate_limited", failure_kind: null })
      )
    ).toBe("rate_limited");
  });
});

describe("callErrorText", () => {
  it("shows the provider error summary", () => {
    expect(
      callErrorText(
        call({ error_summary: "HTTP 429 dari penyedia" })
      )
    ).toBe("HTTP 429 dari penyedia");
  });

  it("ignores blank summaries", () => {
    expect(
      callErrorText(call({ error_summary: "   " }))
    ).toBeNull();
  });
});

describe("rawResponseText", () => {
  it("formats provider JSON as readable text", () => {
    expect(
      rawResponseText({ error: { code: 429 } })
    ).toBe(
      '{\n  "error": {\n    "code": 429\n  }\n}'
    );
  });

  it("handles missing raw response", () => {
    expect(rawResponseText(null)).toBeNull();
  });
});

describe("maskedNotice", () => {
  it("explains masking", () => {
    expect(maskedNotice(true)).toMatch(/disembunyikan/);
    expect(maskedNotice(false)).toBeNull();
  });
});

describe("mapCallDetailError", () => {
  it("handles attempt not found", () => {
    expect(
      mapCallDetailError(
        new ApiError(404, "ATTEMPT_NOT_FOUND")
      )
    ).toBe("Percobaan ini tidak ada di sesi tersebut.");
  });

  it("handles missing sessions", () => {
    expect(
      mapCallDetailError(
        new ApiError(404, "MEASUREMENT_NOT_FOUND")
      )
    ).toBe("Sesi tidak ditemukan.");
  });

  it("handles unexpected errors safely", () => {
    expect(
      mapCallDetailError(new TypeError("Failed to fetch"))
    ).toBe("Gagal memuat detail teknis. Coba lagi.");
  });
});