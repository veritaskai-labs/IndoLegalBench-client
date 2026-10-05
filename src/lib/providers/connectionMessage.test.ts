import { describe, expect, it } from "vitest";
import { CONNECTION_ERROR_CODES, describeConnectionFailure } from "./connectionMessage";

// Input space partitioning on the error code the server sends:
//   P1 a known code with a fix the admin can act on (auth_failed, not_found, ...)
//   P2 a known code with no fix to offer (unsupported)
//   P3 no code at all: null, undefined, or "" (the server before SCRUM-133)
//   P4 a code this client does not know yet (a newer server)
describe("describeConnectionFailure", () => {
  // P1
  it("says access was denied and points at the Kredensial field when the key is rejected", () => {
    expect(describeConnectionFailure("auth_failed")).toEqual({
      title: "Akses ditolak karena API key tidak valid atau sudah tidak berlaku.",
      hint: "Salin ulang API key dari akun penyedia, lalu tempel di kolom Kredensial lewat tombol Ubah.",
    });
  });

  it("uses the familiar 'not found' wording for a wrong address or model", () => {
    expect(describeConnectionFailure("not_found")).toEqual({
      title: "Alamat atau nama model tidak ditemukan.",
      hint: "Cek lagi URL endpoint dan nama model; keduanya harus sama persis dengan dokumentasi penyedia.",
    });
  });

  it("tells the admin when the problem is on the provider's side, not in the form", () => {
    expect(describeConnectionFailure("provider_error")).toEqual({
      title: "Server penyedia sedang mengalami gangguan.",
      hint: "Masalahnya ada di pihak penyedia, bukan di isian Anda. Coba lagi beberapa menit lagi.",
    });
  });

  it("uses the familiar 'too many requests' wording and mentions the quota", () => {
    const { title, hint } = describeConnectionFailure("rate_limited");
    expect(title).toBe("Terlalu banyak permintaan, atau kuota akun sudah habis.");
    expect(hint).toMatch(/kuota/);
  });

  it("calls a timeout 'waktu habis', keeps the 15 second limit, and points at the URL", () => {
    expect(describeConnectionFailure("timeout")).toEqual({
      title: "Waktu habis, penyedia tidak menjawab dalam 15 detik.",
      hint: "Coba lagi. Periksa kembali URL endpoint.",
    });
  });

  it("uses the familiar 'cannot be reached' wording when the server does not answer at all", () => {
    expect(describeConnectionFailure("unreachable").title).toBe("Server penyedia tidak dapat dijangkau.");
  });

  it("names the Jenis API field when the reply has the wrong format", () => {
    expect(describeConnectionFailure("invalid_response").hint).toMatch(/Jenis API/);
  });

  it("has a title and hint for every known code, with no raw English left", () => {
    for (const code of CONNECTION_ERROR_CODES) {
      const { title, hint } = describeConnectionFailure(code);
      expect(title).not.toMatch(/provider|connection|failed/i);
      expect(title.endsWith(".")).toBe(true);
      if (hint !== null) expect(hint.endsWith(".")).toBe(true);
    }
  });

  // P2
  it("has no hint for a provider type that cannot be tested yet", () => {
    expect(describeConnectionFailure("unsupported")).toEqual({
      title: "Uji koneksi belum tersedia untuk jenis API ini.",
      hint: null,
    });
  });

  // P3 and P4 share the fallback, so the admin always gets a readable reason.
  it.each([null, undefined, "", "SOMETHING_NEW"])("falls back to the generic message for %j", (code) => {
    expect(describeConnectionFailure(code)).toEqual({
      title: "Uji koneksi gagal karena sebab yang belum kami kenali.",
      hint: "Buka Lihat detail untuk melihat pesan asli dari penyedia.",
    });
  });
});
