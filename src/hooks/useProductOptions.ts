"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { listProductOptions } from "@/lib/providers/providerApi";
import { canUsePurpose, PURPOSE_TYPE } from "@/lib/providers/purpose";
import type { Role } from "@/types";
import type { AiProductOption, ProductPurpose } from "@/types/provider";

/** Pemanggilan API yang dipakai hook; test memberi tiruan lewat parameter. */
export interface ProductOptionsApi {
  listProductOptions(purpose: ProductPurpose): Promise<AiProductOption[]>;
}

export type ProductOptions = (
  | { status: "not_allowed" }
  | { status: "loading" }
  | { status: "ready"; options: AiProductOption[] }
  | { status: "error" }
) & { reload: () => void };

const DEFAULT_API: ProductOptionsApi = { listProductOptions };

/** Daftar pilihan produk satu tujuan; teks layar diputuskan komponennya. */
export function useProductOptions(
  purpose: ProductPurpose,
  role: Role | null,
  api: ProductOptionsApi = DEFAULT_API,
): ProductOptions {
  const allowed = canUsePurpose(role, purpose);
  const resource = useAsyncResource(
    `${purpose}|${role}`,
    async () => {
      // Peran tanpa hak tidak memanggil server sama sekali.
      if (!allowed) return [];
      const options = await api.listProductOptions(purpose);
      // Jenis lain tidak ditampilkan, walau server mengirimnya (AC7).
      return options.filter((option) => option.measurement_type === PURPOSE_TYPE[purpose]);
    },
    () => "",
  );
  const { reload } = resource;

  if (!allowed) return { status: "not_allowed", reload };
  if (resource.status === "ready") return { status: "ready", options: resource.data, reload };
  return { status: resource.status, reload };
}
