/**
 * Auth constants shared by the login page and the /auth/done handler.
 *
 * TODO(SCRUM-93): replace `Role` and the /me shape with the types generated
 * from the OpenAPI contract once that work is merged into staging.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const LOGIN_URL = `${API_BASE_URL}/auth/login`;
export const ME_URL = `${API_BASE_URL}/me`;

export const ROLE_HOME_PATH = {
  author: "/suites",
  admin: "/admin/users",
  reviewer: "/reviews", // placeholder page
  viewer: "/reports", // placeholder page
} as const;

export type Role = keyof typeof ROLE_HOME_PATH;

/**
 * Strict on purpose: role values are lowercase ("author", "admin",
 * "reviewer", "viewer"), as sent by the backend /me endpoint. Any other
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