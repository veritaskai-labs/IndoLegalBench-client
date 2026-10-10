import { describe, expect, it } from "vitest";
import { CONNECTION_ERROR_CATEGORIES, describeConnectionFailure } from "./connectionMessage";

/** Partisi ruang input: satu describe per kelas kategori milik server. */
describe("describeConnectionFailure", () => {
  describe("kategori yang bisa ditindaklanjuti Admin", () => {
    it("names the Kredensial field when the key is rejected", () => {
      expect(describeConnectionFailure("access_denied")).toEqual({
        title: "Akses ditolak karena API key tidak valid atau sudah tidak berlaku.",
        hint: "Salin ulang API key dari akun penyedia, lalu tempel di kolom Kredensial lewat tombol Ubah.",
      });
    });

    it("uses the familiar 'not found' wording for a wrong address or model", () => {
      expect(describeConnectionFailure("model_not_found")).toEqual({
        title: "Alamat atau nama model tidak ditemukan.",
        hint: "Cek lagi URL endpoint dan nama model; keduanya harus sama persis dengan dokumentasi penyedia.",
      });
    });

    it("calls a timeout 'waktu habis' and keeps the 15 second limit", () => {
      expect(describeConnectionFailure("timeout")).toEqual({
        title: "Waktu habis, penyedia tidak menjawab dalam 15 detik.",
        hint: "Coba lagi. Periksa kembali URL endpoint.",
      });
    });

    it("says 'tidak dapat dijangkau' when the server never answers", () => {
      expect(describeConnectionFailure("unreachable")).toEqual({
        title: "Server penyedia tidak dapat dijangkau.",
        hint: "Periksa ejaan URL endpoint, termasuk awalan https://.",
      });
    });
  });

  describe("kategori yang server sendiri tidak bisa pastikan", () => {
    it("admits it and names the two usual causes behind unknown", () => {
      // Server melipat 429 dan 5xx ke unknown, lihat classify_error.
      const { title, hint } = describeConnectionFailure("unknown");

      expect(title).toBe("Uji koneksi gagal. Penyedia tidak memberi alasan yang bisa dikenali.");
      expect(hint).toMatch(/kuota/);
      expect(hint).toMatch(/Lihat detail/);
    });
  });

  describe("tanpa kategori, atau kategori yang belum dikenali klien", () => {
    const bukanKategori = [null, undefined, "", "SOMETHING_NEW", "toString", "constructor"];

    it.each(bukanKategori)("falls back for %j", (code) => {
      expect(describeConnectionFailure(code)).toEqual({
        title: "Uji koneksi gagal dengan kode yang belum dikenali aplikasi ini.",
        hint: "Buka Lihat detail untuk pesan asli dari penyedia.",
      });
    });
  });

  it("has a title and hint for every category, with no raw English left", () => {
    for (const code of CONNECTION_ERROR_CATEGORIES) {
      const { title, hint } = describeConnectionFailure(code);

      expect(title).not.toMatch(/provider|connection|failed/i);
      expect(title.endsWith(".")).toBe(true);
      if (hint !== null) expect(hint.endsWith(".")).toBe(true);
    }
  });

  it("handles exactly the five categories the server sends, no leftovers", () => {
    expect([...CONNECTION_ERROR_CATEGORIES].sort()).toEqual([
      "access_denied",
      "model_not_found",
      "timeout",
      "unknown",
      "unreachable",
    ]);
  });
});
