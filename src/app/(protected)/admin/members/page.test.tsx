import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { Me, Role } from "@/types";
import type { User } from "@/types/user-management";
import AdminMembersPage from "./page";

const { useAuthMock, apiFetchMock, replaceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiFetchMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: apiFetchMock,
}));

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

const ADMIN: User = {
  id: ADMIN_ID,
  name: "Ani Admin",
  email: "ani@veritask.ai",
  role: "admin",
  is_active: true,
};
const AUTHOR: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Budi Author",
  email: "budi@veritask.ai",
  role: "author",
  is_active: true,
};

function signedInAs(role: Role) {
  const user: Me = { id: ADMIN_ID, name: "Ani Admin", email: "ani@veritask.ai", role };
  useAuthMock.mockReturnValue({ status: "authenticated", user });
}

beforeEach(() => {
  useAuthMock.mockReset();
  apiFetchMock.mockReset();
  replaceMock.mockReset();
});

describe("AdminMembersPage", () => {
  it("redirects a non-admin away and never calls the admin API", async () => {
    signedInAs("author");

    render(<AdminMembersPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("lists members for an admin", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValue([ADMIN, AUTHOR]);

    render(<AdminMembersPage />);

    expect(await screen.findByText("Budi Author")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users");
  });

  it("locks the role select and the toggle on the admin's own row", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValue([ADMIN, AUTHOR]);

    render(<AdminMembersPage />);

    expect(await screen.findByLabelText("Ubah peran Ani Admin")).toBeDisabled();
    expect(screen.getByLabelText("Toggle aktif Ani Admin")).toBeDisabled();
    expect(screen.getByLabelText("Ubah peran Budi Author")).toBeEnabled();
    expect(screen.getByLabelText("Toggle aktif Budi Author")).toBeEnabled();
  });

  it("rolls back the role and shows a message when the update fails", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValueOnce([ADMIN, AUTHOR]);
    apiFetchMock.mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"));

    render(<AdminMembersPage />);
    const select = await screen.findByLabelText("Ubah peran Budi Author");
    await userEvent.selectOptions(select, "viewer");

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal mengubah peran pengguna.");
    expect(select).toHaveValue("author");
  });

  it("shows a readable message, not the raw code, when loading fails", async () => {
    signedInAs("admin");
    apiFetchMock.mockRejectedValue(new ApiError(500, "UNKNOWN_ERROR"));

    render(<AdminMembersPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Gagal memuat daftar anggota.");
    expect(alert).not.toHaveTextContent("UNKNOWN_ERROR");
  });
});
