import type { components } from "@/lib/generated/api";
import {
  ACTIVITY_HEADER,
  PASSIVE_ACTIVITY,
  markLost,
  observeServerDeadlines,
} from "@/lib/sessionClock";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type MissingSection = components["schemas"]["CompletenessIssue"];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Pesan dari server, misalnya nama suite pemilik ID kasus. */
    readonly serverMessage: string | null = null,
    /** Lokasi field yang gagal, misalnya legal_refs[0].pasal. */
    readonly field: string | null = null,
    readonly missing: MissingSection[] = [],
    /** Jumlah kasus yang menunggu penilaian pada 409 CONFIRMATION_REQUIRED (PBI-24 AC8). */
    readonly affectedCount: number | null = null,
    /** Detail tambahan dari server, misalnya rincian 422 BUDGET_EXCEEDED (PBI-11 AC5). */
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** 403 dari GET /cases/{id} saat Developer AI membuka kasus test (SCRUM-183). */
export const TEST_CASE_HIDDEN = "TEST_CASE_HIDDEN";

type ForbiddenListener = () => void;

const forbiddenListeners = new Set<ForbiddenListener>();

/**
 * Subscribe to 403 responses from apiFetch. Returns an unsubscribe function.
 * This module only reports the event; navigation stays in the UI (AuthGuard).
 */
export function onForbidden(listener: ForbiddenListener): () => void {
  forbiddenListeners.add(listener);
  return () => {
    forbiddenListeners.delete(listener);
  };
}

function notifyForbidden(): void {
  for (const listener of forbiddenListeners) listener();
}

/** Why the session is gone: same values as AuthState "unauthenticated" (SCRUM-252). */
export type UnauthorizedReason = "expired" | "no_session";

type UnauthorizedListener = (reason: UnauthorizedReason) => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

/**
 * Subscribe to 401 responses from apiFetch. Returns an unsubscribe function.
 * Like onForbidden, this module only reports; clearing the screen and the redirect live in AuthGuard.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(reason: UnauthorizedReason): void {
  // The timer and a 401 share this path (SCRUM-252 AC4). Remember the absolute
  // expiry so a late 200 for the same login cannot put the page back.
  markLost();
  for (const listener of unauthorizedListeners) listener(reason);
}

/**
 * SCRUM-254. End the session the same way a 401 SESSION_EXPIRED does, without
 * waiting for a business call. One passive /me lets the server delete the row
 * when its own clock agrees; it does not refresh last_activity_at.
 */
export function endExpiredSession(): void {
  const newly = markLost();
  notifyUnauthorized("expired");
  if (!newly) return;
  void apiFetch("/me", { activity: "passive" }).catch(() => undefined);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Skema server menjamin paling sedikit 1; nilai lain bukan jumlah yang layak ditampilkan. */
function affectedCountOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

function missingSections(value: unknown): MissingSection[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MissingSection =>
      typeof item?.field === "string" && typeof item?.message === "string",
  );
}

/** Read JSON error backend: { code, message, field? } */
async function parseError(response: Response): Promise<ApiError> {
  let code = "UNKNOWN_ERROR";
  let message: string | null = null;
  let field: string | null = null;
  let missing: MissingSection[] = [];
  let affectedCount: number | null = null;
  let details: Record<string, unknown> | null = null;
  try {
    const body = await response.json();
    if (typeof body?.code === "string") code = body.code;
    message = stringOrNull(body?.message);
    field = stringOrNull(body?.field);
    missing = missingSections(body?.missing);
    affectedCount = affectedCountOrNull(body?.affected_count);
    if (typeof body?.details === "object" && body?.details !== null && !Array.isArray(body?.details)) {
      details = body.details as Record<string, unknown>;
    } else if (code === "BUDGET_EXCEEDED" && typeof body === "object" && body !== null && !Array.isArray(body)) {
      // Server flattens budget info at the top level of HTTP 422 BUDGET_EXCEEDED errors.
      const b = body as Record<string, unknown>;
      details = {
        product_name: b.product_name,
        remaining_budget_idr: b.remaining_budget_idr,
        estimated_cost_idr: b.estimated_cost_idr,
      };
    }
  } catch {
    // bukan JSON: halaman error HTML, balasan kosong, atau koneksi terputus.
  }
  return new ApiError(response.status, code, message, field, missing, affectedCount, details);
}

/**
 * silentForbidden: pemanggil yang hanya memeriksa apakah pengguna boleh melihat sesuatu (misalnya catatan
 * peninjau di halaman kasus) tidak memindahkan pengguna ke /forbidden saat server menjawab 403. Errornya
 * tetap dilempar, dan pemanggil yang memutuskan.
 */
export type ApiFetchInit = RequestInit & {
  silentForbidden?: boolean;
  /** SCRUM-251. "passive" authenticates without moving last_activity_at. */
  activity?: "passive";
};

function requestHeaders(init: HeadersInit | undefined, activity: "passive" | undefined): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init instanceof Headers) {
    init.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(init)) {
    for (const [key, value] of init) headers[key] = value;
  } else if (init) {
    for (const [key, value] of Object.entries(init)) {
      if (typeof value === "string") headers[key] = value;
    }
  }
  if (activity === "passive") headers[ACTIVITY_HEADER] = PASSIVE_ACTIVITY;
  return headers;
}

/** Fetch wrapper. Session via httpOnly cookie, jadi credentials: "include" wajib */
export async function apiFetch<T>(
  path: string,
  { silentForbidden = false, activity, ...init }: ApiFetchInit = {},
): Promise<T> {
  const headers = requestHeaders(init.headers, activity);
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.ok && response.headers && typeof response.headers.get === "function") {
    const verdict = observeServerDeadlines(response.headers);
    // A 200 for the login we already ended, or a deadline we cannot read, must
    // not become data on screen (SCRUM-254 AC6).
    if (verdict === "rejected" || verdict === "invalid") {
      notifyUnauthorized("expired");
      throw new ApiError(401, "SESSION_EXPIRED");
    }
  }

  if (!response.ok) {
    const err = await parseError(response);
    // Kasus test yang dibuka Developer AI bukan soal izin halaman: halaman kasus menampilkan
    // pesannya sendiri, jadi tidak dialihkan ke /forbidden (SCRUM-184).
    if (err.status === 403 && err.code !== TEST_CASE_HIDDEN && !silentForbidden) notifyForbidden();
    // Any 401 means the session is no longer usable, whatever the body says (SCRUM-252).
    if (err.status === 401) notifyUnauthorized(err.code === "SESSION_EXPIRED" ? "expired" : "no_session");
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
