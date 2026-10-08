/**
 * Halaman penolakan akses. PBI-1 (SCRUM-68), AC-2, sub task QA (SCRUM-96).
 *
 * AC-2 berbunyi "akses di luar wewenang ditolak". Sisi server sudah
 * diuji: peran yang tidak berwenang mendapat 403. Yang belum diuji sama
 * sekali adalah apa yang dilihat pengguna sesudahnya, padahal di situlah
 * penolakan berhenti jadi kode dan mulai jadi pengalaman.
 *
 * Tiga hal yang dijaga: penolakan diumumkan sebagai peringatan sehingga
 * pembaca layar menyuarakannya, pengguna diberi tahu apa yang harus
 * dilakukan, dan jalan kembalinya tidak menebak halaman tujuan.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ForbiddenPage from "./page";

describe("ForbiddenPage, AC-2 akses ditolak", () => {
  it("announces the refusal as an alert, not as ordinary text", () => {
    render(<ForbiddenPage />);

    const peringatan = screen.getByRole("alert");
    expect(peringatan).toHaveTextContent(/tidak punya akses/i);
  });

  it("states the reason and what the user can do about it", () => {
    render(<ForbiddenPage />);

    const peringatan = screen.getByRole("alert");
    // Penolakan tanpa jalan keluar membuat pengguna menghubungi siapa pun
    // yang terdekat. Halaman ini harus menyebut peran sebagai sebabnya
    // dan Admin sebagai tujuannya.
    expect(peringatan).toHaveTextContent(/peran akun anda/i);
    expect(peringatan).toHaveTextContent(/admin/i);
  });

  it("offers a way back that resolves the role server-side", () => {
    render(<ForbiddenPage />);

    // Sengaja ke /auth/done, bukan ke /suites atau /dashboard. Halaman
    // ini tidak tahu peran pembacanya, jadi tujuan akhir ditentukan
    // setelah /me dibaca ulang. Menaruh tujuan tetap di sini akan
    // memantulkan sebagian pengguna kembali ke halaman ini.
    expect(screen.getByRole("link", { name: /kembali ke halaman kerja/i })).toHaveAttribute(
      "href",
      "/auth/done",
    );
  });

  it("gives the page a single top-level heading", () => {
    render(<ForbiddenPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /tidak punya akses/i,
    );
  });
});
