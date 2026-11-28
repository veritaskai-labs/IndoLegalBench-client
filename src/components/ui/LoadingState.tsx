/** Loading state (spinner + label) */
export function LoadingState({ label = "Memuat…" }: Readonly<{ label?: string }>) {
  return (
    <output className="flex items-center justify-center gap-3 p-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
      {label}
    </output>
  );
}
