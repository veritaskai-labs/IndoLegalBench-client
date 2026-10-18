import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listRegulationTypes } from "@/lib/cases/regulationTypeApi";
import type { RegulationType } from "@/types/regulationType";
import { useRegulationTypes } from "./useRegulationTypes";

vi.mock("@/lib/cases/regulationTypeApi", () => ({ listRegulationTypes: vi.fn() }));

const listMock = vi.mocked(listRegulationTypes);

function regulationType(
  code: string,
  label: string,
  singkatan: string | null = null,
): RegulationType {
  return { code, label, singkatan, is_active: true };
}

const UU = regulationType("uu", "Undang-undang", "UU");
const PP = regulationType("pp", "Peraturan Pemerintah", "PP");

beforeEach(() => {
  listMock.mockReset();
});

describe("useRegulationTypes", () => {
  // Positive
  it("starts loading and then exposes the types", async () => {
    // Arrange
    listMock.mockResolvedValue([UU, PP]);

    // Act
    const { result } = renderHook(() => useRegulationTypes());
    const initial = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(initial).toBe("loading");
    expect(result.current).toMatchObject({ status: "ready", types: [UU, PP] });
  });

  it("loads the list once, not on every render", async () => {
    // Arrange
    listMock.mockResolvedValue([UU]);
    const { result, rerender } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    rerender();
    rerender();

    // Assert
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  // Edge
  it("stays ready when the server has no active type", async () => {
    // Arrange
    listMock.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", types: [] });
  });

  it("keeps the server order of the types", async () => {
    // Arrange
    listMock.mockResolvedValue([PP, UU]);

    // Act
    const { result } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ types: [{ code: "pp" }, { code: "uu" }] });
  });

  // Negative
  it("reports the permission message when the server answers 403", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(403, "FORBIDDEN"));

    // Act
    const { result } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Anda tidak memiliki izin untuk melihat daftar jenis peraturan.",
    });
  });

  it("reports the general message for any other failure", async () => {
    // Arrange
    listMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));

    // Act
    const { result } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Assert
    expect(result.current).toMatchObject({
      status: "error",
      message: "Gagal memuat daftar jenis peraturan. Coba lagi.",
    });
  });

  it("reloads after a failure and shows the types on retry", async () => {
    // Arrange
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    listMock.mockResolvedValueOnce([UU]);
    const { result } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("error"));

    // Act
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(result.current).toMatchObject({ status: "ready", types: [UU] });
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("goes back to loading while it reloads and then shows the new list", async () => {
    // Arrange
    listMock.mockResolvedValueOnce([UU]);
    listMock.mockResolvedValueOnce([UU, PP]);
    const { result } = renderHook(() => useRegulationTypes());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Act
    act(() => result.current.reload());
    const duringReload = result.current.status;
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Assert
    expect(duringReload).toBe("loading");
    expect(result.current).toMatchObject({ types: [UU, PP] });
  });
});
