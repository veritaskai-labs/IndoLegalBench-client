"use client";

import { useCallback, useEffect, useState } from "react";
import { listAuditLogs } from "@/lib/audit/auditApi";
import { clampDateRange } from "@/lib/audit/dateRange";
import type { AuditEntityType, AuditEntry, AuditFilter } from "@/types/audit";

export type AuditQuery = {
  from: string | null;
  to: string | null;
  entity_type?: AuditEntityType;
  actor_id?: string;
  case_id?: string;
};

export type AuditState =
  | { status: "loading" }
  | { status: "ready"; entries: AuditEntry[]; total: number; size: number }
  | { status: "error"; status_code?: number };

const EMPTY: AuditQuery = { from: null, to: null };


export function useAuditLog(today: Date, initial?: Partial<AuditQuery>) {
  const [query, setQuery] = useState<AuditQuery>({ ...EMPTY, ...initial });
  const [page, setPage] = useState(1);
  const [state, setState] = useState<AuditState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const range = clampDateRange(query.from, query.to, today);

  const request: AuditFilter = {
    from: range.from,
    to: range.to,
    entity_type: query.entity_type,
    actor_id: query.actor_id,
    case_id: query.case_id,
    page,
  };

  const key = JSON.stringify(request);
  
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const result = await listAuditLogs(JSON.parse(key) as AuditFilter);
        if (cancelled) return;
        setState({
          status: "ready",
          entries: result.items,
          total: result.total,
          size: result.size,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            status_code: (error as { status?: number })?.status,
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const setFilter = useCallback((next: Partial<AuditQuery>) => {
    setQuery((current) => ({ ...current, ...next }));
    setPage(1);
  }, []);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, query, range, page, setFilter, setPage, reload };
}