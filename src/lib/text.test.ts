import { describe, expect, it } from "vitest";

import { nonBlankText } from "./text";

describe("nonBlankText", () => {
  it("keeps text, without the spaces around it", () => {
    expect(nonBlankText("  Uji Coba  ")).toBe("Uji Coba");
  });

  it.each([null, undefined, "", "   ", "\n\t"])("reads %j as no text", (text) => {
    expect(nonBlankText(text)).toBeNull();
  });
});
