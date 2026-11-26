import { describe, expect, it } from "vitest";

import { axisTicks, toNumber } from "./reportChart";

// K7 / D1: only plain decimal text from the server is a score; anything else is "no score", never 0.
describe("toNumber", () => {
  it.each([
    ["0.91", 0.91],
    ["1", 1],
    ["-0.5", -0.5],
    ["1.00", 1],
  ])("reads %j as a number", (text, value) => {
    expect(toNumber(text)).toBe(value);
  });

  it.each([null, "", "n/a", "1,00", "1e3", " 0.5"])("reads %j as no score", (text) => {
    expect(toNumber(text)).toBeNull();
  });
});

describe("axisTicks", () => {
  it("splits a scale of 1 into quarters as decimal text for formatScore", () => {
    expect(axisTicks(1)).toEqual(["0.00", "0.25", "0.50", "0.75", "1.00"]);
  });

  it("follows a stretched scale", () => {
    expect(axisTicks(1.2)).toEqual(["0.00", "0.30", "0.60", "0.90", "1.20"]);
  });
});
