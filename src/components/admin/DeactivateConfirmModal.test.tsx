/**
 * AC-7 PBI-1 (SCRUM-68), sub task QA (SCRUM-96).
 *
 * "Admin diminta konfirmasi sebelum menonaktifkan sebuah akun, untuk
 * mencegah kesalahan." Yang membuat konfirmasi itu berguna adalah jalan
 * keluarnya: menekan Batal harus benar-benar membatalkan.
 *
 * modals.test.tsx sudah menguji jalur sukses dan pesan errornya. Berkas
 * ini menutup sisi negatifnya, yang belum diuji di mana pun: Batal,
 * tombol yang dikunci selama proses berjalan, dan isi peringatan yang
 * dibaca admin sebelum memutuskan.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/types/user-management";
import { DeactivateConfirmModal } from "./DeactivateConfirmModal";

const MEMBER: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Budi Author",
  email: "budi@veritask.ai",
  role: "author",
  is_active: true,
};

type ModalProps = React.ComponentProps<typeof DeactivateConfirmModal>;

function renderModal(overrides: Partial<ModalProps> = {}) {
  const props: ModalProps = {
    user: MEMBER,
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<DeactivateConfirmModal {...props} />);
  return props;
}

describe("DeactivateConfirmModal, AC-7 batal", () => {
  it("does not deactivate anyone when the admin clicks Batal", async () => {
    const { onClose, onConfirm } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("names the account being deactivated so the admin can check it first", () => {
    renderModal();

    expect(screen.getByText(MEMBER.name)).toBeInTheDocument();
    expect(screen.getByText(/budi@veritask\.ai/)).toBeInTheDocument();
  });

  it("warns that sessions end while the contribution history is kept", () => {
    renderModal();

    const peringatan = screen.getByText(/sesi aktifnya akan dihapus/i);
    expect(peringatan).toHaveTextContent(/riwayat kontribusi/i);
  });

  it("renders nothing while the dialog is closed, so nothing can be clicked by accident", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("button", { name: "Batal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nonaktifkan" })).not.toBeInTheDocument();
  });

  it("locks both buttons while the deactivation is still running", async () => {
    let selesaikan: () => void = () => {};
    const tertunda = new Promise<void>((resolve) => {
      selesaikan = resolve;
    });
    const { onConfirm } = renderModal({ onConfirm: vi.fn().mockReturnValue(tertunda) });

    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan" }));

    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /memproses/i })).toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    selesaikan();
  });
});
