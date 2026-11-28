"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Badge,
  buttonClasses,
  type Column,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  LoadingSkeleton,
} from "@/components/ui";
import { formatRelativeTime, formatWib, formatWibDate } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { Suite } from "@/types/suite";

const COPY = messages({
  id: {
    active: "Aktif",
    archived: "Arsip",
    empty: "Kosong",
    name: "Nama",
    description: "Deskripsi",
    caseCount: "Jumlah kasus",
    status: "Status",
    created: "Tanggal dibuat",
    updated: "Terakhir diubah",
    actions: "Aksi",
    createCase: "Buat kasus",
    addCase: "Tambah kasus",
    caseInSuite: "{action} di {name}",
    editLabel: "Ubah {name}",
    editTip: "Ubah judul atau deskripsi suite",
    activateLabel: "Aktifkan {name}",
    archiveLabel: "Arsipkan {name}",
    activateTip: "Aktifkan suite",
    archiveTip: "Arsipkan suite",
    removeLabel: "Hapus {name}",
    removeTip: "Hapus suite",
    loadFailed: "Gagal memuat daftar suite.",
    noMatchTitle: "Tidak ada suite yang cocok",
    noMatchDescription: "Tidak ada suite yang cocok dengan kata kunci pencarian.",
    resetSearch: "Reset pencarian",
    emptyTitle: "Belum ada suite",
    emptyDescription: "Buat suite untuk mulai mengelompokkan kasus.",
    caption: "Daftar suite",
  },
  en: {
    active: "Active",
    archived: "Archived",
    empty: "Empty",
    name: "Name",
    description: "Description",
    caseCount: "Case count",
    status: "Status",
    created: "Created",
    updated: "Last changed",
    actions: "Actions",
    createCase: "Create case",
    addCase: "Add case",
    caseInSuite: "{action} in {name}",
    editLabel: "Edit {name}",
    editTip: "Edit the suite title or description",
    activateLabel: "Activate {name}",
    archiveLabel: "Archive {name}",
    activateTip: "Activate suite",
    archiveTip: "Archive suite",
    removeLabel: "Remove {name}",
    removeTip: "Remove suite",
    loadFailed: "Could not load the suite list.",
    noMatchTitle: "No matching suites",
    noMatchDescription: "No suite matches the search.",
    resetSearch: "Reset search",
    emptyTitle: "No suites yet",
    emptyDescription: "Create a suite to start grouping cases.",
    caption: "Suite list",
  },
});

type SuiteCopy = (typeof COPY)["id"];

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
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
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
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setCoords({
          top: rect.top - 6,
          right: Math.max(8, window.innerWidth - rect.right),
        });
      }
    }, TOOLTIP_DELAY_MS);
  }

  function hideTooltip() {
    clearTimer();
    setCoords(null);
  }

  useEffect(() => clearTimer, []);

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
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
      {coords !== null &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: coords.top, right: coords.right }}
            className="pointer-events-none fixed z-50 -translate-y-full whitespace-nowrap rounded-tag bg-ink px-2 py-1 text-xs font-medium text-paper shadow-menu"
          >
            {tooltip}
          </span>,
          document.body,
        )}
    </div>
  );
}

function renderStatusBadge(status: string, copy: SuiteCopy) {
  if (status === "active") {
    return (
      <Badge tone="green" dot>
        {copy.active}
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge tone="gray" dot>
        {copy.archived}
      </Badge>
    );
  }
  return <Badge tone="gray">{status}</Badge>;
}

function buildSuiteColumns({
  copy,
  canCreateCase,
  canManage,
  onEdit,
  onArchive,
  onDelete,
}: Readonly<{
  copy: SuiteCopy;
  canCreateCase: boolean;
  canManage: boolean;
  onEdit: (suite: Suite) => void;
  onArchive: (suite: Suite) => void;
  onDelete: (suite: Suite) => void;
}>): Column<Suite>[] {
  const base: Column<Suite>[] = [
    {
      key: "name",
      header: copy.name,
      sortable: true,
      cell: (suite) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/suites/${encodeURIComponent(suite.id)}`}
            className="font-semibold text-ink hover:underline"
          >
            {suite.name}
          </Link>
          {suite.is_empty && <Badge tone="amber">{copy.empty}</Badge>}
        </div>
      ),
    },
    {
      key: "description",
      header: copy.description,
      cell: (suite) => (
        <span className="text-ink-soft">{suite.description ?? "—"}</span>
      ),
    },
    {
      key: "case_count",
      header: copy.caseCount,
      sortable: true,
      cell: (suite) => (
        <span className="tabular-nums text-ink-soft">{suite.case_count}</span>
      ),
    },
    {
      key: "status",
      header: copy.status,
      cell: (suite) => renderStatusBadge(suite.status, copy),
    },
    {
      key: "created_at",
      header: copy.created,
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
      header: copy.updated,
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
      header: copy.actions,
      cell: (suite) => {
        const isZeroCases = suite.case_count === 0;
        const caseActionText = isZeroCases ? copy.createCase : copy.addCase;
        const caseActionLabel = fill(copy.caseInSuite, { action: caseActionText, name: suite.name });

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
                ariaLabel={fill(copy.editLabel, { name: suite.name })}
                tooltip={copy.editTip}
                onClick={() => onEdit(suite)}
              >
                <Icon name="manual" />
              </ActionIconButton>
              <ActionIconButton
                ariaLabel={
                  suite.status === "archived"
                    ? fill(copy.activateLabel, { name: suite.name })
                    : fill(copy.archiveLabel, { name: suite.name })
                }
                tooltip={suite.status === "archived" ? copy.activateTip : copy.archiveTip}
                onClick={() => onArchive(suite)}
              >
                <Icon name={suite.status === "archived" ? "aktifkan" : "arsipkan"} />
              </ActionIconButton>
              {suite.status === "active" && (
                <ActionIconButton
                  ariaLabel={fill(copy.removeLabel, { name: suite.name })}
                  tooltip={copy.removeTip}
                  tone="danger"
                  onClick={() => onDelete(suite)}
                >
                  <Icon name="hapus" />
                </ActionIconButton>
              )}
            </div>
          </div>
        );
      },
    });
  }

  return base;
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
  const copy = useText(COPY);
  const router = useRouter();
  const columns = useMemo<Column<Suite>[]>(
    () =>
      buildSuiteColumns({
        copy,
        canCreateCase,
        canManage,
        onEdit,
        onArchive,
        onDelete,
      }),
    [canCreateCase, canManage, copy, onArchive, onDelete, onEdit],
  );

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
        message={copy.loadFailed}
        onRetry={onRetry}
      />
    );
  }

  if (suites.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          title={copy.noMatchTitle}
          description={copy.noMatchDescription}
          action={
            onResetSearch
              ? { label: copy.resetSearch, onClick: onResetSearch }
              : undefined
          }
        />
      );
    }

    return (
      <EmptyState
        title={copy.emptyTitle}
        description={copy.emptyDescription}
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
        caption={copy.caption}
        initialSort={{ key: "updated_at", direction: "desc" }}
        resetPageOnDataChange={false}
        onRowClick={(suite) => router.push(`/suites/${encodeURIComponent(suite.id)}`)}
      />
    </div>
  );
}
