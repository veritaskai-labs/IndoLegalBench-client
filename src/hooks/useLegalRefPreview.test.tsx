import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { emptyCaseFormValues, type CaseFormValues } from "@/lib/cases/caseFormMapping";
import { emptyLink, type LegalRefFormValues } from "@/lib/cases/legalRefForm";
import { previewLegalRefs, type LegalRefPreviewItem } from "@/lib/cases/legalRefPreviewApi";
import { PREVIEW_DELAY_MS, useLegalRefPreview } from "./useLegalRefPreview";

// Modul API di-mock: yang diuji di sini kapan request dikirim, dibatalkan, dan diabaikan,
// bukan bentuk HTTP-nya (itu di legalRefPreviewApi.test.ts).
vi.mock("@/lib/cases/legalRefPreviewApi", () => ({ previewLegalRefs: vi.fn() }));
const previewMock = vi.mocked(previewLegalRefs);

// Contoh hukum hanya KTK-001 (Sprint 1). Nilai "1" adalah input format sintetis.
function ktk001(pasal = "156"): LegalRefFormValues {
  return {
    kind: "structured",
    free_text: "",
    links: [{ ...emptyLink("pasal"), regulation_type: "uu", number: "13", year: "2003", pasal }],
  };
}

const TEXT_KTK_001 = "Pasal 156 UU 13/2003";

function ok(text: string): LegalRefPreviewItem[] {
  return [{ display_text: text, error: null }];
}

function values(...refs: LegalRefFormValues[]): CaseFormValues {
  return { ...emptyCaseFormValues(), legal_refs: refs };
}

function setup({
  refs = [ktk001()],
  caseId = null as string | null,
  enabled = true,
} = {}) {
  return renderHook(() => {
    const form = useForm<CaseFormValues>({ defaultValues: values(...refs) });
    return { form, preview: useLegalRefPreview(form.control, caseId, enabled) };
  });
}

/** Satu promise yang bisa diselesaikan dari tes, untuk jawaban yang datang terlambat. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  // Fake timers: jeda debounce dikendalikan tes, tidak menunggu 400 ms sungguhan.
  vi.useFakeTimers();
  previewMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLegalRefPreview", () => {
  // Positif
  it("asks the server once, after the delay, and shows its text", async () => {
    // Arrange
    previewMock.mockResolvedValue(ok(TEXT_KTK_001));
    const { result } = setup({ caseId: "case-1" });

    // Act
    await wait(PREVIEW_DELAY_MS - 1);
    const before = previewMock.mock.calls.length;
    await wait(1);

    // Assert
    expect(before).toBe(0);
    expect(previewMock).toHaveBeenCalledTimes(1);
    const [payload, caseId, signal] = previewMock.mock.calls[0] ?? [];
    expect(payload).toHaveLength(1);
    expect(payload?.[0]).toMatchObject({ kind: "structured", links: [{ pasal: "156", year: 2003 }] });
    expect(caseId).toBe("case-1");
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(result.current.preview.previews).toEqual([{ text: TEXT_KTK_001, error: null }]);
    expect(result.current.preview.failed).toBe(false);
  });

  it("waits for the typing to pause: one request with the last value", async () => {
    // Arrange
    previewMock.mockResolvedValue(ok(TEXT_KTK_001));
    const { result } = setup({ refs: [ktk001("1")] });

    // Act
    await wait(PREVIEW_DELAY_MS - 100);
    act(() => result.current.form.setValue("legal_refs.0.links.0.pasal", "15"));
    await wait(PREVIEW_DELAY_MS - 100);
    act(() => result.current.form.setValue("legal_refs.0.links.0.pasal", "156"));
    await wait(PREVIEW_DELAY_MS);

    // Assert
    expect(previewMock).toHaveBeenCalledTimes(1);
    expect(previewMock.mock.calls[0]?.[0][0]?.links[0]?.pasal).toBe("156");
  });

  // Negatif: jawaban lama tidak menimpa yang baru (keputusan PO no. 7)
  it("aborts the request in flight when the Author types again, and ignores its late answer", async () => {
    // Arrange
    const first = deferred<LegalRefPreviewItem[]>();
    previewMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(ok("Pasal 1 UU 13/2003"));
    const { result } = setup();
    await wait(PREVIEW_DELAY_MS);
    const firstSignal = previewMock.mock.calls[0]?.[2];

    // Act
    act(() => result.current.form.setValue("legal_refs.0.links.0.pasal", "1"));
    await wait(PREVIEW_DELAY_MS);
    await act(async () => first.resolve(ok(TEXT_KTK_001)));

    // Assert
    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.preview.previews).toEqual([{ text: "Pasal 1 UU 13/2003", error: null }]);
  });

  it("shows nothing for a citation edited while its answer is on the way", async () => {
    // Arrange
    previewMock.mockResolvedValue(ok(TEXT_KTK_001));
    const { result } = setup();
    await wait(PREVIEW_DELAY_MS);

    // Act
    act(() => result.current.form.setValue("legal_refs.0.links.0.pasal", "1"));

    // Assert
    expect(result.current.preview.previews).toEqual([null]);
  });

  it("marks the preview as failed on a server or network error, without throwing", async () => {
    // Arrange
    previewMock.mockRejectedValue(new ApiError(500, "UNKNOWN_ERROR"));
    const { result } = setup();

    // Act
    await wait(PREVIEW_DELAY_MS);

    // Assert
    expect(result.current.preview.failed).toBe(true);
    expect(result.current.preview.previews).toEqual([null]);
  });

  it("clears the failure once a later preview succeeds", async () => {
    // Arrange
    previewMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(ok("x"));
    const { result } = setup();
    await wait(PREVIEW_DELAY_MS);

    // Act
    act(() => result.current.form.setValue("legal_refs.0.links.0.pasal", "1"));
    await wait(PREVIEW_DELAY_MS);

    // Assert
    expect(result.current.preview.failed).toBe(false);
  });

  it("does not treat its own abort as a failure", async () => {
    // Arrange
    const first = deferred<LegalRefPreviewItem[]>();
    previewMock.mockReturnValueOnce(first.promise).mockReturnValue(new Promise(() => undefined));
    const { result } = setup();
    await wait(PREVIEW_DELAY_MS);

    // Act
    act(() => result.current.form.setValue("legal_refs.0.links.0.pasal", "1"));
    await act(async () => first.reject(new DOMException("aborted", "AbortError")));

    // Assert
    expect(result.current.preview.failed).toBe(false);
  });

  // Edge (review Rafa di PR #36): tanpa rujukan tidak ada pratinjau yang bisa gagal.
  it("drops the failure message once every citation is removed", async () => {
    // Arrange
    previewMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = setup();
    await wait(PREVIEW_DELAY_MS);

    // Act
    act(() => result.current.form.setValue("legal_refs", []));
    await wait(PREVIEW_DELAY_MS);

    // Assert
    expect(result.current.preview).toEqual({ previews: [], failed: false });
  });

  // Edge
  it("sends nothing for a read-only form", async () => {
    // Arrange
    setup({ enabled: false });

    // Act
    await wait(PREVIEW_DELAY_MS * 2);

    // Assert
    expect(previewMock).not.toHaveBeenCalled();
  });

  it("sends nothing when there is no citation", async () => {
    // Arrange
    const { result } = setup({ refs: [] });

    // Act
    await wait(PREVIEW_DELAY_MS * 2);

    // Assert
    expect(previewMock).not.toHaveBeenCalled();
    expect(result.current.preview.previews).toEqual([]);
  });

  it("cancels the pending timer and the request when the editor closes", async () => {
    // Arrange
    const { unmount } = setup();
    await wait(PREVIEW_DELAY_MS - 1);

    // Act
    unmount();
    await wait(PREVIEW_DELAY_MS);

    // Assert
    expect(previewMock).not.toHaveBeenCalled();
  });

  it("aborts a request still in flight when the editor closes", async () => {
    // Arrange
    previewMock.mockReturnValue(new Promise(() => undefined));
    const { unmount } = setup();
    await wait(PREVIEW_DELAY_MS);

    // Act
    unmount();

    // Assert
    expect(previewMock.mock.calls[0]?.[2]?.aborted).toBe(true);
  });
});
