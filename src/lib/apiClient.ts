export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Pesan dari server, misalnya nama suite pemilik ID kasus. */
    readonly serverMessage: string | null = null,
    /** Lokasi field yang gagal, misalnya legal_refs[0].pasal. */
    readonly field: string | null = null,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

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

/** Read JSON error backend: { code, message, field? } */
async function parseError(response: Response): Promise<ApiError> {
  let code = "UNKNOWN_ERROR";
  let message: string | null = null;
  let field: string | null = null;
  try {
    const body = await response.json();
    if (typeof body?.code === "string") code = body.code;
    message = stringOrNull(body?.message);
    field = stringOrNull(body?.field);
  } catch {
    // no JSON body
  }
  return new ApiError(response.status, code, message, field);
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
    if (err.status === 403) notifyForbidden();
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
