/**
 * Pre-UAT F-08 (TC-30), PBI-1 (SCRUM-68), sub task SCRUM-95.
 *
 * Konfirmasi sebelum mengaktifkan kembali akun yang dinonaktifkan,
 * cermin dari DeactivateConfirmModal.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { User } from "@/types/user-management";
import { ActivateConfirmModal } from "./ActivateConfirmModal";

const MEMBER: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Rina Reviewer",
  email: "rina@veritask.ai",
  role: "contributor",
  is_active: false,
};

type ModalProps = React.ComponentProps<typeof ActivateConfirmModal>;

function renderModal(overrides: Partial<ModalProps> = {}) {
  const props: ModalProps = {
    user: MEMBER,
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<ActivateConfirmModal {...props} />);
  return props;
}

async function confirm() {
  await userEvent.click(screen.getByRole("button", { name: "Aktifkan" }));
}

describe("ActivateConfirmModal", () => {
  // Positif
  it("asks before reactivating and names the account", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Aktifkan kembali akun ini?" })).toBeInTheDocument();
    expect(screen.getByText(MEMBER.name)).toBeInTheDocument();
    expect(screen.getByText(/rina@veritask\.ai/)).toBeInTheDocument();
  });

  it("says that old reviewer assignments are not restored", () => {
    renderModal();

    expect(screen.getByText(/penugasan reviewer.*tidak dipulihkan/i)).toBeInTheDocument();
  });

  it("calls onConfirm and closes on success", async () => {
    const { onConfirm, onClose } = renderModal();

    await confirm();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Negatif
  it("does nothing but close when the admin clicks Batal", async () => {
    const { onConfirm, onClose } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiError(403, "FORBIDDEN"), "Anda tidak memiliki akses untuk tindakan ini."],
    [new ApiError(404, "not_found"), "Pengguna tidak ditemukan. Muat ulang daftar lalu coba lagi."],
    [new ApiError(500, "UNKNOWN_ERROR"), "Gagal mengaktifkan kembali akun."],
    [new TypeError("Failed to fetch"), "Terjadi kesalahan jaringan."],
  ])("stays open with a readable message when it fails (%s)", async (error, message) => {
    const { onClose } = renderModal({ onConfirm: vi.fn().mockRejectedValue(error) });

    await confirm();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Aktifkan" })).toBeEnabled();
  });

  // Corner
  it("locks both buttons while the request runs, so a double click sends one request", async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderModal({ onConfirm });

    await confirm();
    expect(screen.getByRole("button", { name: "Memproses…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Memproses…" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    finish();
  });

  it("renders nothing when closed or without a user", () => {
    const { container } = render(
      <ActivateConfirmModal user={null} isOpen onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();

    renderModal({ isOpen: false });
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
