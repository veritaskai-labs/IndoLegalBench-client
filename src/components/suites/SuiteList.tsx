"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  buttonClasses,
  type Column,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/ui";
import { formatRelativeTime, formatWib, formatWibDate } from "@/lib/datetime/formatWib";
import type { Suite } from "@/types/suite";

type Props = {
  status: "loading" | "ready" | "error";
  suites: Suite[];
  /** Key that resets pagination when the active filter/tab changes (e.g. status + search). */
  filterKey?: string;
  isFiltered?: boolean;
  onResetSearch?: () => void;
  /** Hanya author dan admin yang boleh membuat kasus. */
  canCreateCase?: boolean;
  /** Developer AI hanya membaca suite, jadi kolom Aksi disembunyikan (SCRUM-184). */
  canManage?: boolean;
  onRetry: () => void;
  onEdit: (suite: Suite) => void;
  onDelete: (suite: Suite) => void;
  onArchive: (suite: Suite) => void;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  archived: "Arsip",
};

const TOOLTIP_DELAY_MS = 1000;

function ActionIconButton({
  ariaLabel,
  tooltip,
  tone = "neutral",
  onClick,
  children,
}: Readonly<{
  ariaLabel: string;
  tooltip: string;
  tone?: "neutral" | "danger";
  onClick: () => void;
  children: ReactNode;
}>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleTooltip() {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, TOOLTIP_DELAY_MS);
  }

  function hideTooltip() {
    clearTimer();
    setShowTooltip(false);
  }

  useEffect(() => clearTimer, []);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          hideTooltip();
          onClick();
        }}
        onMouseEnter={scheduleTooltip}
        onMouseLeave={hideTooltip}
        onFocus={scheduleTooltip}
        onBlur={hideTooltip}
        className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-control transition-colors ${
          tone === "danger"
            ? "text-danger hover:bg-danger-wash"
            : "text-ink-soft hover:bg-surface hover:text-ink"
        }`}
      >
        {children}
      </button>
      {showTooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-tag bg-ink px-2 py-1 text-xs font-medium text-paper shadow-menu"
        >
          {tooltip}
        </span>
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function UnarchiveIcon() {
  return (
    <svg
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h1" />
      <path d="M19 8v10a2 2 0 0 1-2 2h-1" />
      <path d="M12 20v-9" />
      <path d="m8.5 14.5 3.5-3.5 3.5 3.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function renderStatusBadge(status: string) {
  if (status === "active") {
    return (
      <Badge tone="green" dot>
        Aktif
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge tone="gray" dot>
        Arsip
      </Badge>
    );
  }
  return <Badge tone="gray">{STATUS_LABEL[status] ?? status}</Badge>;
}

export function SuiteList({
  status,
  suites,
  filterKey,
  isFiltered = false,
  onResetSearch,
  canCreateCase = false,
  canManage = true,
  onRetry,
  onEdit,
  onDelete,
  onArchive,
}: Readonly<Props>) {
  const router = useRouter();
  const columns = useMemo<Column<Suite>[]>(() => {
    const base: Column<Suite>[] = [
      {
        key: "name",
        header: "Nama",
        sortable: true,
        cell: (suite) => (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/suites/${encodeURIComponent(suite.id)}`}
              className="font-semibold text-ink hover:underline"
            >
              {suite.name}
            </Link>
            {suite.is_empty && <Badge tone="amber">Kosong</Badge>}
          </div>
        ),
      },
      {
        key: "description",
        header: "Deskripsi",
        cell: (suite) => (
          <span className="text-ink-soft">{suite.description ?? "—"}</span>
        ),
      },
      {
        key: "case_count",
        header: "Jumlah kasus",
        sortable: true,
        cell: (suite) => (
          <span className="tabular-nums text-ink-soft">{suite.case_count}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (suite) => renderStatusBadge(suite.status),
      },
      {
        key: "created_at",
        header: "Tanggal dibuat",
        sortable: true,
        sortValue: (suite) => suite.created_at,
        cell: (suite) => (
          <span title={formatWib(suite.created_at)} className="text-ink-soft">
            {formatWibDate(suite.created_at)}
          </span>
        ),
      },
      {
        key: "updated_at",
        header: "Terakhir diubah",
        sortable: true,
        sortValue: (suite) => suite.updated_at,
        cell: (suite) => (
          <span title={formatWib(suite.updated_at)} className="text-ink-soft">
            {formatRelativeTime(suite.updated_at)}
          </span>
        ),
      },
    ];

    if (canManage) {
      base.push({
        key: "actions",
        header: "Aksi",
        cell: (suite) => {
          const isZeroCases = suite.case_count === 0;
          const caseActionText = isZeroCases ? "Buat kasus" : "Tambah kasus";
          const caseActionLabel = `${caseActionText} di ${suite.name}`;

          return (
            <div className="flex items-center justify-end gap-2">
              {canCreateCase && suite.status === "active" && (
                <Link
                  href={`/suites/${encodeURIComponent(suite.id)}/cases/new`}
                  aria-label={caseActionLabel}
                  className={`${buttonClasses({ variant: "ghost", size: "sm" })} min-w-[110px] justify-center`}
                >
                  {caseActionText}
                </Link>
              )}
              <div className="flex items-center gap-0.5">
                <ActionIconButton
                  ariaLabel={`Ubah ${suite.name}`}
                  tooltip="Ubah judul atau deskripsi suite"
                  onClick={() => onEdit(suite)}
                >
                  <EditIcon />
                </ActionIconButton>
                <ActionIconButton
                  ariaLabel={
                    suite.status === "archived"
                      ? `Aktifkan ${suite.name}`
                      : `Arsipkan ${suite.name}`
                  }
                  tooltip={
                    suite.status === "archived"
                      ? "Aktifkan suite"
                      : "Arsipkan suite"
                  }
                  onClick={() => onArchive(suite)}
                >
                  {suite.status === "archived" ? <UnarchiveIcon /> : <ArchiveIcon />}
                </ActionIconButton>
                <ActionIconButton
                  ariaLabel={`Hapus ${suite.name}`}
                  tooltip="Hapus suite"
                  tone="danger"
                  onClick={() => onDelete(suite)}
                >
                  <TrashIcon />
                </ActionIconButton>
              </div>
            </div>
          );
        },
      });
    }

    return base;
  }, [canCreateCase, canManage, onArchive, onDelete, onEdit]);

  if (status === "loading") {
    return (
      <table className="w-full text-left text-sm">
        <tbody>
          <LoadingSkeleton variant="table" rows={3} columns={5} />
        </tbody>
      </table>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        variant="card"
        message="Gagal memuat daftar suite."
        onRetry={onRetry}
      />
    );
  }

  if (suites.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          title="Tidak ada suite yang cocok"
          description="Tidak ada suite yang cocok dengan kata kunci pencarian."
          action={
            onResetSearch
              ? { label: "Reset pencarian", onClick: onResetSearch }
              : undefined
          }
        />
      );
    }

    return (
      <EmptyState
        title="Belum ada suite"
        description="Buat suite untuk mulai mengelompokkan kasus."
      />
    );
  }

  return (
    <div className="[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:nth-child(n+3)]:w-px [&_td:nth-child(n+3)]:w-px [&_td:nth-child(n+3)]:whitespace-nowrap [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
      <DataTable
        key={filterKey}
        columns={columns}
        rows={suites}
        rowKey={(suite) => suite.id}
        pageSize={20}
        caption="Daftar suite"
        initialSort={{ key: "updated_at", direction: "desc" }}
        resetPageOnDataChange={false}
        onRowClick={(suite) => router.push(`/suites/${encodeURIComponent(suite.id)}`)}
      />
    </div>
  );
}
