/**
 * Halaman masuk. PBI-1 (SCRUM-68), AC-1 dan AC-3, sub task QA (SCRUM-96).
 *
 * Ini satu-satunya pintu masuk aplikasi dan sampai sekarang belum punya
 * satu pun test, padahal dua acceptance criteria bertumpu padanya: AC-1
 * (pengguna masuk lewat SSO Veritask) dan AC-3 (sesi yang kedaluwarsa
 * membawa pengguna ke halaman ini dengan pemberitahuan).
 *
 * Yang dijaga di sini bukan tata letaknya, melainkan tiga janji yang
 * kalau patah tidak akan ketahuan sampai ada orang gagal login:
 * tujuan tombol masuk, kapan pemberitahuan sesi berakhir muncul dan
 * kapan tidak, dan bahwa halaman ini tidak pernah meminta kata sandi.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOGIN_URL } from "@/lib/auth";
import LoginPage from "./page";

/** Server component async: panggil dulu, baru render elemen hasilnya. */
async function renderLogin(reason?: string | string[]) {
  const ui = await LoginPage({ searchParams: Promise.resolve({ reason }) });
  return render(ui);
}

const NAMA_TOMBOL_MASUK = "Masuk dengan akun Veritask";
const PESAN_KEDALUWARSA = /sesi anda telah berakhir/i;

describe("LoginPage, AC-1 jalan masuk lewat SSO", () => {
  it("sends the sign-in button to the backend OIDC entry point", async () => {
    await renderLogin();

    const tombol = screen.getByRole("link", { name: NAMA_TOMBOL_MASUK });
    expect(tombol).toHaveAttribute("href", LOGIN_URL);
  });

  it("leaves the app entirely instead of routing on the client", async () => {
    await renderLogin();

    // Alur OIDC harus berupa navigasi satu halaman penuh ke backend.
    // Kalau suatu saat ini diganti rute internal, login berhenti bekerja
    // dan gejalanya sulit dilacak.
    const href = screen
      .getByRole("link", { name: NAMA_TOMBOL_MASUK })
      .getAttribute("href");
    expect(href).toMatch(/^https?:\/\//);
    expect(href).toMatch(/\/auth\/login$/);
  });

  it("keeps the self-service link as a placeholder until the Zitadel URL is decided", async () => {
    // Dipindahkan dari PR #13 (SCRUM-94). Begitu URL self-service Zitadel diputuskan,
    // test ini harus ikut diubah supaya link-nya tidak lupa diisi.
    await renderLogin();

    expect(screen.getByRole("link", { name: "Lupa kata sandi atau masalah MFA" })).toHaveAttribute(
      "href",
      "#",
    );
  });

  it("never asks for a password, the platform does not hold one", async () => {
    // Cerminan test backend test_ac6_tidak_ada_kolom_kata_sandi_di_database.
    // Identitas sepenuhnya milik Zitadel, jadi tidak boleh ada satu pun
    // kolom isian di halaman ini.
    const { container } = await renderLogin();

    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByLabelText(/kata sandi|password/i)).not.toBeInTheDocument();
  });
});

describe("LoginPage, AC-3 pemberitahuan sesi berakhir", () => {
  it("tells the user why they are back here when the session expired", async () => {
    await renderLogin("expired");

    const pemberitahuan = screen.getByRole("status");
    expect(pemberitahuan).toHaveTextContent(PESAN_KEDALUWARSA);
    expect(pemberitahuan).toHaveAttribute("aria-live", "polite");
  });

  it("stays quiet on a normal visit", async () => {
    await renderLogin();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stays quiet for a reason it does not recognise", async () => {
    // Nilai query bisa datang dari mana saja. Hanya "expired" yang boleh
    // memunculkan pemberitahuan; selain itu halaman tampil seperti biasa.
    await renderLogin("sesi-habis");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reads the first value when the query parameter arrives twice", async () => {
    // ?reason=expired&reason=lain membuat Next mengirim array.
    await renderLogin(["expired", "lain"]);

    expect(screen.getByRole("status")).toHaveTextContent(PESAN_KEDALUWARSA);
  });
});
