import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Spy yang membungkus komponen asli, supaya terhitung berapa kali markdown diparse.
const parse = vi.hoisted(() => vi.fn());

vi.mock("react-markdown", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-markdown")>();
  return {
    ...original,
    default: (props: Parameters<typeof original.default>[0]) => {
      parse(props.children);
      return original.default(props);
    },
  };
});

import { MarkdownAnswer } from "./MarkdownAnswer";

describe("MarkdownAnswer re-render cost (halaman polling tiap 5 detik)", () => {
  beforeEach(() => parse.mockClear());

  it("does not parse again when it re-renders with the same source", () => {
    // Arrange
    const { rerender } = render(<MarkdownAnswer source="## Judul" />);

    // Act
    rerender(<MarkdownAnswer source="## Judul" />);

    // Assert
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("parses again when the source changes", () => {
    // Arrange
    const { rerender } = render(<MarkdownAnswer source="## Judul" />);

    // Act
    rerender(<MarkdownAnswer source="## Judul baru" />);

    // Assert
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse).toHaveBeenLastCalledWith("## Judul baru");
  });
});
