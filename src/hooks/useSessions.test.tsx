import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listSessions } from "@/lib/runs/runsApi";
import type { SessionListItem } from "@/types/measurement";
import { useSessions } from "./useSessions";

vi.mock("@/lib/runs/runsApi", () => ({ listSessions: vi.fn() }));

const list = vi.mocked(listSessions);
const rows = [{ id: "s-1", label: "Uji Coba" }] as SessionListItem[];

beforeEach(() => {
  list.mockReset();
});

describe("useSessions (PBI-11 AC10)", () => {
  it("loads the main list by default", async () => {
    // Arrange
    list.mockResolvedValue(rows);

    // Act
    const { result } = renderHook(() => useSessions());

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: rows });
    expect(list).toHaveBeenCalledWith(false);
  });

  it("loads the archived list when archived is true", async () => {
    // Arrange
    list.mockResolvedValue(rows);

    // Act
    const { result } = renderHook(() => useSessions(true));

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(list).toHaveBeenCalledWith(true);
  });

  it("explains a failed load and loads again on reload", async () => {
    // Arrange
    list.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(rows);
    const { result } = renderHook(() => useSessions(true));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({ message: "Gagal memuat sesi pengukuran. Coba lagi." });

    // Act
    result.current.reload();

    // Assert
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(list).toHaveBeenCalledTimes(2);
  });
});
