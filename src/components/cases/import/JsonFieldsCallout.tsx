import { JSON_FORMAT_REASON, type GuideColumn } from "@/lib/cases/importGuide";
import { CopyExampleButton } from "./CopyExampleButton";
import { JsonFormatBadge } from "./JsonFormatBadge";

const CODE = "rounded bg-surface px-1 font-mono text-xs text-ink";

/**
 * Sorotan kolom CSV yang harus ditulis sebagai list JSON (SCRUM-380). Selalu terlihat, tidak di dalam panduan
 * yang bisa dilipat, supaya tim legal tahu sebelum mengisi sheet. Daftar kolomnya datang dari pemanggil
 * (jsonListColumns), jadi menambah kolom JSON tidak mengubah komponen ini.
 */
export function JsonFieldsCallout({ columns }: Readonly<{ columns: readonly GuideColumn[] }>) {
  if (columns.length === 0) return null;

  return (
    <section
      aria-labelledby="kolom-json"
      className="space-y-3 rounded-lg border border-warning-ink/30 bg-warning-wash p-4"
    >
      <h2 id="kolom-json" className="text-base font-semibold text-warning-ink">
        Kolom yang wajib berformat list JSON
      </h2>
      <p className="text-sm text-ink">{JSON_FORMAT_REASON}</p>
      <ul className="space-y-3">
        {columns.map((column) => (
          <li key={column.name} className="space-y-1.5 rounded-md bg-paper p-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className={CODE}>{column.name}</code>
              <JsonFormatBadge />
            </div>
            <code className="block overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-ink">
              {column.example}
            </code>
            <CopyExampleButton fieldName={column.name} text={column.example} />
          </li>
        ))}
      </ul>
    </section>
  );
}
