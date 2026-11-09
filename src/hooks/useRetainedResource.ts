"use client";

import { useState } from "react";
import type { AsyncResource } from "./useAsyncResource";

type Reloadable<T> = AsyncResource<T> & { reload: () => void };

/**
 * Selama sumber data dimuat ulang (misalnya setelah simpan), tetap tampilkan data terakhir dan
 * tandai refreshing, supaya layar dan isian di dalamnya tidak hilang lalu muncul lagi. Muat pertama
 * tetap loading, dan galat tidak pernah disembunyikan di balik data lama.
 */
export function useRetainedResource<T>(resource: Reloadable<T>): Reloadable<T> & { refreshing: boolean } {
  const [last, setLast] = useState<{ data: T } | null>(null);

  // Menyimpan hasil terakhir saat render adalah pola React untuk state turunan; effect tidak perlu.
  if (resource.status === "ready" && last?.data !== resource.data) setLast({ data: resource.data });
  if (resource.status === "error" && last !== null) setLast(null);

  if (resource.status === "loading" && last !== null) {
    return { status: "ready", data: last.data, reload: resource.reload, refreshing: true };
  }
  return { ...resource, refreshing: false };
}
