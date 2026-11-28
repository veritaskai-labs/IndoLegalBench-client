import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, fill, isLocale, messages, text } from "./locale";

const SAMPLE = {
  id: { submit: "Ajukan review", hint: "Simpan perubahan dulu sebelum mengajukan." },
  en: { submit: "Submit for review", hint: "Save your changes before submitting." },
};

describe("locale lookup", () => {
  // Same two codes as GET /me language and PATCH /me/language (SCRUM-354). No third code, no "EN".
  it("offers Indonesian and English, and no other language", () => {
    expect(LOCALES).toEqual(["id", "en"]);
  });

  // The screens already speak Indonesian. English becomes the default only when SCRUM-356 lands.
  it("keeps Indonesian as the active language until the language switch exists", () => {
    expect(DEFAULT_LOCALE).toBe("id");
    expect(text(SAMPLE)).toEqual(SAMPLE.id);
  });

  it("returns the English copy when asked", () => {
    expect(text(SAMPLE, "en")).toEqual(SAMPLE.en);
  });

  // AC3: a catalog lookup cannot rewrite an author's sentence, because that sentence is not a key.
  it("does not translate a string that is not in the catalog", () => {
    const question = "Apakah perusahaan wajib membayar pesangon?";
    expect(text(SAMPLE, "en").submit).not.toBe(question);
    expect(JSON.stringify(text(SAMPLE, "en"))).not.toContain(question);
  });

  it("fills placeholders with data and leaves an unknown placeholder empty", () => {
    expect(fill("Versi {version} · {note}", { version: 2, note: "tetap berlaku" })).toBe(
      "Versi 2 · tetap berlaku",
    );
    expect(fill("Kasus {code}", {})).toBe("Kasus ");
  });

  it("accepts only the two language codes", () => {
    expect(isLocale("id")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("keeps a catalog whose two languages share a shape", () => {
    expect(messages(SAMPLE)).toBe(SAMPLE);
  });
});
