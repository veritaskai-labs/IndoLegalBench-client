import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { User } from "@/types/user-management";
import { useMemberChange, type MemberChangeApi } from "./useMemberChange";

const MEMBER: User = {
  id: "u2",
  name: "Budi",
  email: "budi@veritask.ai",
  role: "contributor",
  is_active: true,
};

const WAITING = (count: number) => new ApiError(409, "CONFIRMATION_REQUIRED", null, null, [], count);

let api: { changeUserRole: ReturnType<typeof vi.fn>; deactivateUser: ReturnType<typeof vi.fn> };
let onChanged: Mock<(user: User) => void>;

function setup() {
  return renderHook(() => useMemberChange(onChanged, api as unknown as MemberChangeApi));
}

beforeEach(() => {
  api = { changeUserRole: vi.fn(), deactivateUser: vi.fn() };
  onChanged = vi.fn();
});

describe("useMemberChange, role change", () => {
  // Positif: no cases waiting, the server saves right away.
  it("saves the role without asking when nothing is waiting", async () => {
    // Arrange
    api.changeUserRole.mockResolvedValue({ ...MEMBER, role: "viewer" });
    const { result } = setup();

    // Act
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    // Assert
    expect(api.changeUserRole).toHaveBeenCalledExactlyOnceWith("u2", "viewer");
    expect(onChanged).toHaveBeenCalledWith({ ...MEMBER, role: "viewer" });
    expect(result.current.pending).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // Positif: PBI-24 AC8, the admin is asked first and nothing is saved yet.
  it("holds the change and the count when the server asks for confirmation", async () => {
    api.changeUserRole.mockRejectedValue(WAITING(3));
    const { result } = setup();

    await act(() => result.current.changeRole(MEMBER, "viewer"));

    expect(result.current.pending).toEqual({ kind: "role", user: MEMBER, role: "viewer", count: 3 });
    expect(result.current.error).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("sends the same request again with confirm once the admin agrees", async () => {
    api.changeUserRole.mockRejectedValueOnce(WAITING(3));
    api.changeUserRole.mockResolvedValueOnce({ ...MEMBER, role: "viewer" });
    const { result } = setup();
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    await act(() => result.current.confirmPending());

    expect(api.changeUserRole).toHaveBeenLastCalledWith("u2", "viewer", true);
    expect(onChanged).toHaveBeenCalledWith({ ...MEMBER, role: "viewer" });
    expect(result.current.pending).toBeNull();
  });

  // Negatif
  it("sends nothing more and saves nothing when the admin cancels", async () => {
    api.changeUserRole.mockRejectedValue(WAITING(3));
    const { result } = setup();
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    act(() => result.current.cancelPending());

    expect(result.current.pending).toBeNull();
    expect(api.changeUserRole).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("shows a readable message for any other failure", async () => {
    api.changeUserRole.mockRejectedValue(new ApiError(500, "UNKNOWN_ERROR"));
    const { result } = setup();

    await act(() => result.current.changeRole(MEMBER, "viewer"));

    expect(result.current.error).toBe("Gagal mengubah peran pengguna.");
    expect(result.current.pending).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("reports a network problem when the request never reached the server", async () => {
    api.changeUserRole.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = setup();

    await act(() => result.current.changeRole(MEMBER, "viewer"));

    expect(result.current.error).toBe("Terjadi kesalahan jaringan.");
  });

  // Edge: someone else released or submitted a review while the dialog was open.
  it("shows the new count when the confirmed request is asked to confirm again", async () => {
    api.changeUserRole.mockRejectedValueOnce(WAITING(3));
    api.changeUserRole.mockRejectedValueOnce(WAITING(2));
    const { result } = setup();
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    await act(() => result.current.confirmPending());

    expect(result.current.pending).toEqual({ kind: "role", user: MEMBER, role: "viewer", count: 2 });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("closes the dialog and reports the failure when the confirmed request fails", async () => {
    api.changeUserRole.mockRejectedValueOnce(WAITING(3));
    api.changeUserRole.mockRejectedValueOnce(new ApiError(404, "not_found"));
    const { result } = setup();
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    await act(() => result.current.confirmPending());

    expect(result.current.pending).toBeNull();
    expect(result.current.error).toBe("Pengguna tidak ditemukan. Muat ulang daftar lalu coba lagi.");
  });

  // Edge: a second click while the first request is still running.
  it("sends the confirmed request only once when Lanjutkan is clicked twice", async () => {
    api.changeUserRole.mockRejectedValueOnce(WAITING(3));
    api.changeUserRole.mockResolvedValue({ ...MEMBER, role: "viewer" });
    const { result } = setup();
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    await act(async () => {
      await Promise.all([result.current.confirmPending(), result.current.confirmPending()]);
    });

    const confirmed = api.changeUserRole.mock.calls.filter((call) => call[2] === true);
    expect(confirmed).toHaveLength(1);
  });

  it("does nothing when there is nothing to confirm", async () => {
    const { result } = setup();

    await act(() => result.current.confirmPending());

    expect(api.changeUserRole).not.toHaveBeenCalled();
    expect(api.deactivateUser).not.toHaveBeenCalled();
  });

  it("clears an earlier error when a new change starts", async () => {
    api.changeUserRole.mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"));
    api.changeUserRole.mockResolvedValueOnce({ ...MEMBER, role: "viewer" });
    const { result } = setup();
    await act(() => result.current.changeRole(MEMBER, "viewer"));

    await act(() => result.current.changeRole(MEMBER, "viewer"));

    expect(result.current.error).toBeNull();
  });
});

describe("useMemberChange, deactivation", () => {
  it("deactivates without asking when nothing is waiting", async () => {
    api.deactivateUser.mockResolvedValue({ ...MEMBER, is_active: false });
    const { result } = setup();

    await act(() => result.current.deactivate(MEMBER));

    expect(api.deactivateUser).toHaveBeenCalledExactlyOnceWith("u2");
    expect(onChanged).toHaveBeenCalledWith({ ...MEMBER, is_active: false });
    expect(result.current.pending).toBeNull();
  });

  it("holds the deactivation and the count when the server asks for confirmation", async () => {
    api.deactivateUser.mockRejectedValue(WAITING(1));
    const { result } = setup();

    await act(() => result.current.deactivate(MEMBER));

    expect(result.current.pending).toEqual({ kind: "deactivate", user: MEMBER, count: 1 });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("deactivates with confirm once the admin agrees", async () => {
    api.deactivateUser.mockRejectedValueOnce(WAITING(1));
    api.deactivateUser.mockResolvedValueOnce({ ...MEMBER, is_active: false });
    const { result } = setup();
    await act(() => result.current.deactivate(MEMBER));

    await act(() => result.current.confirmPending());

    expect(api.deactivateUser).toHaveBeenLastCalledWith("u2", true);
    expect(onChanged).toHaveBeenCalledWith({ ...MEMBER, is_active: false });
    expect(result.current.pending).toBeNull();
  });

  it("leaves the account active and sends nothing more when the admin cancels", async () => {
    api.deactivateUser.mockRejectedValue(WAITING(1));
    const { result } = setup();
    await act(() => result.current.deactivate(MEMBER));

    act(() => result.current.cancelPending());

    expect(api.deactivateUser).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("lets the first dialog show the failure of a refused deactivation", async () => {
    api.deactivateUser.mockRejectedValue(new ApiError(400, "CANNOT_DEACTIVATE_SELF"));
    const { result } = setup();

    await expect(act(() => result.current.deactivate(MEMBER))).rejects.toThrow("CANNOT_DEACTIVATE_SELF");

    expect(result.current.pending).toBeNull();
  });
});
