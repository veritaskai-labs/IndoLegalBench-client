import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { formatRupiah, formatRupiahInput, parseRupiahInput } from "./format";
import {
  createProduct,
  listProducts,
  setProductActive,
  testConnection,
  updateProduct,
} from "./providerApi";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

beforeEach(() => fetchMock.mockReset().mockResolvedValue({}));

describe("providerApi", () => {
  it("lists by active status", async () => {
    await listProducts(false);
    expect(fetchMock).toHaveBeenCalledWith("/admin/providers?is_active=false");
  });

  it("creates with POST and edits with PATCH on the encoded id", async () => {
    await createProduct({
      name: "X",
      provider_type: "openai_compatible",
      base_url: "https://x.test",
      model_name: "m",
      credential: "abcd",
      rate_limit_per_minute: 1,
      monthly_budget_idr: "1",
    });
    await updateProduct("a/b", { name: "Y" });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/admin/providers/a%2Fb");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH", body: '{"name":"Y"}' });
  });

  it("activates, deactivates and tests with POST", async () => {
    await setProductActive("p1", true);
    await setProductActive("p1", false);
    await testConnection("p1");

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "/admin/providers/p1/activate",
      "/admin/providers/p1/deactivate",
      "/admin/providers/p1/test-connection",
    ]);
  });
});

describe("Rupiah formatting", () => {
  it("formats the server's decimal string without cents", () => {
    expect(formatRupiah("1500000.00")).toMatch(/^Rp\s?1\.500\.000$/);
  });

  it("reads typed amounts with dots, spaces or Rp, and empty as null", () => {
    expect(parseRupiahInput("Rp 1.500.000")).toBe(1500000);
    expect(parseRupiahInput("")).toBeNull();
    expect(formatRupiahInput("2500000")).toBe("2.500.000");
  });
});
