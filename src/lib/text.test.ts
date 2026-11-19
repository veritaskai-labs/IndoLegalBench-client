import { describe, expect, it } from "vitest";

import { nonBlankText, stripBlank } from "./text";

describe("nonBlankText", () => {
  it("keeps text, without the spaces around it", () => {
    expect(nonBlankText("  Uji Coba  ")).toBe("Uji Coba");
  });

  it.each([null, undefined, "", "   ", "\n\t"])("reads %j as no text", (text) => {
    expect(nonBlankText(text)).toBeNull();
  });
});

describe("stripBlank", () => {
  // Positive: text in the middle stays as typed.
  it("removes blank characters only at both edges", () => {
    // Arrange / Act
    const stripped = stripBlank("  Laporan  Oktober \n");

    // Assert
    expect(stripped).toBe("Laporan  Oktober");
  });

  // Negative: these look empty on screen but JavaScript trim() keeps them, while the
  // server's strip_blank removes them and then rejects the text as blank (422).
  it.each([
    ["zero-width space", "\u200b"],
    ["zero-width non-joiner", "\u200c"],
    ["zero-width joiner", "\u200d"],
    ["word joiner", "\u2060"],
    ["mongolian vowel separator", "\u180e"],
    ["next line (NEL)", "\u0085"],
    ["file separator", "\u001c"],
    ["unit separator", "\u001f"],
  ])("removes a %s that trim() keeps", (_name, char) => {
    // Arrange / Act
    const stripped = stripBlank(`${char} ${char}`);

    // Assert
    expect(stripped).toBe("");
  });

  // Negative: whitespace trim() already knows still goes.
  it.each(["\u00a0", "\u3000", "\ufeff", "\u2028", "\t"])("removes %j", (char) => {
    // Arrange / Act
    const stripped = stripBlank(`${char}x${char}`);

    // Assert
    expect(stripped).toBe("x");
  });

  // Edge: a zero-width joiner inside an emoji sequence is part of the text, not blank.
  it("keeps a zero-width joiner inside the text", () => {
    // Arrange
    const family = "\u{1F468}\u200d\u{1F469}";

    // Act
    const stripped = stripBlank(` ${family} `);

    // Assert
    expect(stripped).toBe(family);
  });
});
