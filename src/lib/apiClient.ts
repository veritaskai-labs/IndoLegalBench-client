const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** Read JSON error backend, Asumsi -> { detail: string } */
async function parseError(response: Response): Promise<ApiError> {
  let code = "UNKNOWN_ERROR";
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") code = body.detail;
  } catch {

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

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}