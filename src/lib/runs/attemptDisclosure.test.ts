import { describe, expect, it } from "vitest";

import { isExpandedByDefault } from "./attemptDisclosure";

describe("isExpandedByDefault (SCRUM-292)", () => {
  // Positive
  it("opens the attempt when the case has only one attempt", () => {
    // Arrange
    const attemptCount = 1;

    // Act
    const expanded = isExpandedByDefault(attemptCount);

    // Assert
    expect(expanded).toBe(true);
  });

  // Negative
  it.each([2, 3, 5])("keeps attempts closed when the case has %i attempts", (attemptCount) => {
    // Act
    const expanded = isExpandedByDefault(attemptCount);

    // Assert
    expect(expanded).toBe(false);
  });

  // Edge
  it("keeps closed when there are no attempts", () => {
    // Act
    const expanded = isExpandedByDefault(0);

    // Assert
    expect(expanded).toBe(false);
  });
});
