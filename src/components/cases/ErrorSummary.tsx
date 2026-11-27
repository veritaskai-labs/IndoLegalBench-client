import type { FieldIssue } from "@/lib/cases/caseValidation";
import type { CaseFieldPath } from "@/lib/cases/saveError";

type Props = {
  issues: FieldIssue[];
  /** Pindahkan fokus ke field yang dipilih dari ringkasan. */
  onSelect: (path: CaseFieldPath) => void;
};

/** Ringkasan isian yang harus diperbaiki sebelum kasus bisa disimpan (SCRUM-109). */
export function ErrorSummary({ issues, onSelect }: Props) {
  if (issues.length === 0) return null;
  return (
    <div role="alert" className="rounded-control border border-danger/30 bg-danger-wash p-4">
      <p className="text-sm font-medium text-danger">
        Periksa {issues.length} isian berikut sebelum menyimpan:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-danger">
        {issues.map(({ path, message }) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => onSelect(path)}
              className="cursor-pointer text-left underline"
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
