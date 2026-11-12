/** Stub awal untuk siklus red; aturan sebenarnya ditulis di commit green. */
export function isExpandedByDefault(attemptCount: number): boolean {
  return attemptCount < 0;
}
