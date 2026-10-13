import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import { canCreateSnapshot } from "./permissions";

describe("canCreateSnapshot", () => {
  // Positive
  it("lets the admin create a snapshot", () => {
    // Arrange / Act
    const allowed = canCreateSnapshot("admin");

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: AC5, Viewer only looks.
  it.each(["author", "reviewer", "viewer"] as const)("does not offer the button to the %s", (role) => {
    // Arrange / Act
    const allowed = canCreateSnapshot(role);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: the session is still loading or has ended.
  it("does not offer the button when the role is unknown", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = canCreateSnapshot(role);

    // Assert
    expect(allowed).toBe(false);
  });
});
