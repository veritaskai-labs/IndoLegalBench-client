import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SplitTagBadge } from "./SplitTagBadge";

describe("SplitTagBadge", () => {
  // Positive
  it.each([
    ["dev", "Dev"],
    ["test", "Test"],
  ] as const)("shows the %s tag as %s", (tag, label) => {
    // Act
    render(<SplitTagBadge tag={tag} />);

    // Assert
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("info saja")).not.toBeInTheDocument();
  });

  it("marks the tag as information only on the review page (PBI-9 AC2)", () => {
    // Act
    render(<SplitTagBadge tag="test" infoOnly />);

    // Assert
    expect(screen.getByText("info saja")).toBeInTheDocument();
    expect(screen.getByLabelText("Tag Test, hanya informasi dan tidak dinilai")).toBeInTheDocument();
  });

  it("shows that a test case was once in the dev set (PBI-9 AC3)", () => {
    // Act
    render(<SplitTagBadge tag="test" wasDev />);

    // Assert
    expect(screen.getByText("pernah dev")).toBeInTheDocument();
  });

  // Edge
  it("does not repeat the marker while the case is dev again", () => {
    // Act
    render(<SplitTagBadge tag="dev" wasDev />);

    // Assert
    expect(screen.queryByText("pernah dev")).not.toBeInTheDocument();
  });
});
