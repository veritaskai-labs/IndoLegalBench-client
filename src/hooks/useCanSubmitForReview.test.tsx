import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { makeSummary } from "@/test/versionFixtures";
import { useCanSubmitForReview } from "./useCanSubmitForReview";

vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));
const listMock = vi.mocked(listCaseVersions);

const CASE_ID = "22222222-2222-2222-2222-222222222222";
const ME = { id: "11111111-1111-1111-1111-111111111111", role: "author" as const };

beforeEach(() => {
  listMock.mockReset();
});

describe("useCanSubmitForReview", () => {
  // Positive
  it("lets the author who wrote the case submit a draft", async () => {
    listMock.mockResolvedValue([makeSummary(1, { author: { id: ME.id, name: "Esi" } })]);

    const { result } = renderHook(() => useCanSubmitForReview(CASE_ID, ME, "draft"));

    await waitFor(() => expect(result.current).toBe(true));
  });

  // Negative: author lain, bukan penulis kasus ini.
  it("refuses an author who did not write the case", async () => {
    listMock.mockResolvedValue([makeSummary(1, { author: { id: "someone-else", name: "Roben" } })]);

    const { result } = renderHook(() => useCanSubmitForReview(CASE_ID, ME, "draft"));

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  // Negative: peran lain tidak perlu riwayat sama sekali.
  it("refuses the other roles without asking for the history", () => {
    const { result } = renderHook(() =>
      useCanSubmitForReview(CASE_ID, { id: ME.id, role: "reviewer" }, "draft"),
    );

    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });

  // Negative: status yang memang tidak bisa diajukan.
  it("does not ask for the history on an approved case", () => {
    const { result } = renderHook(() => useCanSubmitForReview(CASE_ID, ME, "approved"));

    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });

  // Corner: render pertama, permintaan baru dikirim dan hasilnya belum ada.
  it("hides the button while the history is still loading", () => {
    listMock.mockResolvedValue([makeSummary(1, { author: { id: ME.id, name: "Esi" } })]);

    const { result } = renderHook(() => useCanSubmitForReview(CASE_ID, ME, "draft"));

    expect(result.current).toBe(false);
  });

  // Corner: riwayat gagal dibaca, tombol tetap disembunyikan.
  it("hides the button when the history cannot be read", async () => {
    const failure = Promise.reject(new Error("boom"));
    failure.catch(() => undefined);
    listMock.mockReturnValue(failure);

    const { result } = renderHook(() => useCanSubmitForReview(CASE_ID, ME, "draft"));

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  // Corner: sesi belum terbaca.
  it("refuses when nobody is signed in", () => {
    const { result } = renderHook(() => useCanSubmitForReview(CASE_ID, null, "draft"));

    expect(result.current).toBe(false);
    expect(listMock).not.toHaveBeenCalled();
  });
});