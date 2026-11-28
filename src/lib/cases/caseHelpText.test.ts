import { describe, expect, it } from "vitest";
import { CASE_HELP, caseHelp, casePlaceholder } from "./caseHelpText";

describe("caseHelp", () => {
  it("keeps the Indonesian help the editor already shows", () => {
    expect(caseHelp().pasal).toBe(CASE_HELP.pasal);
    expect(caseHelp().pasal).toBe("Nomor pasal, angka biasa atau Romawi, misalnya 156 atau II.");
  });

  it("explains the Pasal field in English and keeps the term Pasal", () => {
    expect(caseHelp("en").pasal).toBe("The Pasal number, ordinary or Roman numerals, for example 156 or II.");
  });
});

describe("casePlaceholder", () => {
  it("keeps an instruction placeholder's Indonesian wording", () => {
    expect(casePlaceholder().regulationType).toBe("Ketik untuk mencari, misalnya UU");
  });

  it("translates an instruction placeholder into English", () => {
    expect(casePlaceholder("en").regulationType).toBe("Type to search, for example UU");
    expect(casePlaceholder("en").pasal).toBe("156");
  });
});
