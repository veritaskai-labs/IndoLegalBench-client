import type { components } from "@/lib/generated/api";

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
  try {
    const body = await response.json();
    if (typeof body?.code === "string") code = body.code;
    message = stringOrNull(body?.message);
    field = stringOrNull(body?.field);
    missing = missingSections(body?.missing);
    affectedCount = affectedCountOrNull(body?.affected_count);
  } catch {
    // bukan JSON: halaman error HTML, balasan kosong, atau koneksi terputus.
  }
  return new ApiError(response.status, code, message, field, missing, affectedCount);
}

/** Fetch wrapper. Session via httpOnly cookie, jadi credentials: "include" wajib */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!response.ok) {
    const err = await parseError(response);
    // Kasus test yang dibuka Developer AI bukan soal izin halaman: halaman kasus menampilkan
    // pesannya sendiri, jadi tidak dialihkan ke /forbidden (SCRUM-184).
    if (err.status === 403 && err.code !== TEST_CASE_HIDDEN) notifyForbidden();
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
