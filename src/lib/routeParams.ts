/**
 * useParams mengembalikan segmen dinamis yang masih ter-encode. Decode sekali
 * agar pemanggil API bisa meng-encode ulang tanpa encoding ganda.
 */
export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
