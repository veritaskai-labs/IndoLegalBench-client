import { describe, expect, it } from "vitest";
import { GENERIC_REASON, reasonText } from "./reasonText";

describe("reasonText", () => {
  // Positive: the 409 sends selection problems as codes only, so the page needs the words.
  it.each([
    ["NEED_AT_LEAST_TWO_PRODUCTS", "Pilih sesi dari minimal dua produk untuk dibandingkan."],
    ["DUPLICATE_PRODUCT", "Satu produk hanya boleh diwakili satu sesi dalam satu laporan."],
  ])("explains %s", (code, text) => {
    // Arrange / Act
    const shown = reasonText(code);

    // Assert
    expect(shown).toBe(text);
  });

  // Positive: same words as the server (comparison_rules _PESAN_TIDAK_LAYAK), so a reason
  // from eligible-sessions and the same reason from a 409 read identically.
  it.each([
    ["SESSION_NOT_FINISHED", "Sesi ini belum selesai, jadi belum bisa menjadi dasar laporan."],
    ["SESSION_CANCELLED", "Sesi ini dibatalkan. Lanjutkan sampai selesai dulu sebelum dipakai di laporan."],
    ["SESSION_RUN_FAILED", "Proses run sesi ini gagal. Perbaiki dulu, lalu run ulang."],
    ["SESSION_NOT_ACCEPTED_AS_IS", "Sesi ini selesai dengan kegagalan dan belum diterima apa adanya oleh Admin."],
    ["SESSION_NOT_GRADED", "Sesi ini belum dinilai, jadi belum punya skor untuk dilaporkan."],
  ])("explains %s with the server's words", (code, text) => {
    // Arrange / Act
    const shown = reasonText(code);

    // Assert
    expect(shown).toBe(text);
  });

  // Edge: a code the server adds later must still show something readable, never an empty
  // line or a raw code.
  it("falls back to a general line for an unknown code", () => {
    // Arrange / Act
    const shown = reasonText("SOMETHING_NEW");

    // Assert
    expect(shown).toBe(GENERIC_REASON);
    expect(GENERIC_REASON.trim()).not.toBe("");
  });

  // Edge: a code that matches an Object prototype name must not leak a function as text.
  it.each(["toString", "constructor", "__proto__"])("treats %s as unknown", (code) => {
    // Arrange / Act
    const shown = reasonText(code);

    // Assert
    expect(shown).toBe(GENERIC_REASON);
  });
});
