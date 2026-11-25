import { describe, expect, it } from "vitest";
import type { PickableSession } from "./builderTypes";
import { applyFilter, matchesFilter, toggleSession } from "./builderSelection";

function session(id: string, productId: string, overrides: Partial<PickableSession> = {}): PickableSession {
  return {
    session_id: id,
    product_id: productId,
    eligible: true,
    session_type: "automatic",
    judge_model_version: "judge-v1",
    ...overrides,
  };
}

const geminiOct = session("s-gemini-oct", "p-gemini");
const geminiNov = session("s-gemini-nov", "p-gemini");
const deepseek = session("s-deepseek", "p-deepseek");
const aiyu = session("s-aiyu", "p-aiyu");

const ids = (list: readonly PickableSession[]) => list.map((s) => s.session_id);

describe("toggleSession", () => {
  // Positive: picking adds the session at the end.
  it("adds a session that is not picked yet", () => {
    // Arrange / Act
    const picked = toggleSession([deepseek], geminiOct);

    // Assert
    expect(ids(picked)).toEqual(["s-deepseek", "s-gemini-oct"]);
  });

  // Positive: picking it again removes it.
  it("removes a session that is already picked", () => {
    // Arrange / Act
    const picked = toggleSession([deepseek, geminiOct], geminiOct);

    // Assert
    expect(ids(picked)).toEqual(["s-deepseek"]);
  });

  // Edge: one session per product (server DUPLICATE_PRODUCT, decided by product_id).
  // Picking another session of the same product swaps it in, so the user never gets a 409
  // for it, and the other products keep their order.
  it("swaps in another session of an already picked product", () => {
    // Arrange / Act
    const picked = toggleSession([geminiOct, deepseek], geminiNov);

    // Assert
    expect(ids(picked)).toEqual(["s-deepseek", "s-gemini-nov"]);
  });

  // Negative: an ineligible session can't be picked; its reasons are shown instead.
  it("ignores a session that is not eligible", () => {
    // Arrange
    const cancelled = session("s-cancelled", "p-legalhero", { eligible: false });

    // Act
    const picked = toggleSession([deepseek], cancelled);

    // Assert
    expect(ids(picked)).toEqual(["s-deepseek"]);
  });

  // Edge: a session that became ineligible after it was picked can still be removed,
  // otherwise it would be stuck in the selection.
  it("still removes a picked session that is no longer eligible", () => {
    // Arrange
    const nowIneligible = { ...deepseek, eligible: false };

    // Act
    const picked = toggleSession([deepseek, aiyu], nowIneligible);

    // Assert
    expect(ids(picked)).toEqual(["s-aiyu"]);
  });

  // Edge: AC1 says there is no limit on products.
  it("keeps every session when many products are picked", () => {
    // Arrange
    let picked: PickableSession[] = [];
    const many = Array.from({ length: 25 }, (_, i) => session(`s-${i}`, `p-${i}`));

    // Act
    for (const s of many) picked = toggleSession(picked, s);

    // Assert
    expect(picked).toHaveLength(25);
  });

  // Edge: React state must not be changed in place, or the page does not re-render.
  it("returns a new list and leaves the old one untouched", () => {
    // Arrange
    const before = [deepseek];

    // Act
    const after = toggleSession(before, aiyu);

    // Assert
    expect(after).not.toBe(before);
    expect(ids(before)).toEqual(["s-deepseek"]);
  });
});

describe("matchesFilter", () => {
  const manual = session("s-manual", "p-legalhero", { session_type: "manual" });

  // Positive: AC5, "all" shows both kinds together.
  it.each([geminiOct, manual])("shows every session for all", (s) => {
    // Arrange / Act
    const shown = matchesFilter(s, "all");

    // Assert
    expect(shown).toBe(true);
  });

  // Positive and negative: each kind filter keeps only its own kind.
  it.each([
    ["automatic", "automatic", true],
    ["automatic", "manual", false],
    ["manual", "manual", true],
    ["manual", "automatic", false],
  ] as const)("with filter %s, a %s session is shown: %s", (filter, kind, expected) => {
    // Arrange
    const s = session("s-x", "p-x", { session_type: kind });

    // Act
    const shown = matchesFilter(s, filter);

    // Assert
    expect(shown).toBe(expected);
  });
});

describe("applyFilter", () => {
  const manual = session("s-manual", "p-legalhero", { session_type: "manual" });

  // Edge: the server drops sessions outside measurement_filter without saying so. The page
  // drops them itself and tells the user which ones, so the report never silently has fewer
  // products than picked.
  it("splits the picked sessions into kept and dropped", () => {
    // Arrange / Act
    const { kept, dropped } = applyFilter([geminiOct, manual, deepseek], "automatic");

    // Assert
    expect(ids(kept)).toEqual(["s-gemini-oct", "s-deepseek"]);
    expect(ids(dropped)).toEqual(["s-manual"]);
  });

  // Positive: "all" drops nothing.
  it("keeps everything for all", () => {
    // Arrange / Act
    const { kept, dropped } = applyFilter([geminiOct, manual], "all");

    // Assert
    expect(ids(kept)).toEqual(["s-gemini-oct", "s-manual"]);
    expect(dropped).toEqual([]);
  });
});
