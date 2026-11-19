export interface Rejection {
  requirement: string;
  message: string;
}

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

export interface CreateResponseBody {
  report: { id: string } | null;
  warning: string | null;
}

export function outcomeFromResponse(body: CreateResponseBody): CreateOutcome {
  void body;
  return { kind: "failed", message: null };
}

export function outcomeFromError(error: unknown): CreateOutcome {
  void error;
  return { kind: "failed", message: null };
}
