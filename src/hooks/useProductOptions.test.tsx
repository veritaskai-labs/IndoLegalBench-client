import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@/types";
import type { AiProductOption, ProductPurpose } from "@/types/provider";
import { useProductOptions, type ProductOptionsApi } from "./useProductOptions";

const JUSTISIO: AiProductOption = { id: "m1", name: "Justisio", measurement_type: "manual" };
const LEGALHERO: AiProductOption = { id: "m2", name: "LegalHero", measurement_type: "manual" };
const DEEPSEEK: AiProductOption = { id: "a1", name: "DeepSeek", measurement_type: "automatic" };

let api: { listProductOptions: ReturnType<typeof vi.fn> };

function setup(purpose: ProductPurpose, role: Role | null) {
  return renderHook(() => useProductOptions(purpose, role, api as unknown as ProductOptionsApi));
}

beforeEach(() => {
  api = { listProductOptions: vi.fn() };
});

describe("useProductOptions, role guard", () => {
  it.each<[Role | null, ProductPurpose]>([
    ["contributor", "automatic_run"],
    ["developer_ai", "manual_entry"],
    ["viewer", "manual_entry"],
    [null, "automatic_run"],
  ])("%s for %s never calls the server", (role, purpose) => {
    const { result } = setup(purpose, role);

    expect(result.current.status).toBe("not_allowed");
    expect(api.listProductOptions).not.toHaveBeenCalled();
  });
});

describe("useProductOptions, loading the options", () => {
  it("waits, then lists the options of the asked purpose", async () => {
    api.listProductOptions.mockResolvedValue([JUSTISIO, LEGALHERO]);
    const { result } = setup("manual_entry", "contributor");

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ options: [JUSTISIO, LEGALHERO] });
    expect(api.listProductOptions).toHaveBeenCalledExactlyOnceWith("manual_entry");
  });

  it("drops a product of the wrong type even if the server sends it (AC7)", async () => {
    api.listProductOptions.mockResolvedValue([DEEPSEEK, JUSTISIO]);
    const { result } = setup("manual_entry", "admin");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ options: [JUSTISIO] });
  });

  it("is ready with no options when nothing of that type is active", async () => {
    api.listProductOptions.mockResolvedValue([]);
    const { result } = setup("automatic_run", "developer_ai");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ options: [] });
  });

  it("reports a failure and loads again on reload", async () => {
    api.listProductOptions.mockRejectedValueOnce(new Error("network")).mockResolvedValue([DEEPSEEK]);
    const { result } = setup("automatic_run", "admin");

    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ options: [DEEPSEEK] });
    expect(api.listProductOptions).toHaveBeenCalledTimes(2);
  });
});
