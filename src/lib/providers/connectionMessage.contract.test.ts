/** Daftar kategori error koneksi harus sama persis dengan kontrak. */

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
  it.fails("mengikuti enum server, merah sampai SCRUM-133 merge", () => {
    const dariKontrak = [...kategoriDariKontrak(bacaKontrak())].sort();
    const ditanganiFrontend = [...CONNECTION_ERROR_CODES].sort();

    expect(ditanganiFrontend).toEqual(dariKontrak);
  });

  it("membaca kontrak yang benar, bukan berkas kosong", () => {
    // Tanpa penjaga ini, kontrak kosong membuat perbandingan lulus semu.
    const kontrak = bacaKontrak();

    expect(Object.keys(kontrak.paths ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(kontrak.components?.schemas ?? {}).length).toBeGreaterThan(0);
  });
});
