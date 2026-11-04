import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import {
  extractBudgetExceeded,
  getMeasurementSummary,
  startMeasurement,
} from "./measurementApi";
import type {
  StartMeasurementRequest,
  StartMeasurementResponse,
  SummaryRequest,
  SummaryResponse,
} from "@/types/measurement";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("measurementApi", () => {
  describe("getMeasurementSummary", () => {
    it("calls POST /measurements/summary with correct body", async () => {
      const payload: SummaryRequest = {
        suite_ids: ["suite-1", "suite-2"],
        case_filter: "both",
        repeat_count: 3,
        product_id: "prod-1",
      };

      const mockResponse: SummaryResponse = {
        case_count: 10,
        total_calls: 30,
        case_filter: "both",
        repeat_count: 3,
        estimated_cost_idr: "150000.00",
        remaining_budget_idr: "500000.00",
      };

      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const res = await getMeasurementSummary(payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/measurements/summary");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual(payload);
      expect(res).toEqual(mockResponse);
    });
  });

  describe("startMeasurement", () => {
    it("calls POST /measurements with StartRequest payload", async () => {
      const payload: StartMeasurementRequest = {
        suite_ids: ["suite-1"],
        case_filter: "dev",
        repeat_count: 1,
        product_id: "prod-1",
        label: "Uji Evaluasi Sesi 1",
        purpose: "trial",
      };

      const mockResponse: StartMeasurementResponse = {
        session_id: "sess-123",
        status: "queued",
        queued_at: "2026-11-03T02:00:00Z",
      };

      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const res = await startMeasurement(payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/measurements");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual(payload);
      expect(res).toEqual(mockResponse);
    });
  });

  describe("extractBudgetExceeded", () => {
    it("returns null for non-ApiError or non-BUDGET_EXCEEDED error", () => {
      expect(extractBudgetExceeded(new Error("Generic"))).toBeNull();
      expect(
        extractBudgetExceeded(
          new ApiError(404, "NOT_FOUND", "Resource not found"),
        ),
      ).toBeNull();
    });

    it("extracts details when code is BUDGET_EXCEEDED", () => {
      const error = new ApiError(
        422,
        "BUDGET_EXCEEDED",
        "Perkiraan biaya melebihi sisa anggaran",
        null,
        [],
        null,
        {
          product_name: "DeepSeek Chat",
          remaining_budget_idr: "25000.00",
          estimated_cost_idr: "75000.00",
        },
      );

      const result = extractBudgetExceeded(error);
      expect(result).toEqual({
        productName: "DeepSeek Chat",
        remainingBudgetIdr: "25000.00",
        estimatedCostIdr: "75000.00",
        message: "Perkiraan biaya melebihi sisa anggaran",
      });
    });

    it("falls back to default message if serverMessage is null", () => {
      const error = new ApiError(
        422,
        "BUDGET_EXCEEDED",
        null,
        null,
        [],
        null,
        null,
      );

      const result = extractBudgetExceeded(error);
      expect(result?.productName).toBeNull();
      expect(result?.message).toContain("Perkiraan biaya melebihi sisa anggaran");
    });
  });
});
