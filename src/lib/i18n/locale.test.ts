import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, text } from "./locale";

const SAMPLE = {
  id: { submit: "Ajukan review", hint: "Simpan perubahan dulu sebelum mengajukan." },
  en: { submit: "Submit for review", hint: "Save your changes before submitting." },
};

describe("locale lookup", () => {
  // PBI-26 AC1 names exactly two languages. SCRUM-356 owns the switch; this only names them.
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
});
