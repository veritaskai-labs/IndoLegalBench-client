import { previewLabels } from "@/lib/reports/labelPreview";
import type { ProductLabelMode } from "@/types/reports";

/**
 * Pratinjau nama tiap produk terpilih di laporan (SCRUM-367, PBI-15 AC9). Daftarnya dihitung previewLabels;
 * komponen ini hanya menampilkan. Kode diberikan server menurut urutan sesi, dan hasil laporan yang tersimpan
 * tetap yang berlaku.
 */
export function ProductLabelPreview({
  mode,
  productNames,
}: Readonly<{ mode: ProductLabelMode; productNames: readonly string[] }>) {
  const rows = previewLabels(mode, productNames);
  return (
    <div className="space-y-1 text-sm">
      {rows.length === 0 ? (
        <p className="text-slate-600">Pilih sesi untuk melihat pratinjau label.</p>
      ) : (
        <ul aria-label="Pratinjau label produk" className="space-y-0.5 text-slate-800">
          {rows.map((row, index) => (
            // Index in the key: the same product can be listed twice if two of its sessions are picked.
            <li key={`${index}-${row.productName}`}>
              {row.productName} → {row.label}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        Kode mengikuti urutan pilihan sesi. Laporan yang tersimpan tetap menjadi acuan.
      </p>
    </div>
  );
}
