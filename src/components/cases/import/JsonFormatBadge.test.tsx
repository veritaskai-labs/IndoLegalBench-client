import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonFormatBadge } from "./JsonFormatBadge";

describe("JsonFormatBadge (SCRUM-380, sorotan Format JSON)", () => {
  // Positive: the label is text, so it does not rely on colour alone.
  it("shows the Format JSON label as text", () => {
    // Arrange / Act
    render(<JsonFormatBadge />);

    // Assert
    expect(screen.getByText("Format JSON")).toBeInTheDocument();
  });
});
