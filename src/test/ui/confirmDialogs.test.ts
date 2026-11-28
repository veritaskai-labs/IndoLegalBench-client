import { describe, expect, it } from "vitest";
import { fileOf, filesWith, sourceFiles, violations } from "@/test/sourceFiles";

const NATIVE_DIALOG = /(?<![\w.$])(?<!function\s+)(?:window\.)?(?:confirm|alert|prompt)\(/;

// Reported bugs. Delete the entry once its fix lands; the last test fails until you do.
const KNOWN: Record<string, string> = {
  "src/app/(protected)/cases/[id]/edit/page.tsx": "SCRUM-?",
  "src/app/(protected)/suites/[id]/cases/new/page.tsx": "SCRUM-?",
};

const found = violations(sourceFiles("src"), (line) => NATIVE_DIALOG.test(line));

describe("konfirmasi memakai dialog yang seragam (PBI-25 AC2)", () => {
  it("tidak memakai confirm, alert, atau prompt bawaan browser", () => {
    expect(found.filter((hit) => !(fileOf(hit) in KNOWN))).toEqual([]);
  });

  it("daftar bug yang diketahui masih akurat", () => {
    expect(filesWith(found)).toEqual(new Set(Object.keys(KNOWN)));
  });
});
