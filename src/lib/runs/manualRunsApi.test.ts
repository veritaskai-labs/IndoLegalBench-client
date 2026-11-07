import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/apiClient";
import * as apiClient from "@/lib/apiClient";
import * as runsApi from "@/lib/runs/runsApi";
import {
  createManualSession,
  getManualSession,
  finalizeManualSession,
  listManualSessions,
  manualErrorMessage,
} from "./manualRunsApi";
import type {
  ManualStartRequest,
  ManualStartResponse,
  ManualSessionDetail,
  ManualFinalizeResponse,
  SessionListItem,
} from "@/types/measurement";

describe("manualRunsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createManualSession", () => {
    it("sends POST to /manual-measurements with the payload", async () => {
      const payload: ManualStartRequest = {
        label: "Sesi LegalHero",
        purpose: "official",
        suite_ids: ["s-1"],
        case_filter: "both",
        product_id: "p-manual-1",
        repeat_count: 1,
        judge_provider_id: null,
      };

      const expectedResponse: ManualStartResponse = {
        session_id: "session-123",
        status: "not_filled",
        case_count: 10,
        repetitions: 1,
        total_answers: 10,
      };

      const fetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValue(expectedResponse);

      const result = await createManualSession(payload);

      expect(fetchSpy).toHaveBeenCalledWith("/manual-measurements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("getManualSession", () => {
    it("calls GET /manual-measurements/{id} with unfilled=false by default", async () => {
      const detail: ManualSessionDetail = {
        id: "session-1",
        label: "Manual Run 1",
        purpose: "trial",
        status: "not_filled",
        product_name: "LegalHero",
        vendor_name: "LegalHero Inc",
        site_url: "https://legalhero.id",
        manual_params: "Premium",
        case_filter: "both",
        repetitions: 1,
        filled_answers: 0,
        total_answers: 5,
        answer_date_from: null,
        answer_date_to: null,
        date_range_warning: false,
        created_by: "u-1",
        created_at: "2026-11-07T10:00:00Z",
        finalized_at: null,
        finalized_by: null,
        cases: [],
      };

      const fetchSpy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(detail);

      const result = await getManualSession("session-1");

      expect(fetchSpy).toHaveBeenCalledWith("/manual-measurements/session-1");
      expect(result).toEqual(detail);
    });

    it("includes ?unfilled=true when requested", async () => {
      const fetchSpy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue({} as ManualSessionDetail);

      await getManualSession("session-1", true);

      expect(fetchSpy).toHaveBeenCalledWith("/manual-measurements/session-1?unfilled=true");
    });
  });

  describe("finalizeManualSession", () => {
    it("sends POST to /manual-measurements/{id}/finalize", async () => {
      const expected: ManualFinalizeResponse = {
        id: "session-1",
        status: "finalized",
        finalized_at: "2026-11-07T12:00:00Z",
        finalized_by: "u-admin",
      };

      const fetchSpy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(expected);

      const result = await finalizeManualSession("session-1");

      expect(fetchSpy).toHaveBeenCalledWith("/manual-measurements/session-1/finalize", {
        method: "POST",
      });
      expect(result).toEqual(expected);
    });
  });

  describe("listManualSessions", () => {
    it("filters manual sessions from GET /manual-measurements when available", async () => {
      const sessions: Partial<SessionListItem>[] = [
        { id: "1", status: "not_filled", repetitions: 1 },
        { id: "2", status: "partially_filled", repetitions: 1 },
      ];

      vi.spyOn(apiClient, "apiFetch").mockResolvedValue(sessions);

      const result = await listManualSessions();
      expect(result).toHaveLength(2);
    });

    it("falls back to listSessions when /manual-measurements errors, keeping only manual items", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValue(new Error("404 Not Found"));
      const allSessions: Partial<SessionListItem>[] = [
        { id: "1", status: "queued", repetitions: 3 },
        { id: "2", status: "running", repetitions: 3 },
        { id: "3", status: "not_filled", repetitions: 1 },
        { id: "4", status: "complete", repetitions: 1 },
      ];
      vi.spyOn(runsApi, "listSessions").mockResolvedValue(allSessions as SessionListItem[]);

      const result = await listManualSessions();
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(["3", "4"]);
    });
  });

  describe("manualErrorMessage", () => {
    it("returns serverMessage if present", () => {
      const err = new ApiError(422, "ERR", "Pesan khusus dari server");
      expect(manualErrorMessage(err)).toBe("Pesan khusus dari server");
    });

    it("maps known error codes", () => {
      expect(manualErrorMessage(new ApiError(422, "PRODUCT_NOT_MANUAL"))).toBe(
        "Produk yang dipilih bukan produk AI manual.",
      );
      expect(manualErrorMessage(new ApiError(409, "MANUAL_SESSION_INCOMPLETE"))).toBe(
        "Masih ada jawaban yang belum terisi. Lengkapi semua jawaban terlebih dahulu.",
      );
      expect(manualErrorMessage(new ApiError(409, "MANUAL_SESSION_FINALIZED"))).toBe(
        "Sesi ini sudah ditandai selesai.",
      );
      expect(manualErrorMessage(new ApiError(422, "NO_ELIGIBLE_CASES"))).toBe(
        "Tidak ada kasus yang disetujui dan bertag sesuai pilihan di suite ini.",
      );
    });

    it("returns fallback for unknown errors", () => {
      expect(manualErrorMessage(new Error("Something unknown"))).toBe(
        "Terjadi kesalahan. Coba lagi.",
      );
    });
  });
});
