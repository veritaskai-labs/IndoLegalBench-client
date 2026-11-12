/**
 * Percobaan tertutup secara bawaan supaya hasil dengan banyak pengulangan mudah dibaca (SCRUM-292).
 * Satu-satunya pengecualian: kasus dengan tepat satu percobaan, yang langsung terbuka karena tidak
 * ada yang perlu dipilih.
 */
export function isExpandedByDefault(attemptCount: number): boolean {
  return attemptCount === 1;
}
