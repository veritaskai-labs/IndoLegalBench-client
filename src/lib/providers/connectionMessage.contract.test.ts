/**
 * Daftar kategori error koneksi harus sama persis dengan kontrak.
 * PBI-10 (SCRUM-75), sub task FE (SCRUM-134).
 *
 * connectionMessage.ts menerjemahkan kategori gagal dari server menjadi
 * kalimat yang bisa dibaca Admin. Daftar kategorinya ditulis tangan, dan
 * itu sudah terbukti bisa melenceng: versi pertama memakai delapan kode
 * usulan frontend, sementara SCRUM-133 mengirim lima dengan nama berbeda.
 * Hanya dua yang kebetulan sama. Sisanya akan jatuh diam-diam ke pesan
 * cadangan, tanpa satu pun test merah.
 *
 * Berkas ini yang menutup celah itu. Ia membaca enum
 * ConnectionTestErrorCategory langsung dari contract/openapi.json, lalu
 * membandingkannya dengan daftar yang ditangani frontend. Penambahan,
 * penghapusan, maupun penggantian nama di server langsung terlihat.
 *
 * Saat ini MERAH karena enumnya belum ada di kontrak: SCRUM-133 belum
 * merge. Ditandai it.fails() supaya CI tim tetap hijau selama menunggu,
 * dan supaya penandanya tidak bisa tertinggal: begitu kontraknya masuk
 * dan daftarnya cocok, test ini berubah lulus dan it.fails() justru
 * melaporkannya sebagai kegagalan. Penandanya dilepas di commit yang
 * sama dengan regenerasi tipe.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONNECTION_ERROR_CODES } from "./connectionMessage";

/** Kontrak yang di-commit, hasil `npm run gen:api` dari openapi.json server. */
const BERKAS_KONTRAK = resolve(process.cwd(), "contract/openapi.json");

type Kontrak = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, { enum?: string[] }> };
};

function bacaKontrak(): Kontrak {
  return JSON.parse(readFileSync(BERKAS_KONTRAK, "utf8")) as Kontrak;
}

function kategoriDariKontrak(kontrak: Kontrak): string[] {
  const skema = kontrak.components?.schemas?.ConnectionTestErrorCategory;
  if (!skema?.enum) {
    throw new Error(
      "ConnectionTestErrorCategory belum ada di contract/openapi.json. " +
        "Menunggu SCRUM-133 merge, lalu jalankan npm run gen:api.",
    );
  }
  return skema.enum;
}

describe("kategori error koneksi mengikuti kontrak", () => {
  it.fails("menangani persis kategori yang dideklarasikan server, tidak lebih dan tidak kurang", () => {
    const dariKontrak = [...kategoriDariKontrak(bacaKontrak())].sort();
    const ditanganiFrontend = [...CONNECTION_ERROR_CODES].sort();

    expect(ditanganiFrontend).toEqual(dariKontrak);
  });

  it("membaca kontrak yang benar, bukan berkas kosong", () => {
    // Tanpa penjaga ini, kontrak yang gagal dibaca atau berisi {} akan
    // membuat perbandingan di atas lulus tanpa memeriksa apa pun.
    const kontrak = bacaKontrak();

    expect(Object.keys(kontrak.paths ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(kontrak.components?.schemas ?? {}).length).toBeGreaterThan(0);
  });
});
