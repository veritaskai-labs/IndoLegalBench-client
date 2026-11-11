import { describe, expect, it } from "vitest";

import type { AiProduct, AiProductListItem } from "@/types/provider";
import { isMeasurementTypeLocked, mergeSavedProduct } from "./productUsage";

function saved(overrides: Partial<AiProduct> = {}): AiProduct {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "DeepSeek",
    measurement_type: "automatic",
    provider_type: "openai_compatible",
    base_url: "https://api.deepseek.com/chat/completions",
    model_name: "deepseek-v4-flash",
    credential_hint: "a1b2",
    has_credential: true,
    rate_limit_per_minute: 10,
    monthly_budget_idr: "1500000.00",
    is_active: true,
    last_test_at: null,
    last_test_status: null,
    last_test_message: null,
    last_test_error_category: null,
    created_by: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-09-29T01:00:00Z",
    updated_at: "2026-09-29T01:00:00Z",
    ...overrides,
  };
}

function row(overrides: Partial<AiProductListItem> = {}): AiProductListItem {
  return { ...saved(), session_count: 4, remaining_budget_idr: "250000.00", ...overrides };
}

describe("mergeSavedProduct", () => {
  // PATCH and activate answer with AiProductRead, which has no derived columns.
  it("keeps the session count and remaining budget when only other fields changed", () => {
    const merged = mergeSavedProduct(row(), saved({ name: "DeepSeek V4", rate_limit_per_minute: 30 }));

    expect(merged).toMatchObject({
      name: "DeepSeek V4",
      rate_limit_per_minute: 30,
      session_count: 4,
      remaining_budget_idr: "250000.00",
    });
  });

  it("keeps them when the product is deactivated", () => {
    expect(mergeSavedProduct(row(), saved({ is_active: false }))).toMatchObject({
      is_active: false,
      session_count: 4,
      remaining_budget_idr: "250000.00",
    });
  });

  // The remaining budget is the server's number; the client cannot recompute it once the
  // budget moves, because a spent-out product is clamped at 0.
  it("asks for a reload when the monthly budget changed", () => {
    expect(mergeSavedProduct(row(), saved({ monthly_budget_idr: "2000000.00" }))).toBeNull();
  });

  it("treats the same budget written another way as unchanged", () => {
    expect(mergeSavedProduct(row(), saved({ monthly_budget_idr: "1500000" }))).toMatchObject({
      remaining_budget_idr: "250000.00",
    });
  });

  it("asks for a reload when the measurement type switched", () => {
    const manual = saved({ measurement_type: "manual", monthly_budget_idr: null, provider_type: null });

    expect(mergeSavedProduct(row(), manual)).toBeNull();
  });

  it("keeps the count of a manual product that has no budget on either side", () => {
    const before = row({ measurement_type: "manual", monthly_budget_idr: null, remaining_budget_idr: null, session_count: 2 });
    const after = saved({ measurement_type: "manual", monthly_budget_idr: null, name: "Justisio" });

    expect(mergeSavedProduct(before, after)).toMatchObject({
      name: "Justisio",
      session_count: 2,
      remaining_budget_idr: null,
    });
  });

  it("asks for a reload when a budget appears where there was none", () => {
    expect(mergeSavedProduct(row({ monthly_budget_idr: null }), saved())).toBeNull();
  });
});

// UAT TC_23: the type is locked as soon as the product has any measurement session.
describe("isMeasurementTypeLocked", () => {
  it("locks a product that already has sessions", () => {
    expect(isMeasurementTypeLocked(row({ session_count: 16 }))).toBe(true);
  });

  it("leaves a product without sessions open", () => {
    expect(isMeasurementTypeLocked(row({ session_count: 0 }))).toBe(false);
  });

  it("locks from the very first session", () => {
    expect(isMeasurementTypeLocked(row({ session_count: 1 }))).toBe(true);
  });
});
