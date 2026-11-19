import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import {
  allowedScoreScopes,
  canChooseProductLabel,
  normalizeChoices,
  REPORT_TITLE_MAX,
  titleProblem,
} from "./builderRules";

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

describe("titleProblem", () => {
  const smile = String.fromCodePoint(0x1f600);
  const zeroWidthSpace = String.fromCodePoint(0x200b);

  // Positive: a normal title is fine.
  it("accepts a normal title", () => {
    // Arrange / Act
    const problem = titleProblem("Perbandingan Oktober 2026");

    // Assert
    expect(problem).toBeNull();
  });

  // Negative: the server answers 422 for these, so the form must stop them first.
  it.each([
    ["empty", ""],
    ["spaces only", "    "],
    ["zero-width spaces only", `${zeroWidthSpace}${zeroWidthSpace}`],
  ])("asks for a title when it is %s", (_name, title) => {
    // Arrange / Act
    const problem = titleProblem(title);

    // Assert
    expect(problem).toBe("TITLE_REQUIRED");
  });

  // Edge: 200 is the server limit (ReportCreate max_length). 200 passes, 201 does not.
  it("accepts exactly the maximum length", () => {
    // Arrange
    const title = "a".repeat(REPORT_TITLE_MAX);

    // Act
    const problem = titleProblem(title);

    // Assert
    expect(REPORT_TITLE_MAX).toBe(200);
    expect(problem).toBeNull();
  });

  it("rejects one character over the maximum", () => {
    // Arrange
    const title = "a".repeat(REPORT_TITLE_MAX + 1);

    // Act
    const problem = titleProblem(title);

    // Assert
    expect(problem).toBe("TITLE_TOO_LONG");
  });

  // Edge: Python counts characters (code points), JavaScript .length counts UTF-16 units,
  // so an emoji is 1 for the server but 2 for .length. 200 emoji are allowed by the server;
  // counting with .length would wrongly block them.
  it("counts an emoji as one character, like the server", () => {
    // Arrange
    const title = smile.repeat(REPORT_TITLE_MAX);

    // Act
    const problem = titleProblem(title);

    // Assert
    expect(problem).toBeNull();
  });

  it("rejects 201 emoji", () => {
    // Arrange
    const title = smile.repeat(REPORT_TITLE_MAX + 1);

    // Act
    const problem = titleProblem(title);

    // Assert
    expect(problem).toBe("TITLE_TOO_LONG");
  });

  // Edge: the server strips the edges first, then checks the length, so spaces around a
  // 200-character title must not make it too long.
  it("does not count blank characters at the edges", () => {
    // Arrange
    const title = `   ${"a".repeat(REPORT_TITLE_MAX)}${zeroWidthSpace}  `;

    // Act
    const problem = titleProblem(title);

    // Assert
    expect(problem).toBeNull();
  });
});

describe("normalizeChoices", () => {
  // Positive: allowed choices stay as they are.
  it("keeps the choices an admin is allowed to make", () => {
    // Arrange
    const choices = { scoreScope: "dev_test", productLabelMode: "code" } as const;

    // Act
    const normalized = normalizeChoices("admin", choices);

    // Assert
    expect(normalized).toEqual(choices);
  });

  // Edge: the role can change while the form is open (login refresh, mock role). A Dev
  // choice left in state would be sent and end in 403 REPORT_SCOPE_FORBIDDEN, with no
  // option on screen to undo it.
  it.each(["viewer", "contributor"] as const)("moves %s back to Test scores", (role) => {
    // Arrange / Act
    const normalized = normalizeChoices(role, { scoreScope: "dev", productLabelMode: "real_name" });

    // Assert
    expect(normalized.scoreScope).toBe("test");
  });

  // Edge: same for the label, which only Admin may set (403 REPORT_LABEL_MODE_FORBIDDEN).
  it.each(["developer_ai", "viewer", "contributor"] as const)(
    "moves %s back to real product names",
    (role) => {
      // Arrange / Act
      const normalized = normalizeChoices(role, { scoreScope: "test", productLabelMode: "code" });

      // Assert
      expect(normalized.productLabelMode).toBe("real_name");
    },
  );

  // Positive: Developer AI keeps a dev score choice (AC14) while losing the code label (AC9).
  it("lets Developer AI keep Dev + Test but not code labels", () => {
    // Arrange / Act
    const normalized = normalizeChoices("developer_ai", {
      scoreScope: "dev_test",
      productLabelMode: "code",
    });

    // Assert
    expect(normalized).toEqual({ scoreScope: "dev_test", productLabelMode: "real_name" });
  });

  // Edge: role not known yet falls back to the safest choices.
  it("uses Test and real names while the role is not known", () => {
    // Arrange / Act
    const normalized = normalizeChoices(null, { scoreScope: "dev", productLabelMode: "code" });

    // Assert
    expect(normalized).toEqual({ scoreScope: "test", productLabelMode: "real_name" });
  });
});
