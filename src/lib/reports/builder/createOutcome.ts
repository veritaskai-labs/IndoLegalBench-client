import { ApiError } from "@/lib/apiClient";

/** Satu syarat perbandingan yang gagal (PBI-15 AC13), pesannya dari server. */
export interface Rejection {
  requirement: string;
  message: string;
}

/** Semua kemungkinan hasil "Buat laporan", satu bentuk per hal yang ditampilkan halaman. */
export type CreateOutcome =
  | { kind: "saved"; reportId: string }
  | { kind: "no_shared_cases" }
  | {
      kind: "not_comparable";
      selectionErrors: string[];
      ineligible: Record<string, string[]>;
      rejections: Rejection[];
    }
  | { kind: "sessions_missing"; sessionIds: string[] }
  | { kind: "forbidden"; code: string }
  | { kind: "invalid"; message: string | null }
  | { kind: "failed"; message: string | null };

/** Bagian body 201/200 `POST /reports` yang dibaca di sini. */
export interface CreateResponseBody {
  report: { id: string } | null;
  warning: string | null;
}

const NO_SHARED_CASES = "NO_SHARED_CASES";
const FORBIDDEN_CODES: readonly string[] = ["REPORT_SCOPE_FORBIDDEN", "REPORT_LABEL_MODE_FORBIDDEN"];

/**
 * Hasil dari jawaban sukses. Laporan tanpa id tidak pernah dianggap tersimpan: tanpa ini halaman
 * akan membuka /reports/comparisons/undefined.
 */
export function outcomeFromResponse(body: CreateResponseBody): CreateOutcome {
  if (body.report !== null) return { kind: "saved", reportId: body.report.id };
  if (body.warning === NO_SHARED_CASES) return { kind: "no_shared_cases" };
  return { kind: "failed", message: null };
}

/** Hasil dari error. Pasangan status dan kode yang tidak dikenal menjadi kegagalan umum. */
export function outcomeFromError(error: unknown): CreateOutcome {
  if (!(error instanceof ApiError)) return { kind: "failed", message: null };
  const details = error.details ?? {};

  if (error.status === 409 && error.code === "REPORT_NOT_COMPARABLE") {
    return {
      kind: "not_comparable",
      selectionErrors: stringList(details.selection_errors),
      ineligible: ineligibleMap(details.ineligible),
      rejections: rejectionList(details.rejections),
    };
  }
  if (error.status === 404 && error.code === "REPORT_SESSION_NOT_FOUND") {
    return { kind: "sessions_missing", sessionIds: stringList(details.missing) };
  }
  if (error.status === 403 && FORBIDDEN_CODES.includes(error.code)) {
    return { kind: "forbidden", code: error.code };
  }
  if (error.status === 422) return { kind: "invalid", message: error.serverMessage };
  return { kind: "failed", message: error.serverMessage };
}

/* Pembaca body yang tidak percaya bentuknya: yang bisa dibaca disimpan, sisanya dibuang. */

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function ineligibleMap(value: unknown): Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [sessionId, codes] of Object.entries(value)) {
    if (Array.isArray(codes)) result[sessionId] = stringList(codes);
  }
  return result;
}

function rejectionList(value: unknown): Rejection[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Rejection =>
      typeof item?.requirement === "string" && typeof item?.message === "string",
  );
}
