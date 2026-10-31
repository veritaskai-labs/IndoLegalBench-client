import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MEASUREMENT_TYPE_LABEL } from "./format";

const BERKAS_KONTRAK = resolve(process.cwd(), "contract/openapi.json");

type Kontrak = { components?: { schemas?: Record<string, { enum?: string[] }> } };

function jenisDariKontrak(): string[] {
  const kontrak = JSON.parse(readFileSync(BERKAS_KONTRAK, "utf8")) as Kontrak;
  const skema = kontrak.components?.schemas?.MeasurementType;
  if (!skema?.enum) {
    throw new Error(
      "MeasurementType tidak ada di contract/openapi.json. " +
        "Segarkan kontrak dari server lalu jalankan npm run gen:api.",
    );
  }
  return skema.enum;
}

describe("label jenis pengukuran (PBI-23 AC1)", () => {
  it("menamai produk otomatis dan manual sesuai Jira", () => {
    expect(MEASUREMENT_TYPE_LABEL).toEqual({ automatic: "Otomatis", manual: "Manual" });
  });

  it("punya label untuk setiap jenis di kontrak, tidak lebih dan tidak kurang", () => {
    const dariKontrak = [...jenisDariKontrak()].sort();

    expect(dariKontrak.length).toBeGreaterThan(0);
    expect(Object.keys(MEASUREMENT_TYPE_LABEL ?? {}).sort()).toEqual(dariKontrak);
  });
});
