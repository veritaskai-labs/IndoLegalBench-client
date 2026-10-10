import { describe, expect, it } from "vitest";
import { makeSummary } from "@/test/versionFixtures";
import { isCaseCreator } from "./versionCreator";

const author = (id: string) => ({ id, name: `User ${id}` });

describe("isCaseCreator", () => {
  // Positive: the server stores the case creator as the author of version 1.
  it("is true when the user wrote version 1", () => {
    // Arrange
    const versions = [makeSummary(1, { author: author("u1") }), makeSummary(2, { author: author("u1") })];

    // Act
    const creator = isCaseCreator(versions, "u1");

    // Assert
    expect(creator).toBe(true);
  });

  it("stays true when later versions were written by someone else", () => {
    // Arrange
    const versions = [makeSummary(2, { author: author("u2") }), makeSummary(1, { author: author("u1") })];

    // Act
    const creator = isCaseCreator(versions, "u1");

    // Assert
    expect(creator).toBe(true);
  });

  // Negative: writing a later version does not make someone the creator.
  it("is false when the user only wrote a later version", () => {
    // Arrange
    const versions = [makeSummary(1, { author: author("u2") }), makeSummary(2, { author: author("u1") })];

    // Act
    const creator = isCaseCreator(versions, "u1");

    // Assert
    expect(creator).toBe(false);
  });

  // Edge: no history, or a list without version 1.
  it("is false for an empty history", () => {
    // Arrange / Act
    const creator = isCaseCreator([], "u1");

    // Assert
    expect(creator).toBe(false);
  });

  it("is false when version 1 is missing from the list", () => {
    // Arrange
    const versions = [makeSummary(2, { author: author("u1") })];

    // Act
    const creator = isCaseCreator(versions, "u1");

    // Assert
    expect(creator).toBe(false);
  });
});
