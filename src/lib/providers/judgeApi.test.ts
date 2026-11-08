import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { JudgeProviderOption } from "@/types/provider";
import { listJudgeOptions } from "./judgeApi";

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiFetch: vi.fn() };
});
const fetchMock = vi.mocked(apiFetch);

const DEEPSEEK: JudgeProviderOption = {
  id: "8b47374e-0000-4000-8000-000000000001",
  name: "DeepSeek V4-Flash",
  provider_type: "openai_compatible",
  model_name: "deepseek-v4-flash",
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("judgeApi", () => {
  it("asks GET /judge-providers and returns the options as sent", async () => {
    // Arrange
    fetchMock.mockResolvedValue([DEEPSEEK]);

    // Act
    const options = await listJudgeOptions();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith("/judge-providers");
    expect(options).toEqual([DEEPSEEK]);
  });

  it("lets a server error through so the caller can show it", async () => {
    // Arrange
    fetchMock.mockImplementation(() =>
      Promise.reject(
        new ApiError(403, "FORBIDDEN", "Peran Anda tidak berwenang"),
      ),
    );

    // Act + Assert
    await expect(listJudgeOptions()).rejects.toHaveProperty("status", 403);
  });
});
