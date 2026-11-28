import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyExampleButton } from "./CopyExampleButton";

const EXAMPLE = '["frasa pertama", "frasa kedua"]';

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: writeText ? { writeText } : undefined, configurable: true });
}

afterEach(() => {
  stubClipboard(undefined);
});

describe("CopyExampleButton (SCRUM-380, contoh yang bisa disalin)", () => {
  // Positive: the button names its field and copies the example exactly as written.
  it("copies the example text and confirms it", async () => {
    // Arrange
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<CopyExampleButton fieldName="must_contain" text={EXAMPLE} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Salin contoh must_contain" }));

    // Assert
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(EXAMPLE);
    expect(screen.getByRole("button", { name: "Salin contoh must_contain" })).toHaveTextContent("Tersalin");
  });

  // Negative: the browser refuses (or has no clipboard); the user is told to copy by hand instead of seeing a crash.
  it("tells the user to copy by hand when the clipboard is refused", async () => {
    // Arrange
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<CopyExampleButton fieldName="legal_refs" text={EXAMPLE} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Salin contoh legal_refs" }));

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Gagal menyalin. Pilih contoh lalu salin manual.");
    expect(screen.getByRole("button", { name: "Salin contoh legal_refs" })).not.toHaveTextContent("Tersalin");
  });

  // Edge: no clipboard at all (insecure http context) is the same failure, not an exception.
  it("reports failure when the clipboard API is missing", async () => {
    // Arrange
    stubClipboard(undefined);
    render(<CopyExampleButton fieldName="legal_refs" text={EXAMPLE} />);

    // Act
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Salin contoh legal_refs" }));
    });

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Gagal menyalin");
  });

  // Edge: before any click there is no message and the label is the call to action.
  it("starts with the copy label and no message", () => {
    // Arrange / Act
    render(<CopyExampleButton fieldName="must_not_contain" text={EXAMPLE} />);

    // Assert
    expect(screen.getByRole("button", { name: "Salin contoh must_not_contain" })).toHaveTextContent("Salin");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
