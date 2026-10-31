import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import type { ProductPurpose } from "@/types/provider";
import { canUsePurpose, PURPOSE_TYPE } from "./purpose";

describe("canUsePurpose (PBI-23 AC8, D10)", () => {
  it.each<[Role, ProductPurpose, boolean]>([
    ["admin", "automatic_run", true],
    ["admin", "manual_entry", true],
    ["contributor", "manual_entry", true],
    ["contributor", "automatic_run", false],
    ["developer_ai", "automatic_run", true],
    ["developer_ai", "manual_entry", false],
    ["viewer", "automatic_run", false],
    ["viewer", "manual_entry", false],
  ])("%s untuk %s: %s", (role, purpose, allowed) => {
    expect(canUsePurpose(role, purpose)).toBe(allowed);
  });

  it.each<ProductPurpose>(["automatic_run", "manual_entry"])(
    "tanpa sesi tidak boleh meminta %s",
    (purpose) => {
      expect(canUsePurpose(null, purpose)).toBe(false);
    },
  );
});

describe("PURPOSE_TYPE (PBI-23 AC7)", () => {
  it("memasangkan setiap tujuan dengan satu jenis produk", () => {
    expect(PURPOSE_TYPE).toEqual({ automatic_run: "automatic", manual_entry: "manual" });
  });
});
