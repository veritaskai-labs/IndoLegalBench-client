import { BASE_URL } from "./apiClient";
import type { components } from "./generated/api";

export const LOGIN_URL = `${BASE_URL}/auth/login`;
export const LOGOUT_URL = `${BASE_URL}/auth/logout`;

/**
 * Halaman awal setelah login (PBI-19 AC1). Viewer tidak punya dasbor
 * — servernya menjawab 403 — jadi peran itu tetap mendarat di /reports.
 */
export const ROLE_HOME_PATH = {
  contributor: "/dashboard",
  admin: "/dashboard",
  viewer: "/reports",
} as const;

export type Role = components["schemas"]["Role"];

/** Peran yang punya halaman awal; peran lain belum bisa masuk lewat client ini. */
type HomeRole = keyof typeof ROLE_HOME_PATH;

/**
 * Strict on purpose: role values are lowercase ("contributor", "admin",
 * "viewer"), as sent by the backend /me endpoint. The retired "author" and
 * "reviewer" values are unknown on purpose (PBI-24 AC1). Any other
 * casing or unknown value returns null.
 */
export function parseRole(value: unknown): HomeRole | null {
  if (typeof value !== "string") return null;
  return Object.keys(ROLE_HOME_PATH).includes(value) ? (value as HomeRole) : null;
}

/**
 * Peran yang boleh membuka /dashboard (PBI-19, PBI-24 AC6): Kontributor dan Admin. Server menjawab
 * 403 untuk peran lain, dan setiap 403 memindahkan pengguna ke /forbidden, jadi peran itu tidak
 * boleh sampai memanggilnya. Daftar positif, supaya peran baru tidak ikut terbuka tanpa disengaja.
 * null berarti belum ada sesi.
 */
export function canViewDashboard(role: Role | null): boolean {
  return role === "contributor" || role === "admin";
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
