import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SEARCH_DEBOUNCE_MS, SEARCH_MAX_CHARS, SEARCH_MIN_CHARS, normaliseQuery } from "./searchQuery";

type Param = { name: string; schema?: { minLength?: number; maxLength?: number } };
type Kontrak = { paths?: Record<string, { get?: { parameters?: Param[] } }> };

/** Batas panjang q dibaca dari kontrak, bukan dari konstanta yang sedang diuji (E92). */
function batasDariKontrak(): { min: number; max: number } {
  const kontrak = JSON.parse(readFileSync(resolve(process.cwd(), "contract/openapi.json"), "utf8")) as Kontrak;
  const q = kontrak.paths?.["/search"]?.get?.parameters?.find((p) => p.name === "q")?.schema;
  if (q?.minLength === undefined || q.maxLength === undefined) {
    throw new Error("Parameter q GET /search tidak ada di contract/openapi.json. Jalankan npm run gen:api.");
  }
  return { min: q.minLength, max: q.maxLength };
}

const { min: KONTRAK_MIN, max: KONTRAK_MAX } = batasDariKontrak();

describe("normaliseQuery (SCRUM-352)", () => {
  it("sends a normal keyword trimmed at both ends", () => {
    expect(normaliseQuery("  pidana \n")).toEqual({ kind: "ok", q: "pidana" });
  });

  it("keeps spaces inside the keyword", () => {
    expect(normaliseQuery("pencurian  ringan")).toEqual({ kind: "ok", q: "pencurian  ringan" });
  });

  it.each(["", "   ", "\t\n "])("treats %j as empty, so nothing is sent", (raw) => {
    expect(normaliseQuery(raw)).toEqual({ kind: "empty" });
  });

  it("waits for a second character before sending", () => {
    expect(normaliseQuery("a")).toEqual({ kind: "tooShort" });
    expect(normaliseQuery(" a ")).toEqual({ kind: "tooShort" });
    expect(normaliseQuery("ab")).toEqual({ kind: "ok", q: "ab" });
  });

  it("sends exactly the contract maximum and refuses one more", () => {
    expect(normaliseQuery("x".repeat(KONTRAK_MAX))).toEqual({ kind: "ok", q: "x".repeat(KONTRAK_MAX) });
    expect(normaliseQuery("x".repeat(KONTRAK_MAX + 1))).toEqual({ kind: "tooLong" });
  });

  it("trims before counting, like the server", () => {
    const q = "x".repeat(KONTRAK_MAX);
    expect(normaliseQuery(`   ${q}   `)).toEqual({ kind: "ok", q });
  });

  it("counts characters the way the server does, not UTF-16 units", () => {
    // Satu emoji = 1 karakter di Python tetapi 2 unit di String.length JavaScript.
    const q = "🙂".repeat(KONTRAK_MAX);
    expect(normaliseQuery(q)).toEqual({ kind: "ok", q });
    expect(normaliseQuery(`${q}🙂`)).toEqual({ kind: "tooLong" });
  });
});

describe("search limits", () => {
  it("keeps the client maximum equal to the contract", () => {
    expect(SEARCH_MAX_CHARS).toBe(KONTRAK_MAX);
  });

  it("never sends less than the contract allows", () => {
    expect(SEARCH_MIN_CHARS).toBeGreaterThanOrEqual(KONTRAK_MIN);
    expect(SEARCH_MIN_CHARS).toBe(2);
  });

  it("waits 300 ms after the last keystroke", () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });
});
