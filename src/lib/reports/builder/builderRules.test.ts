import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import { allowedScoreScopes, canChooseProductLabel } from "./builderRules";

describe("allowedScoreScopes", () => {
  // Positive: AC14, Admin and Developer AI may build reports with dev scores.
  it.each(["admin", "developer_ai"] as const)(
    "offers Test, Dev and Dev + Test to %s",
    (role) => {
      // Arrange / Act
      const scopes = allowedScoreScopes(role);

      // Assert
      expect(scopes).toEqual(["test", "dev", "dev_test"]);
    },
  );

  // Negative: AC7 and AC14, Viewer and Contributor only get Test scores. Offering
  // more would only end in a 403 REPORT_SCOPE_FORBIDDEN from the server.
  it.each(["viewer", "contributor"] as const)("offers only Test to %s", (role) => {
    // Arrange / Act
    const scopes = allowedScoreScopes(role);

    // Assert
    expect(scopes).toEqual(["test"]);
  });

  // Edge: before the session is known (role null) nothing may be offered, otherwise a
  // logged-out render would briefly show the dev options.
  it("offers nothing while the role is not known yet", () => {
    // Arrange / Act
    const scopes = allowedScoreScopes(null);

    // Assert
    expect(scopes).toEqual([]);
  });

  // Edge: Test is always first, so it is the default choice for every role.
  it.each(["admin", "developer_ai", "viewer", "contributor"] as const)(
    "puts Test first for %s",
    (role) => {
      // Arrange / Act
      const [first] = allowedScoreScopes(role);

      // Assert
      expect(first).toBe("test");
    },
  );
});

describe("canChooseProductLabel", () => {
  // Positive: AC9, only Admin decides between real names and codes.
  it("lets an admin choose the product label", () => {
    // Arrange / Act
    const allowed = canChooseProductLabel("admin");

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: anyone else would get 403 REPORT_LABEL_MODE_FORBIDDEN, Developer AI included.
  it.each<Role | null>(["developer_ai", "viewer", "contributor", null])(
    "hides the label choice from %s",
    (role) => {
      // Arrange / Act
      const allowed = canChooseProductLabel(role);

      // Assert
      expect(allowed).toBe(false);
    },
  );
});
