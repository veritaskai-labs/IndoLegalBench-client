import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { filesWith, sourceFiles, violations } from "@/test/sourceFiles";

const REMOVES_OUTLINE = /(?<![\w-])(?:focus:)?outline-(?:none|0|hidden)(?![\w-])/;
const REPLACEMENT_RING =
  /(?<![\w-])(?:focus|focus-visible|focus-within):(?:ring(?:-[1-8])?(?![\w-])|outline-(?:[1-8]|solid|dashed|dotted|double)(?![\w-])|shadow)/;

// Reported bugs. Delete the entry once its fix lands; the last test fails until you do.
const KNOWN: Record<string, string> = {
  "src/components/reports/trend/TrendFilters.tsx": "SCRUM-?",
  "src/components/runs/AcceptAsIsDialog.tsx": "SCRUM-?",
};

// shortcut: checks one line at a time, so a className split across lines is not seen; fine while classNames stay on one line.
const found = violations(sourceFiles("src"), (line) => REMOVES_OUTLINE.test(line) && !REPLACEMENT_RING.test(line));

describe("fokus keyboard selalu terlihat (PBI-25 AC5)", () => {
  it("globals.css memberi outline pada setiap elemen yang difokuskan lewat keyboard", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid/);
  });

  it("elemen yang menghapus outline wajib memberi ring atau outline pengganti saat fokus", () => {
    expect(found.filter((hit) => !filesWith([hit]).some((file) => file in KNOWN))).toEqual([]);
  });

  it("daftar bug yang diketahui masih akurat", () => {
    expect(filesWith(found)).toEqual(Object.keys(KNOWN).sort());
  });
});
