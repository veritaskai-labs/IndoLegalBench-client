import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { User } from "@/types/user-management";
import { CreateUserModal } from "./CreateUserModal";
import { DeactivateConfirmModal } from "./DeactivateConfirmModal";

const MEMBER: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Budi Author",
  email: "budi@veritask.ai",
  role: "author",
  is_active: true,
};

async function fillCreateForm() {
  await userEvent.type(screen.getByLabelText("Nama"), "Budi Author");
  await userEvent.type(screen.getByLabelText("Email"), "budi@veritask.ai");
  await userEvent.selectOptions(screen.getByLabelText("Peran"), "author");
  await userEvent.click(screen.getByRole("button", { name: "Tambah pengguna" }));
}

describe("CreateUserModal", () => {
  it("shows the duplicate email message on 409", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, "conflict"));
    render(<CreateUserModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    await fillCreateForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email 'budi@veritask.ai' sudah terdaftar dalam sistem.",
    );
  });

  it("shows a readable fallback instead of the raw code", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(500, "UNKNOWN_ERROR"));
    render(<CreateUserModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    await fillCreateForm();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Gagal menambahkan pengguna.");
    expect(alert).not.toHaveTextContent("UNKNOWN_ERROR");
  });
});

describe("DeactivateConfirmModal", () => {
  it("explains CANNOT_DEACTIVATE_SELF", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new ApiError(422, "CANNOT_DEACTIVATE_SELF"));
    render(<DeactivateConfirmModal user={MEMBER} isOpen onClose={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: /nonaktifkan/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Anda tidak dapat menonaktifkan akun Anda sendiri.",
    );
  });

  it("closes after a successful deactivate", async () => {
    const onClose = vi.fn();
    render(
      <DeactivateConfirmModal
        user={MEMBER}
        isOpen
        onClose={onClose}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /nonaktifkan/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
