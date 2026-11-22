import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { eligibleSession } from "@/test/reportFixtures";

import { useTrendProducts } from "./useTrendProducts";

describe("useTrendProducts", () => {
  // Positive
  it("lists each product once from the report sessions, whatever the session type", async () => {
    // Arrange
    const eligibleSessions = vi.fn().mockResolvedValue([
      eligibleSession({ product_id: "p-b", product_name: "Bravo" }),
      eligibleSession({ product_id: "p-a", product_name: "AiYU" }),
      eligibleSession({ product_id: "p-a", product_name: "AiYU", session_type: "manual" }),
    ]);

    // Act
    const { result } = renderHook(() => useTrendProducts({ eligibleSessions }));

    // Assert
    expect(result.current.status).toBe("loading");
    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "ready",
        data: [
          { id: "p-a", name: "AiYU" },
          { id: "p-b", name: "Bravo" },
        ],
      }),
    );
    expect(eligibleSessions).toHaveBeenCalledWith("all");
  });

  // Edge case
  it("hands over an empty list when nothing was measured yet", async () => {
    // Arrange
    const eligibleSessions = vi.fn().mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useTrendProducts({ eligibleSessions }));

    // Assert
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: [] }));
  });

  // Negative
  it("reports a failed load with a retry message", async () => {
    // Arrange
    const eligibleSessions = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    // Act
    const { result } = renderHook(() => useTrendProducts({ eligibleSessions }));

    // Assert
    await waitFor(() =>
      expect(result.current).toMatchObject({ status: "error", message: "Daftar produk gagal dimuat. Coba lagi." }),
    );
  });
});
