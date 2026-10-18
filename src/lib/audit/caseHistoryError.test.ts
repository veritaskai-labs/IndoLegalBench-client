import { describe, expect, it } from "vitest";
import { describeCaseHistoryError } from "./caseHistoryError";

const NOT_ASSIGNED = "Anda tidak ditugaskan untuk mereview kasus ini.";
const LOAD_FAILED = "Gagal memuat riwayat kasus.";

describe("describeCaseHistoryError", () => {
  describe("403, kasus tidak ditugaskan kepada reviewer", () => {
    it("says the case is not assigned and offers no retry", () => {
      expect(describeCaseHistoryError(403)).toEqual({
        message: NOT_ASSIGNED,
        canRetry: false,
      });
    });
  });

  describe("status lain dari server", () => {
    it.each([400, 402, 404, 500, 503])("offers a retry for %i", (status) => {
      expect(describeCaseHistoryError(status)).toEqual({
        message: LOAD_FAILED,
        canRetry: true,
      });
    });
  });

  describe("tanpa status, permintaan tidak sampai ke server", () => {
    it("offers a retry", () => {
      expect(describeCaseHistoryError(undefined)).toEqual({
        message: LOAD_FAILED,
        canRetry: true,
      });
    });
  });
});
