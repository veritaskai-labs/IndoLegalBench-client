import { BASE_URL } from "./apiClient";
import type { components } from "./generated/api";

export const LOGIN_URL = `${BASE_URL}/auth/login`;
export const LOGOUT_URL = `${BASE_URL}/auth/logout`;

/**
 * Halaman awal setelah login (PBI-19 AC1). Viewer tidak punya dasbor
 * — servernya menjawab 403 — jadi peran itu tetap mendarat di /reports.
 * Developer AI juga tanpa dasbor; yang boleh dibukanya hanya suite dan kasus dev (SCRUM-184).
 */
export const ROLE_HOME_PATH = {
  author: "/dashboard",
  admin: "/dashboard",
  reviewer: "/dashboard",
  viewer: "/reports",
  developer_ai: "/suites",
} as const;

export type Role = components["schemas"]["Role"];

/**
 * Strict on purpose: role values are lowercase ("author", "admin",
 * "reviewer", "viewer", "developer_ai"), as sent by the backend /me endpoint. Any other
 * casing or unknown value returns null.
 */
export function parseRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  return Object.keys(ROLE_HOME_PATH).includes(value) ? (value as Role) : null;
}

export const AUTH_ERROR_CODES = [
  "USER_NOT_REGISTERED",
  "USER_DEACTIVATED",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return (
    typeof value === "string" &&
    (AUTH_ERROR_CODES as readonly string[]).includes(value)
  );
}

// Session-expired is a redirect signal from a 401 response, not an
// account-state error handled by AUTH_ERROR_COPY, so it's kept separate
// from AuthErrorCode on purpose.
export const SESSION_EXPIRED_CODE = "SESSION_EXPIRED";

export function isSessionExpiredCode(value: unknown): boolean {
  return value === SESSION_EXPIRED_CODE;
}
