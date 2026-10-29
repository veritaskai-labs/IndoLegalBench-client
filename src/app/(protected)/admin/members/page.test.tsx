import { render, screen, waitFor, within } from "@testing-library/react";
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
  role: "contributor",
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
    signedInAs("contributor");

    render(<AdminMembersPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  // PBI-24 AC1: Kontributor replaces Author and Reviewer in the list the admin picks from.
  it("offers Admin, Kontributor, Viewer and Developer AI in the role select", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValue([ADMIN, AUTHOR]);

    render(<AdminMembersPage />);
    const select = await screen.findByLabelText("Ubah peran Budi Author");

    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Admin",
      "Kontributor",
      "Viewer",
      "Developer AI",
    ]);
    expect(select).toHaveValue("contributor");
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
    expect(select).toHaveValue("contributor");
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

// Pre-UAT F-08 (TC-30): akun yang dinonaktifkan harus bisa diaktifkan lagi.
describe("AdminMembersPage, reactivating a member", () => {
  const INACTIVE: User = { ...AUTHOR, is_active: false };

  async function openReactivate() {
    signedInAs("admin");
    apiFetchMock.mockResolvedValueOnce([ADMIN, INACTIVE]);
    render(<AdminMembersPage />);
    await userEvent.click(await screen.findByLabelText("Toggle aktif Budi Author"));
  }

  // Positif
  it("unlocks the switch on an inactive row", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValue([ADMIN, INACTIVE]);

    render(<AdminMembersPage />);

    expect(await screen.findByLabelText("Toggle aktif Budi Author")).toBeEnabled();
    expect(screen.getByLabelText("Ubah peran Budi Author")).toBeDisabled();
  });

  it("asks first, calls the activate endpoint, then shows the row as active", async () => {
    await openReactivate();
    expect(screen.getByRole("heading", { name: "Aktifkan kembali akun ini?" })).toBeInTheDocument();
    apiFetchMock.mockResolvedValueOnce({ ...INACTIVE, is_active: true });

    await userEvent.click(screen.getByRole("button", { name: "Aktifkan" }));

    expect(apiFetchMock).toHaveBeenLastCalledWith(`/admin/users/${AUTHOR.id}/activate`, {
      method: "POST",
    });
    await waitFor(() => expect(screen.getByLabelText("Ubah peran Budi Author")).toBeEnabled());
    expect(screen.queryByRole("heading", { name: "Aktifkan kembali akun ini?" })).toBeNull();
  });

  it("still opens the deactivate confirmation for an active row", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValueOnce([ADMIN, AUTHOR]);
    render(<AdminMembersPage />);

    await userEvent.click(await screen.findByLabelText("Toggle aktif Budi Author"));

    expect(screen.getByRole("heading", { name: "Nonaktifkan Pengguna?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aktifkan kembali akun ini?" })).toBeNull();
  });

  // Negatif
  it("keeps the row inactive and explains why when the server refuses", async () => {
    await openReactivate();
    apiFetchMock.mockRejectedValueOnce(new ApiError(404, "not_found"));

    await userEvent.click(screen.getByRole("button", { name: "Aktifkan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Pengguna tidak ditemukan.");
    expect(screen.getByLabelText("Ubah peran Budi Author")).toBeDisabled();
  });

  it("closes without calling the server when the admin clicks Batal", async () => {
    await openReactivate();

    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Aktifkan kembali akun ini?" })).toBeNull();
  });

  // Corner
  it("does nothing when the locked own row is clicked", async () => {
    signedInAs("admin");
    apiFetchMock.mockResolvedValueOnce([ADMIN, AUTHOR]);
    render(<AdminMembersPage />);

    await userEvent.click(await screen.findByLabelText("Toggle aktif Ani Admin"));

    expect(screen.queryByRole("heading")).toBeNull();
  });
});

// Jalur lama halaman Anggota yang belum punya test, supaya page.tsx 100%.
describe("AdminMembersPage, existing paths", () => {
  const REVIEWER: User = {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Rina Reviewer",
    email: "rina@veritask.ai",
    role: "contributor",
    is_active: false,
  };

  async function renderList(users: User[] = [ADMIN, AUTHOR, REVIEWER]) {
    signedInAs("admin");
    apiFetchMock.mockResolvedValue(users);
    render(<AdminMembersPage />);
    await screen.findByText(users[0]?.name ?? "Belum ada anggota yang terdaftar.");
  }

  function deferred<T>() {
    let resolve: (value: T) => void = () => {};
    let reject: (reason: unknown) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it("shows the access check while auth is loading and does not fetch", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<AdminMembersPage />);

    expect(screen.getByText("Memeriksa hak akses…")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch or redirect when there is no session", () => {
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "no_session" });

    render(<AdminMembersPage />);

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("says nobody is registered yet for an empty list", async () => {
    await renderList([]);

    expect(screen.getByText("Belum ada anggota yang terdaftar.")).toBeInTheDocument();
  });

  it.each([
    ["name", "BUDI", "Budi Author"],
    ["email", "rina@", "Rina Reviewer"],
    ["id", "33333333", "Rina Reviewer"],
  ])("searches by %s", async (_field, query, expected) => {
    await renderList();

    await userEvent.type(screen.getByPlaceholderText("Cari ID, nama atau email pengguna"), query);

    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText("Ani Admin")).toBeNull();
  });

  it("suggests adjusting the search when nothing matches", async () => {
    await renderList();

    await userEvent.type(screen.getByPlaceholderText("Cari ID, nama atau email pengguna"), "zzz");

    expect(screen.getByText("Coba sesuaikan kata kunci pencarian atau filter.")).toBeInTheDocument();
  });

  it.each([
    ["Aktif", "/admin/users?is_active=true", "Budi Author", "Rina Reviewer"],
    ["Non-aktif", "/admin/users?is_active=false", "Rina Reviewer", "Budi Author"],
  ])(
    "filters by status %s on the server and in the list",
    async (status, url, shown, hidden) => {
      await renderList();

      await userEvent.click(screen.getByRole("button", { name: "Filter" }));
      await userEvent.click(screen.getByLabelText(status));
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => expect(apiFetchMock).toHaveBeenLastCalledWith(url));
      expect(await screen.findByText(shown)).toBeInTheDocument();
      expect(screen.queryByText(hidden)).toBeNull();
    },
  );

  it("filters by role and closes the popover on Cancel", async () => {
    await renderList();

    await userEvent.click(screen.getByRole("button", { name: "Filter" }));
    await userEvent.click(screen.getByLabelText("Kontributor"));
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("Budi Author")).toBeInTheDocument();
    expect(screen.queryByText("Ani Admin")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Filter" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("reloads the list when the admin clicks Coba lagi", async () => {
    signedInAs("admin");
    apiFetchMock.mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"));
    apiFetchMock.mockResolvedValueOnce([ADMIN, AUTHOR]);
    render(<AdminMembersPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByText("Budi Author")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the error when Coba lagi fails again", async () => {
    signedInAs("admin");
    apiFetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AdminMembersPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Coba lagi" }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("alert")).toHaveTextContent("Terjadi kesalahan jaringan.");
  });

  it("adds a member and reloads the list", async () => {
    await renderList([ADMIN]);
    apiFetchMock.mockResolvedValueOnce(AUTHOR).mockResolvedValueOnce([ADMIN, AUTHOR]);

    await userEvent.click(screen.getByRole("button", { name: "Tambah pengguna" }));
    await userEvent.type(screen.getByLabelText("Nama"), "Budi Author");
    await userEvent.type(screen.getByLabelText("Email"), "budi@veritask.ai");
    await userEvent.selectOptions(screen.getByLabelText("Peran"), "contributor");
    const dialogButtons = screen.getAllByRole("button", { name: "Tambah pengguna" });
    await userEvent.click(dialogButtons[dialogButtons.length - 1]);

    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users", {
      method: "POST",
      body: JSON.stringify({ name: "Budi Author", email: "budi@veritask.ai", role: "contributor" }),
    });
    expect(await screen.findByText("Budi Author")).toBeInTheDocument();
  });

  it("closes the add dialog on Batal without calling the server", async () => {
    await renderList([ADMIN]);

    await userEvent.click(screen.getByRole("button", { name: "Tambah pengguna" }));
    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(screen.queryByText("Tambah Pengguna Baru")).toBeNull();
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("deactivates a member after confirmation and locks the row", async () => {
    await renderList([ADMIN, AUTHOR]);
    apiFetchMock.mockResolvedValueOnce({ ...AUTHOR, is_active: false });

    await userEvent.click(screen.getByLabelText("Toggle aktif Budi Author"));
    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan" }));

    expect(apiFetchMock).toHaveBeenLastCalledWith(`/admin/users/${AUTHOR.id}/deactivate`, {
      method: "POST",
    });
    await waitFor(() => expect(screen.getByLabelText("Ubah peran Budi Author")).toBeDisabled());
  });

  it.each([
    ["resolves", (d: ReturnType<typeof deferred<User[]>>) => d.resolve([ADMIN])],
    ["fails", (d: ReturnType<typeof deferred<User[]>>) => d.reject(new Error("late"))],
  ])("ignores a load that %s after the page is gone", async (_case, settle) => {
    signedInAs("admin");
    const pending = deferred<User[]>();
    apiFetchMock.mockReturnValueOnce(pending.promise);
    const { unmount } = render(<AdminMembersPage />);

    unmount();
    settle(pending);

    // Settled after unmount: the cancelled flag must swallow it without a
    // state update or an unhandled rejection.
    await pending.promise.catch(() => undefined);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// PBI-24 AC8 + D11: changing the role of, or deactivating, a member who still has cases waiting
// for a verdict asks the admin first and shows how many cases will go to the reassignment queue.
describe("AdminMembersPage, confirmation before role change or deactivation", () => {
  const QUESTION = "3 kasus menunggu penilaian akan masuk daftar penugasan ulang. Lanjutkan?";
  const WAITING = () => new ApiError(409, "CONFIRMATION_REQUIRED", null, null, [], 3);

  async function renderMembers() {
    signedInAs("admin");
    apiFetchMock.mockResolvedValueOnce([ADMIN, AUTHOR]);
    render(<AdminMembersPage />);
    return screen.findByLabelText("Ubah peran Budi Author");
  }

  // Positif
  it("asks with the number of waiting cases and saves nothing yet when the role change needs confirmation", async () => {
    const select = await renderMembers();
    apiFetchMock.mockRejectedValueOnce(WAITING());

    await userEvent.selectOptions(select, "viewer");

    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(select).toHaveValue("contributor");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(apiFetchMock).toHaveBeenLastCalledWith(`/admin/users/${AUTHOR.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "viewer" }),
    });
  });

  it("sends the role change again with confirm=true when the admin agrees", async () => {
    const select = await renderMembers();
    apiFetchMock.mockRejectedValueOnce(WAITING());
    await userEvent.selectOptions(select, "viewer");
    await screen.findByText(QUESTION);
    apiFetchMock.mockResolvedValueOnce({ ...AUTHOR, role: "viewer" });

    await userEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(apiFetchMock).toHaveBeenLastCalledWith(`/admin/users/${AUTHOR.id}?confirm=true`, {
      method: "PATCH",
      body: JSON.stringify({ role: "viewer" }),
    });
    await waitFor(() => expect(select).toHaveValue("viewer"));
    expect(screen.queryByText(QUESTION)).toBeNull();
  });

  it("asks before deactivating, then deactivates with confirm=true", async () => {
    await renderMembers();
    await userEvent.click(screen.getByLabelText("Toggle aktif Budi Author"));
    apiFetchMock.mockRejectedValueOnce(WAITING());
    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan" }));
    await screen.findByText(QUESTION);
    apiFetchMock.mockResolvedValueOnce({ ...AUTHOR, is_active: false });

    await userEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(apiFetchMock).toHaveBeenLastCalledWith(`/admin/users/${AUTHOR.id}/deactivate?confirm=true`, {
      method: "POST",
    });
    await waitFor(() => expect(screen.getByLabelText("Ubah peran Budi Author")).toBeDisabled());
    expect(screen.queryByText(QUESTION)).toBeNull();
  });

  // Negatif
  it("keeps the role and sends nothing more when the admin cancels the question", async () => {
    const select = await renderMembers();
    apiFetchMock.mockRejectedValueOnce(WAITING());
    await userEvent.selectOptions(select, "viewer");
    await screen.findByText(QUESTION);

    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(screen.queryByText(QUESTION)).toBeNull();
    expect(select).toHaveValue("contributor");
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the account active when the admin cancels the question", async () => {
    await renderMembers();
    await userEvent.click(screen.getByLabelText("Toggle aktif Budi Author"));
    apiFetchMock.mockRejectedValueOnce(WAITING());
    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan" }));
    await screen.findByText(QUESTION);

    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(screen.getByLabelText("Ubah peran Budi Author")).toBeEnabled();
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a readable message and no question when the confirmed request fails", async () => {
    const select = await renderMembers();
    apiFetchMock.mockRejectedValueOnce(WAITING());
    await userEvent.selectOptions(select, "viewer");
    await screen.findByText(QUESTION);
    apiFetchMock.mockRejectedValueOnce(new ApiError(500, "UNKNOWN_ERROR"));

    await userEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal mengubah peran pengguna.");
    expect(screen.queryByText(QUESTION)).toBeNull();
    expect(select).toHaveValue("contributor");
  });

  // Corner: nobody is waiting, so the old flow stays as it was, with no second question.
  it("deactivates straight away when no case is waiting", async () => {
    await renderMembers();
    await userEvent.click(screen.getByLabelText("Toggle aktif Budi Author"));
    apiFetchMock.mockResolvedValueOnce({ ...AUTHOR, is_active: false });

    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan" }));

    expect(apiFetchMock).toHaveBeenLastCalledWith(`/admin/users/${AUTHOR.id}/deactivate`, { method: "POST" });
    await waitFor(() => expect(screen.getByLabelText("Ubah peran Budi Author")).toBeDisabled());
    expect(screen.queryByText(/menunggu penilaian akan masuk/)).toBeNull();
  });
});
