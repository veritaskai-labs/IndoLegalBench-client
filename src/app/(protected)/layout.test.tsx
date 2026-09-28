/**
 * Gerbang route group (protected). PBI-1 (SCRUM-68), AC-2, sub task QA (SCRUM-96).
 *
 * Berkas ini menentukan apakah setiap halaman di dalam (protected) benar
 * benar berada di balik pemeriksaan sesi. Sampai sekarang coverage-nya
 * nol, padahal isinya baru berubah di SCRUM-94 ketika halaman reviews
 * dan reports dipindahkan masuk ke dalam group ini.
 *
 * AuthGuard sudah punya test sendiri, dan test itu membuktikan guard-nya
 * bekerja bila dipakai. Yang belum dibuktikan siapa pun adalah bahwa
 * layout ini memakainya. Itulah sambungan yang diuji di sini: kalau
 * suatu saat ada yang memindahkan <AuthGuard> atau menaruh chrome di
 * luarnya, seluruh halaman di dalam group ini terbuka tanpa ada satu pun
 * test yang merah.
 *
 * AuthProvider sengaja diganti passthrough. Perilaku pengambilan /me
 * miliknya diuji terpisah di useAuth.test.tsx; di sini yang diperiksa
 * hanya susunan gerbangnya.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me } from "@/types";
import ProtectedLayout from "./layout";

const { replace, useAuthMock } = vi.hoisted(() => ({
  replace: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/suites",
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: useAuthMock,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const PENGGUNA: Me = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Rina Author",
  email: "rina@veritask.ai",
  role: "author",
};

const ISI_HALAMAN = "isi halaman yang dilindungi";

function renderLayout() {
  return render(<ProtectedLayout>{<p>{ISI_HALAMAN}</p>}</ProtectedLayout>);
}

beforeEach(() => {
  replace.mockClear();
  useAuthMock.mockReset();
});

describe("ProtectedLayout, AC-2 gerbang halaman", () => {
  it("keeps the page hidden and sends the visitor to /login without a session", () => {
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "no_session" });

    renderLayout();

    expect(screen.queryByText(ISI_HALAMAN)).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("carries the expired reason through so the login page can explain itself", () => {
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "expired" });

    renderLayout();

    expect(replace).toHaveBeenCalledWith("/login?reason=expired");
    expect(screen.queryByText(ISI_HALAMAN)).not.toBeInTheDocument();
  });

  it("holds the page while the session is still being resolved", () => {
    // Jeda /me tidak boleh dipakai untuk mengintip isi halaman.
    useAuthMock.mockReturnValue({ status: "loading" });

    renderLayout();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(ISI_HALAMAN)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the page inside the chrome once the session is known", () => {
    useAuthMock.mockReturnValue({ status: "authenticated", user: PENGGUNA });

    renderLayout();

    expect(screen.getByText(ISI_HALAMAN)).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText(PENGGUNA.name)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("puts the chrome behind the same gate, not beside it", () => {
    // Sidebar memuat daftar halaman yang ada beserta yang boleh dibuka
    // tiap peran. Kalau chrome dirender di luar AuthGuard, struktur
    // aplikasi bocor ke pengunjung yang belum masuk.
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "no_session" });

    renderLayout();

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText(/suite dan kasus/i)).not.toBeInTheDocument();
  });
});
