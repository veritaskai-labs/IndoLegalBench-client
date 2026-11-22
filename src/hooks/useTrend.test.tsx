import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { TrendGateway, TrendQuery } from "@/lib/reports/trend/trendApi";
import { trendRead } from "@/test/trendFixtures";
import type { TrendRead } from "@/types/reports";

import { useTrend } from "./useTrend";

const QUERY: TrendQuery = {
  productId: "11111111-1111-4111-8111-111111111111",
  scope: "test",
  metric: "total",
  range: "all",
};

function gatewayReturning(get: TrendGateway["get"]): TrendGateway {
  return { get, pdf: vi.fn() };
}

describe("useTrend", () => {
  // Positive
  it("starts loading, then hands over the trend the gateway returned", async () => {
    // Arrange
    const read = trendRead();
    const get = vi.fn().mockResolvedValue(read);

    // Act
    const { result } = renderHook(() => useTrend(QUERY, gatewayReturning(get)));

    // Assert
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: read }));
    expect(get).toHaveBeenCalledWith(QUERY);
  });

  // Negative
  it("turns a refused case type into the role message instead of the raw error", async () => {
    // Arrange
    const get = vi.fn().mockRejectedValue(new ApiError(403, "TREND_SCOPE_FORBIDDEN"));

    // Act
    const { result } = renderHook(() => useTrend({ ...QUERY, scope: "dev" }, gatewayReturning(get)));

    // Assert
    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Peran Anda hanya boleh melihat tren skor test.",
      }),
    );
  });

  // Negative
  it("uses the retry message for a failure it cannot explain", async () => {
    // Arrange
    const get = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    // Act
    const { result } = renderHook(() => useTrend(QUERY, gatewayReturning(get)));

    // Assert
    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Tren gagal dimuat. Coba lagi." }),
    );
  });

  // Edge case
  it("asks again and shows loading when a filter changes", async () => {
    // Arrange
    const total = trendRead({ metric: "total" });
    const llm = trendRead({ metric: "llm" });
    const get = vi.fn().mockResolvedValueOnce(total).mockResolvedValueOnce(llm);
    const { result, rerender } = renderHook(({ query }) => useTrend(query, gatewayReturning(get)), {
      initialProps: { query: QUERY },
    });
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: total }));

    // Act
    rerender({ query: { ...QUERY, metric: "llm" } });

    // Assert
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: llm }));
    expect(get).toHaveBeenLastCalledWith({ ...QUERY, metric: "llm" });
  });

  // Edge case
  it("drops a late answer for a filter the reader already left", async () => {
    // Arrange
    const late: { resolve: (read: TrendRead) => void } = { resolve: () => undefined };
    const first = new Promise<TrendRead>((resolve) => {
      late.resolve = resolve;
    });
    const second = trendRead({ range: "3m" });
    const get = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(second);
    const { result, rerender } = renderHook(({ query }) => useTrend(query, gatewayReturning(get)), {
      initialProps: { query: QUERY },
    });

    // Act
    rerender({ query: { ...QUERY, range: "3m" } });
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: second }));
    await act(async () => {
      late.resolve(trendRead({ range: "all" }));
      await first;
    });

    // Assert
    expect(result.current).toMatchObject({ status: "ready", data: second });
  });

  // Edge case
  it("asks again for the same filters when the reader presses retry", async () => {
    // Arrange
    const get = vi.fn().mockRejectedValueOnce(new ApiError(500, "INTERNAL")).mockResolvedValueOnce(trendRead());
    const { result } = renderHook(() => useTrend(QUERY, gatewayReturning(get)));
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(get).toHaveBeenCalledTimes(2);
  });
});
