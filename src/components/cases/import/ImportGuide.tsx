import { GUIDE_COLUMNS } from "@/lib/cases/importGuide";

const CODE = "rounded bg-slate-100 px-1 font-mono text-xs text-slate-800";

/** Panduan menyiapkan CSV impor kasus di Google Sheets (PBI-4 AC5). Contoh selalu placeholder (L1). */
export function ImportGuide() {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Panduan menyiapkan CSV di Google Sheets
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>
          Unduh template, lalu di Google Sheets buka <strong>File &gt; Impor &gt; Unggah</strong> dan pilih berkas
          template itu.
        </li>
        <li>
          Jangan mengubah baris pertama (nama dan urutan kolom). Satu baris berisi satu kasus, maksimal 500 baris
          kasus per berkas; pecah sheet yang lebih besar menjadi beberapa berkas.
        </li>
        <li>
          Field boleh dikosongkan. Kasus masuk sebagai draf dan dilengkapi di editor sebelum diajukan review oleh dua
          reviewer.
        </li>
        <li>
          Kolom list ditulis sebagai list JSON dalam satu sel, misalnya <code className={CODE}>[&quot;frasa pertama&quot;, &quot;frasa kedua&quot;]</code>.
          Tulis apa adanya; tanda kutip di dalamnya diurus Google Sheets saat diunduh.
        </li>
        <li>
          Unduh dengan <strong>File &gt; Download &gt; Comma Separated Values (.csv)</strong>. Google Sheets memakai
          UTF-8 dan pemisah koma. Jangan membuka lalu menyimpan ulang berkas di Excel; bila terpaksa, pilih format CSV
          UTF-8.
        </li>
        <li>
          Kode kasus tidak perlu diisi, sistem membuat kode baru. Baris yang sama dengan kasus yang sudah ada
          (judul dan pertanyaan sama) dilewati, jadi mengunggah ulang berkas yang sama aman.
        </li>
      </ol>
      <div className="mt-4 overflow-x-auto">
        <table aria-label="Kolom template CSV" className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4">Kolom</th>
              <th scope="col" className="py-2 pr-4">Isi</th>
              <th scope="col" className="py-2">Contoh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top text-slate-700">
            {GUIDE_COLUMNS.map((column) => (
              <tr key={column.name}>
                <td className="py-2 pr-4">
                  <code className={CODE}>{column.name}</code>
                </td>
                <td className="min-w-48 py-2 pr-4">{column.meaning}</td>
                <td className="whitespace-nowrap py-2 font-mono text-xs">
                  {column.example === "" ? <span className="font-sans italic text-slate-400">(kosong)</span> : column.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
