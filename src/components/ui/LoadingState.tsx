/** Loading state (spinner + label) */
export function LoadingState({ label = "Memuat…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}
    </div>
  );
}