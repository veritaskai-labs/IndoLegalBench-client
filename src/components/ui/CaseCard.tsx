import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import type { CaseStatus } from "@/types/case";

export interface CaseCardProps {
  id: string;
  title: string;
  status: CaseStatus;
  axis: string;
  tag: "dev" | "test";
  version: string;
  author: string;
  updatedAt: string;
  onOpen?: () => void;
  className?: string;
}

const STATUS_STYLE: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  in_review: "bg-amber-50 text-amber-800 border-amber-200",
  needs_revision: "bg-rose-50 text-rose-800 border-rose-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export function CaseCard({
  id,
  title,
  status,
  axis,
  tag,
  version,
  author,
  updatedAt,
  onOpen,
  className = "",
}: CaseCardProps) {
  const label = CASE_STATUS_LABEL[status];
  const style = STATUS_STYLE[status];

  return (
    <div
      className={`bg-white border border-slate-200 rounded p-4 flex flex-col justify-between text-xs transition-colors hover:border-slate-300 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-slate-500 tracking-tight">{id}</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${style}`}
          >
            {label}
          </span>
        </div>

        <h4 className="font-bold text-slate-900 text-sm leading-snug mb-4 line-clamp-2">
          {title}
        </h4>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono text-[11px]">
            {axis}
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">
            {tag}
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">
            {version}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
        <span>
          {author} · {updatedAt}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="text-indigo-600 font-semibold hover:text-indigo-800 hover:underline cursor-pointer"
        >
          Buka
        </button>
      </div>
    </div>
  );
}
