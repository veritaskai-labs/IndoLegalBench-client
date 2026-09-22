import { describe, it, expect } from "vitest";
import { parseRole, isAuthErrorCode, ROLE_HOME_PATH } from "./auth";

describe("parseRole", () => {
  it("returns the role for a known lowercase value", () => {
    expect(parseRole("author")).toBe("author");
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("reviewer")).toBe("reviewer");
    expect(parseRole("viewer")).toBe("viewer");
  });

  it("returns null for uppercase input (regression test for the casing bug)", () => {
    expect(parseRole("AUTHOR")).toBeNull();
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