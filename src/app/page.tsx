export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-blue-600 dark:text-blue-400">
          PROPENSI X PPL 2026 &middot; KELOMPOK 4
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
          IndoLegalBench
        </h1>

        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Platform internal Veritask untuk menulis, mereview, memversikan, dan
          menjalankan test case hukum Indonesia terhadap beberapa produk AI
          sekaligus.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
          {[
            {
              title: "Authoring",
              desc: "Editor terstruktur dengan validasi skema saat mengetik",
            },
            {
              title: "Review",
              desc: "Dua reviewer blind dan pengukuran tingkat kesepakatan",
            },
            {
              title: "Measurement",
              desc: "Runner multi-provider dengan penilaian dua lapis",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white p-5 dark:bg-black">
              <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
                {item.title}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-500">
          Fakultas Ilmu Komputer, Universitas Indonesia &middot; Klien: Veritask
        </p>
      </main>
    </div>
  );
}