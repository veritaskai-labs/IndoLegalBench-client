import type { ProductLabelMapping } from "@/types/reports";

const CAPTION = "Pemetaan kode produk";
const CELL = "px-3 py-2 text-left";

/**
 * Panel pemetaan kode ke nama asli di detail laporan berlabel kode (SCRUM-367, PBI-15 AC9). Server hanya mengirim
 * pemetaan ke Admin dan hanya untuk laporan mode kode; selain itu nilainya kosong dan panel tidak tampil. Panel ini
 * sengaja di luar ReportDocument, jadi tidak ikut PDF (dibuat server) dan tidak ikut halaman publikasi.
 */
export function ProductMappingPanel({
  mapping,
}: Readonly<{ mapping?: readonly ProductLabelMapping[] | null }>) {
  if (!mapping || mapping.length === 0) return null;
  return (
    <section aria-labelledby="product-mapping-title" className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <h2 id="product-mapping-title" className="text-base font-semibold text-slate-900">
        {CAPTION}
      </h2>
      <p className="text-sm text-slate-600">
        Daftar ini hanya terlihat oleh Admin dan tidak ikut PDF dan publikasi.
      </p>
      <table className="w-full max-w-md border-separate border-spacing-0 text-sm text-slate-800">
        <caption className="sr-only">{CAPTION}</caption>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className={CELL}>
              Kode
            </th>
            <th scope="col" className={CELL}>
              Nama asli
            </th>
          </tr>
        </thead>
        <tbody>
          {mapping.map((row) => (
            <tr key={row.label} className="border-t border-slate-100">
              <td className={CELL}>{row.label}</td>
              <td className={CELL}>{row.real_name ?? "Produk tidak tersedia"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
