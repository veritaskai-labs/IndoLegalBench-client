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

describe("stripBlank matches the server list", () => {
  // Edge: one row per character of BLANK_CHARS in the server's app/shared/text.py, written
  // as code points. If one character is missing here, a title of only that character
  // passes the form and fails with a 422.
  const serverBlankCodePoints = [
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x85, 0xa0, 0x1680, 0x2000,
    0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028,
    0x2029, 0x202f, 0x205f, 0x3000, 0x180e, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
  ];

  it.each(serverBlankCodePoints.map((cp) => [cp.toString(16).padStart(4, "0"), cp]))(
    "removes U+%s",
    (_hex, cp) => {
      // Arrange
      const char = String.fromCodePoint(cp);

      // Act
      const stripped = stripBlank(`${char}x${char}`);

      // Assert
      expect(stripped).toBe("x");
    },
  );

  // Negative: a visible character next to the list must stay (no over-stripping).
  it.each(["_", "-", ".", "0"])("keeps %j", (char) => {
    // Arrange / Act
    const stripped = stripBlank(char);

    // Assert
    expect(stripped).toBe(char);
  });
});
