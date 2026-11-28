import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles, violations } from "@/test/sourceFiles";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const DARK_COLOR_SCHEME = /color-?scheme["']?\s*:\s*["']?[^;"'\n]*\bdark\b/i;
const SETS_DARK_CLASS = /classList\.(?:add|toggle)\(\s*["']dark["']|<html[^>]*className=["'{][^>]*\bdark\b(?!:)/;

describe("tidak ada mode gelap (PBI-25 AC5)", () => {
  it("varian dark: hanya aktif lewat kelas .dark, bukan preferensi OS", () => {
    expect(css).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
    expect(css).not.toMatch(DARK_COLOR_SCHEME);
  });

  it("tidak ada kode yang memasang kelas dark atau color-scheme gelap", () => {
    const found = violations(sourceFiles("src"), (line) => SETS_DARK_CLASS.test(line) || DARK_COLOR_SCHEME.test(line));

    expect(found).toEqual([]);
  });
});
