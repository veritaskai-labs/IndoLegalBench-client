import { describe, it, expect } from "vitest";
import { parseRole, isAuthErrorCode, isSessionExpiredCode, canViewDashboard, ROLE_HOME_PATH } from "./auth";

describe("parseRole", () => {
  it("returns the role for a known lowercase value", () => {
    expect(parseRole("contributor")).toBe("contributor");
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("viewer")).toBe("viewer");
    expect(parseRole("developer_ai")).toBe("developer_ai");
  });

  // PBI-24 AC1: the server no longer sends or accepts these, so a stale session must not
  // be treated as a signed-in user with a role the client has no menu or guard for.
  it("returns null for the retired author and reviewer roles", () => {
    expect(parseRole("author")).toBeNull();
    expect(parseRole("reviewer")).toBeNull();
  });

  it("returns null for uppercase input (regression test for the casing bug)", () => {
    expect(parseRole("CONTRIBUTOR")).toBeNull();
  });

  it("returns null for an unknown role string", () => {
    expect(parseRole("superadmin")).toBeNull();
  });

  it("returns null for a non-string value", () => {
    expect(parseRole(123)).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseRole(undefined)).toBeNull();
    expect(parseRole({})).toBeNull();
  });

  it("every role in ROLE_HOME_PATH resolves back through parseRole", () => {
    for (const role of Object.keys(ROLE_HOME_PATH)) {
      expect(parseRole(role)).toBe(role);
    }
  });
});

describe("isAuthErrorCode", () => {
  it("returns true for known auth error codes", () => {
    expect(isAuthErrorCode("USER_NOT_REGISTERED")).toBe(true);
    expect(isAuthErrorCode("USER_DEACTIVATED")).toBe(true);
  });

  it("returns false for an unrecognized code", () => {
    expect(isAuthErrorCode("SOME_RANDOM_CODE")).toBe(false);
  });

  it("returns false for a non-string value", () => {
    expect(isAuthErrorCode(null)).toBe(false);
    expect(isAuthErrorCode(undefined)).toBe(false);
    expect(isAuthErrorCode(42)).toBe(false);
  });
  
});

describe("isSessionExpiredCode", () => {
  it("returns true for the session-expired code", () => {
    expect(isSessionExpiredCode("SESSION_EXPIRED")).toBe(true);
  });

  it("returns false for other auth error codes", () => {
    expect(isSessionExpiredCode("USER_DEACTIVATED")).toBe(false);
  });

  it("returns false for non-string or unrelated values", () => {
    expect(isSessionExpiredCode(null)).toBe(false);
    expect(isSessionExpiredCode(undefined)).toBe(false);
    expect(isSessionExpiredCode("session_expired")).toBe(false); // strict casing
  });
});

describe("ROLE_HOME_PATH", () => {
  // Review #35 / PBI-19 AC1: dasbor adalah halaman awal setiap peran yang punya dasbor.
  it("sends everyone but the viewer to the dashboard after login", () => {
    expect(ROLE_HOME_PATH.contributor).toBe("/dashboard");
    expect(ROLE_HOME_PATH.admin).toBe("/dashboard");
    expect(ROLE_HOME_PATH.viewer).toBe("/reports");
  });

  it("has no entry left for the retired author and reviewer roles", () => {
    expect(Object.keys(ROLE_HOME_PATH)).not.toContain("author");
    expect(Object.keys(ROLE_HOME_PATH)).not.toContain("reviewer");
  });
  it("sends developer AI to the suites, since it has no dashboard (SCRUM-184)", () => {
    expect(ROLE_HOME_PATH.developer_ai).toBe("/suites");
  });
});

describe("canViewDashboard", () => {
  // Positive: the roles the server answers 200 to on /dashboard.
  it.each(["contributor", "admin"] as const)("is true for the %s role", (role) => {
    // Arrange / Act
    const allowed = canViewDashboard(role);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: the server answers 403 here, which would send the user to /forbidden.
  it.each(["viewer", "developer_ai"] as const)("is false for the %s role", (role) => {
    // Arrange / Act
    const allowed = canViewDashboard(role);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: no session yet.
  it("is false while there is no session", () => {
    // Arrange / Act
    const allowed = canViewDashboard(null);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: the login landing page and the dashboard access must not drift apart.
  it("agrees with ROLE_HOME_PATH: every role that lands on /dashboard can open it", () => {
    const landingOnDashboard = Object.entries(ROLE_HOME_PATH)
      .filter(([, path]) => path === "/dashboard")
      .map(([role]) => role);

    expect(landingOnDashboard.length).toBeGreaterThan(0);
    for (const role of landingOnDashboard) {
      expect(canViewDashboard(role as Parameters<typeof canViewDashboard>[0])).toBe(true);
    }
  });
});
