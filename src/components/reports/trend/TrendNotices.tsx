/** Peringatan tren dari server, misalnya tidak ada kasus yang sama sehingga garis tidak digambar (PBI-17 AC11). */
export function TrendNotices({ warnings }: Readonly<{ warnings: readonly string[] }>) {
  if (warnings.length === 0) return null;

  return (
    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <ul className="list-disc space-y-1 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
