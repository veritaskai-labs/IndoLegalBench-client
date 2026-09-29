import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCasesForSuite, type CaseSummary } from "./cases";
import { ApiError, apiFetch } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe("cases API client (getCasesForSuite)", () => {
  const suiteId = "suite-123";
  const mockCases: CaseSummary[] = [
    {
      id: "9c1b3f94-91eb-4c8d-8a07-887e5b2e9871",
      case_code: "PHK-001",
      title: "Kompensasi PHK efisiensi perusahaan",
      split_tag: "dev",
      status: "in_review",
      completeness_pct: 85,
      updated_at: "2026-09-28T10:00:00Z",
    },
    {
      id: "2d1b3f94-91eb-4c8d-8a07-887e5b2e9872",
      case_code: "PKWT-002",
      title: "Masa berlaku PKWT kompensasi",
      split_tag: "test",
      status: "approved",
      completeness_pct: 100,
      updated_at: "2026-09-27T10:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("memanggil endpoint dasar tanpa parameter query ketika filter tidak diberikan", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mockCases);

    const result = await getCasesForSuite(suiteId);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(`/suites/${suiteId}/cases`);
    expect(result).toEqual(mockCases);
  });

  it("memanggil endpoint dasar jika object filter diberikan dengan nilai undefined", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mockCases);

    const result = await getCasesForSuite(suiteId, {
      status: undefined,
      split_tag: undefined,
    });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(`/suites/${suiteId}/cases`);
    expect(result).toEqual(mockCases);
  });

  it("menambahkan query param status saat filter status diberikan", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([mockCases[0]]);

    const result = await getCasesForSuite(suiteId, { status: "in_review" });

    expect(apiFetch).toHaveBeenCalledWith(`/suites/${suiteId}/cases?status=in_review`);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("in_review");
  });

  it("menambahkan query param split_tag saat filter split_tag diberikan", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([mockCases[1]]);

    const result = await getCasesForSuite(suiteId, { split_tag: "test" });

    expect(apiFetch).toHaveBeenCalledWith(`/suites/${suiteId}/cases?split_tag=test`);
    expect(result).toHaveLength(1);
    expect(result[0].split_tag).toBe("test");
  });

  it("menyusun kedua query params saat status dan split_tag diberikan bersamaan", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([mockCases[0]]);

    await getCasesForSuite(suiteId, {
      status: "in_review",
      split_tag: "dev",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/suites\/suite-123\/cases\?(status=in_review&split_tag=dev|split_tag=dev&status=in_review)/)
    );
  });

  it("meneruskan ApiError ketika apiFetch mengalami kegagalan", async () => {
    const errorMock = new ApiError(404, "Suite not found");
    vi.mocked(apiFetch).mockRejectedValueOnce(errorMock);

    await expect(getCasesForSuite(suiteId)).rejects.toMatchObject({
      status: 404,
      message: "Suite not found",
    });
  });
});