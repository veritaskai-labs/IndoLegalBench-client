import { describe, expect, it } from "vitest";

import { formatScore } from "./scoreFormat";

// PBI-14 AC3: a score shows as a decimal with two digits after the comma, never as a percent or "X dari N".
// The server sends Decimal as a string ("3.75"), so the client formats the text itself and never goes through a float.
describe("formatScore (PBI-14 AC3)", () => {
  it.each([
    ["3.75", "3,75"],
    ["4", "4,00"],
    ["3.5", "3,50"],
    ["0", "0,00"],
    ["0.00", "0,00"],
    ["5.00", "5,00"],
  ])("shows %s as %s", (value, shown) => {
    expect(formatScore(value)).toBe(shown);
  });

  // Edge: the server already rounds with ROUND_HALF_UP; if a longer value ever arrives, round the same way.
  // 1.005 is the case a float gets wrong: Number("1.005").toFixed(2) gives "1.00".
  it.each([
    ["1.005", "1,01"],
    ["3.745", "3,75"],
    ["3.744", "3,74"],
  ])("rounds %s half up to %s like the server", (value, shown) => {
    expect(formatScore(value)).toBe(shown);
  });

  // null means not scored: a technical disruption, a masked test case, or a path with no score yet.
  it.each([null, undefined])("shows a dash for %s", (value) => {
    expect(formatScore(value)).toBe("–");
  });

  // Negative: text that is not a number shows a dash instead of "NaN".
  it.each(["", "  ", "abc", "3,75", "1e2", "NaN"])("shows a dash for the malformed value %j", (value) => {
    expect(formatScore(value)).toBe("–");
  });
});
