import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { createRubricV1Draft } from "@/lib/rubrics/rubricDraft";
import { toCreateRequest } from "@/lib/rubrics/rubricRequest";
import { makeFakeGateway, makeRubricVersion } from "@/test/rubricFixtures";
import { useCreateRubricVersion } from "./useCreateRubricVersion";

/** A promise the test settles by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useCreateRubricVersion (POST /rubrics)", () => {
  // Positive: the draft goes out as the request body and the new version is handed back.
  it("sends the draft as a create request and reports the new version", async () => {
    // Arrange
    const created = makeRubricVersion({ id: "v-2", version_no: 2 });
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockResolvedValue(created) });
    const onCreated = vi.fn();
    const draft = createRubricV1Draft();
    const { result } = renderHook(() => useCreateRubricVersion(onCreated, gateway));

    // Act
    await act(() => result.current.submit(draft));

    // Assert
    expect(gateway.createVersion).toHaveBeenCalledWith(toCreateRequest(draft));
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current).toMatchObject({ pending: false, error: null, fieldError: null });
  });

  it("is pending while the request is in flight", async () => {
    // Arrange
    const request = deferred<ReturnType<typeof makeRubricVersion>>();
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockReturnValue(request.promise) });
    const { result } = renderHook(() => useCreateRubricVersion(vi.fn(), gateway));

    // Act
    act(() => void result.current.submit(createRubricV1Draft()));
    const duringRequest = result.current.pending;
    await act(async () => request.resolve(makeRubricVersion()));

    // Assert
    expect(duringRequest).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  // Negative: the server names the field it refused; the form shows it beside the input.
  it("keeps the field and message of a 422 and does not report a new version", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Bobot harus berjumlah 100", "aspects[0].weight");
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockRejectedValue(refusal) });
    const onCreated = vi.fn();
    const { result } = renderHook(() => useCreateRubricVersion(onCreated, gateway));

    // Act
    await act(() => result.current.submit(createRubricV1Draft()));

    // Assert
    expect(result.current.error).toBe("Bobot harus berjumlah 100");
    expect(result.current.fieldError).toEqual({ field: "aspects[0].weight", message: "Bobot harus berjumlah 100" });
    expect(onCreated).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it("explains a role change on a 403 without a field error", async () => {
    // Arrange
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")) });
    const { result } = renderHook(() => useCreateRubricVersion(vi.fn(), gateway));

    // Act
    await act(() => result.current.submit(createRubricV1Draft()));

    // Assert
    expect(result.current.error).toBe("Peran Anda tidak lagi boleh membuat versi rubrik. Muat ulang halaman.");
    expect(result.current.fieldError).toBeNull();
  });

  it("gives the generic message when the request itself fails", async () => {
    // Arrange
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
    const { result } = renderHook(() => useCreateRubricVersion(vi.fn(), gateway));

    // Act
    await act(() => result.current.submit(createRubricV1Draft()));

    // Assert
    expect(result.current.error).toBe("Versi rubrik gagal disimpan. Coba lagi.");
  });

  // Edge: a second click while the first request runs must not create a second version.
  it("ignores a second submit while the first is in flight", async () => {
    // Arrange
    const request = deferred<ReturnType<typeof makeRubricVersion>>();
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockReturnValue(request.promise) });
    const { result } = renderHook(() => useCreateRubricVersion(vi.fn(), gateway));

    // Act
    act(() => void result.current.submit(createRubricV1Draft()));
    await act(() => result.current.submit(createRubricV1Draft()));
    await act(async () => request.resolve(makeRubricVersion()));

    // Assert
    expect(gateway.createVersion).toHaveBeenCalledTimes(1);
  });

  // Edge: after a refusal the Admin fixes the form and sends again; the old error must go.
  it("clears the previous error when the next submit succeeds", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Nama aspek wajib diisi", "aspects[0].name");
    const gateway = makeFakeGateway({
      createVersion: vi.fn().mockRejectedValueOnce(refusal).mockResolvedValueOnce(makeRubricVersion()),
    });
    const { result } = renderHook(() => useCreateRubricVersion(vi.fn(), gateway));
    await act(() => result.current.submit(createRubricV1Draft()));

    // Act
    await act(() => result.current.submit(createRubricV1Draft()));

    // Assert
    expect(result.current).toMatchObject({ error: null, fieldError: null, pending: false });
    expect(gateway.createVersion).toHaveBeenCalledTimes(2);
  });

  // Edge: onCreated failing is not a failed save; reporting it would make the Admin save a duplicate.
  it("does not report a save failure when onCreated throws", async () => {
    // Arrange
    const gateway = makeFakeGateway({ createVersion: vi.fn().mockResolvedValue(makeRubricVersion()) });
    const onCreated = vi.fn(() => {
      throw new Error("render gagal");
    });
    const { result } = renderHook(() => useCreateRubricVersion(onCreated, gateway));

    // Act
    const submitting = act(() => result.current.submit(createRubricV1Draft()));

    // Assert
    await expect(submitting).rejects.toThrow("render gagal");
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(gateway.createVersion).toHaveBeenCalledTimes(1);
  });
});
