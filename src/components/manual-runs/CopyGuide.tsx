/**
 * Panduan tetap di layar pengisian (AC3): cara bertanya ke platform dan cara menyalin.
 * Tidak ada template unduh atau unggah; semuanya ditempel langsung di kartu kasus.
 */
export function CopyGuide() {
  return (
    <section aria-labelledby="copy-guide-title" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      <h2 id="copy-guide-title" className="text-sm font-semibold text-slate-900">
        Panduan mengisi jawaban
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Klik tombol &quot;Salin pertanyaan&quot; pada kasus. Yang tersalin hanya teks pertanyaan.</li>
        <li>Buka platform dan mulai percakapan baru untuk setiap percobaan.</li>
        <li>Tempel teks pertanyaan persis sama pada setiap percobaan. Jangan menambah atau mengubah kalimat.</li>
        <li>Salin seluruh isi jawaban platform apa adanya, termasuk penafian dan saran lanjutan.</li>
        <li>Tempel jawaban di kotak percobaan yang sesuai pada kartu kasus, lalu klik Simpan.</li>
      </ol>
    </section>
  );
}
