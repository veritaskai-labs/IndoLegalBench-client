import { describe, expect, it } from "vitest";

import { eligibleSession } from "@/test/reportFixtures";

import { productOptions, searchSessions, type SessionSearch } from "./sessionSearch";

// SCRUM-365 (PBI-15 AC1, AC4, AC5): the session field of the report builder gets a search bar, "Valid" and
// "Tidak valid" tabs, and a product filter that takes more than one product. The search follows the server rule
// of SCRUM-361 (#159 EligibleSessionQuery): session name, session id or product name, case-insensitive, blank
// means no search. "Valid" is the server's eligible flag, nothing is decided again here.
// Label: Positif = normal path, Negatif = must be left out, Edge = boundary data.

const aiyuOct = eligibleSession({ session_id: "s-aiyu-oct", label: "Oktober", product_id: "p-aiyu", product_name: "AiYU" });
const aiyuNov = eligibleSession({
  session_id: "s-aiyu-nov",
  label: "November",
  product_id: "p-aiyu",
  product_name: "AiYU",
  session_type: "manual",
});
const gemini = eligibleSession({ session_id: "s-gemini", label: "Putaran 1", product_id: "p-gemini", product_name: "Gemini" });
const deepseekBroken = eligibleSession({
  session_id: "s-deepseek",
  label: "Oktober",
  product_id: "p-deepseek",
  product_name: "DeepSeek",
  eligible: false,
  reasons: [{ code: "SESSION_NOT_COMPLETED", message: "Sesi belum selesai." }],
});
const ALL = [aiyuOct, aiyuNov, gemini, deepseekBroken];

const NO_SEARCH: SessionSearch = { measurement: "all", query: "", tab: "valid", productIds: [] };
const ids = (search: Partial<SessionSearch>) =>
  searchSessions(ALL, { ...NO_SEARCH, ...search }).shown.map((s) => s.session_id);

describe("searchSessions: tabs", () => {
  it("Positif: the Valid tab shows only eligible sessions and the other tab only the rest", () => {
    expect(ids({ tab: "valid" })).toEqual(["s-aiyu-oct", "s-aiyu-nov", "s-gemini"]);
    expect(ids({ tab: "invalid" })).toEqual(["s-deepseek"]);
  });

  // The counts are shown on the tabs, so a user searching on one tab sees that the other tab has hits too.
  it("Positif: counts both tabs after the search and the filters", () => {
    expect(searchSessions(ALL, { ...NO_SEARCH, query: "oktober" }).counts).toEqual({ valid: 1, invalid: 1 });
  });
});

describe("searchSessions: search bar", () => {
  it.each([
    // Positif: each field the server searches.
    ["session name", "novem", ["s-aiyu-nov"]],
    ["product name", "gemini", ["s-gemini"]],
    ["session id", "S-AIYU-OCT", ["s-aiyu-oct"]],
    // Positif: case and spaces around the text do not matter.
    ["mixed case and spaces", "  aIyU ", ["s-aiyu-oct", "s-aiyu-nov"]],
  ])("Positif: finds a session by %s", (_field, query, expected) => {
    expect(ids({ query })).toEqual(expected);
  });

  it("Negatif: leaves out every session that does not match", () => {
    expect(ids({ query: "claude" })).toEqual([]);
  });

  // Edge: same as the server, % and _ are plain text and not wildcards.
  it("Edge: treats % and _ as plain text", () => {
    expect(ids({ query: "%" })).toEqual([]);
    expect(ids({ query: "_" })).toEqual([]);
  });

  it("Edge: a blank search shows everything", () => {
    expect(ids({ query: "   " })).toEqual(["s-aiyu-oct", "s-aiyu-nov", "s-gemini"]);
  });
});

describe("searchSessions: product filter and measurement filter", () => {
  it("Positif: keeps the sessions of any chosen product", () => {
    expect(ids({ productIds: ["p-aiyu", "p-gemini"] })).toEqual(["s-aiyu-oct", "s-aiyu-nov", "s-gemini"]);
    expect(ids({ productIds: ["p-gemini"] })).toEqual(["s-gemini"]);
  });

  // The existing automatic/manual filter (AC5) stays and combines with the new ones with AND.
  it("Positif: combines the measurement filter, the search, the tab and the products", () => {
    expect(ids({ measurement: "manual", query: "aiyu", productIds: ["p-aiyu"] })).toEqual(["s-aiyu-nov"]);
    expect(ids({ measurement: "automatic", query: "aiyu", productIds: ["p-gemini"] })).toEqual([]);
  });

  // Edge: a product id that no longer has sessions (list reloaded) simply finds nothing, it is not an error.
  it("Edge: a chosen product without sessions shows nothing", () => {
    expect(ids({ productIds: ["p-gone"] })).toEqual([]);
  });
});

describe("productOptions", () => {
  // The dropdown lists each product once, by name, valid or not, so the filter works on both tabs.
  it("Positif: lists each product once, sorted by name", () => {
    expect(productOptions(ALL)).toEqual([
      { id: "p-aiyu", name: "AiYU" },
      { id: "p-deepseek", name: "DeepSeek" },
      { id: "p-gemini", name: "Gemini" },
    ]);
  });

  it("Edge: an empty list has no products", () => {
    expect(productOptions([])).toEqual([]);
  });
});
