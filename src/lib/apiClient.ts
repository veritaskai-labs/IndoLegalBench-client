export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** Read JSON error backend: { code, message } */
async function parseError(response: Response): Promise<ApiError> {
  let code = "UNKNOWN_ERROR";
  try {
    const body = await response.json();
    if (typeof body?.code === "string") code = body.code;
  } catch {
    // no JSON body
  }
  return new ApiError(response.status, code);
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
    if (err.status === 403 && typeof window !== "undefined") {
      window.location.href = "/forbidden";
    }
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
