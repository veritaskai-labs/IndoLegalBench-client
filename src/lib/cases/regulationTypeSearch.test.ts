import { describe, expect, it } from "vitest";
import type { RegulationType } from "@/types/regulationType";
import { searchRegulationTypes } from "./regulationTypeSearch";

function type(
  code: string,
  label: string,
  singkatan: string | null = null,
  is_active = true,
): RegulationType {
  return { code, label, singkatan, is_active };
}

// Urutan sama dengan urutan dari server.
const TYPES: RegulationType[] = [
  type("uud", "Undang-undang Dasar Tahun 1945 dan Amandemen", "UUD"),
  type("ketetapan_mpr", "Ketetapan MPR"),
  type("uu", "Undang-undang", "UU"),
  type("pp", "Peraturan Pemerintah", "PP"),
  type("surat_edaran", "Surat Edaran"),
  type("permen", "Peraturan Kementerian", "Permen"),
  type("peraturan_menteri_keuangan", "Peraturan Menteri Keuangan"),
  type("keputusan_menteri_keuangan", "Keputusan Menteri Keuangan"),
  type("peraturan_menteri_ketenagakerjaan", "Peraturan Menteri Ketenagakerjaan"),
  type("peraturan_menteri_perdagangan", "Peraturan Menteri Perdagangan"),
  type(
    "peraturan_menteri_ekonomi_kreatif_kepala_badan_ekonomi_kreatif",
    "Peraturan Menteri Ekonomi Kreatif/Kepala Badan Ekonomi Kreatif",
  ),
  type("perda", "Peraturan Daerah", "Perda"),
];

const codes = (result: RegulationType[]) => result.map((item) => item.code);

describe("searchRegulationTypes", () => {
  // Positive
  it.each(["", "   ", "\t"])(
    "returns every type in the original order for a blank query %j",
    (query) => {
      // Act
      const result = searchRegulationTypes(TYPES, query);

      // Assert
      expect(codes(result)).toEqual(codes(TYPES));
    },
  );

  it("matches the label without caring about letter case", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "SURAT EDARAN");

    // Assert
    expect(codes(result)).toEqual(["surat_edaran"]);
  });

  it("matches the abbreviation", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "perda");

    // Assert
    expect(codes(result)).toEqual(["perda"]);
  });

  it("matches the code", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "ketetapan_mpr");

    // Assert
    expect(codes(result)).toEqual(["ketetapan_mpr"]);
  });

  it("needs every word of the query, in any order", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "keuangan menteri");

    // Assert
    expect(codes(result)).toEqual(["peraturan_menteri_keuangan", "keputusan_menteri_keuangan"]);
  });

  it("treats a hyphen, an underscore and a slash like a space", () => {
    // Act
    const hyphen = searchRegulationTypes(TYPES, "undang undang");
    const underscore = searchRegulationTypes(TYPES, "peraturan_menteri_keuangan");
    const slash = searchRegulationTypes(TYPES, "kreatif kepala");

    // Assert
    expect(codes(hyphen)).toEqual(["uud", "uu"]);
    expect(codes(underscore)).toEqual(["peraturan_menteri_keuangan"]);
    expect(codes(slash)).toEqual([
      "peraturan_menteri_ekonomi_kreatif_kepala_badan_ekonomi_kreatif",
    ]);
  });

  it("ignores spaces around and between the words of the query", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "   menteri    keuangan  ");

    // Assert
    expect(codes(result)).toEqual(["peraturan_menteri_keuangan", "keputusan_menteri_keuangan"]);
  });

  // Ranking
  it("puts an exact abbreviation before the other matches", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "uu");

    // Assert: UU first, then UUD (code and abbreviation only start with it)
    expect(codes(result).slice(0, 2)).toEqual(["uu", "uud"]);
  });

  it("puts a label that starts with the query before a label that only contains it", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "peraturan");

    // Assert
    expect(codes(result)[0]).toBe("pp");
    expect(codes(result)).toContain("peraturan_menteri_keuangan");
  });

  it("puts the general type first when its abbreviation is typed", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "permen");

    // Assert: the general Permen, then the ministry specific ones that contain "permen" in no word
    expect(codes(result)[0]).toBe("permen");
  });

  it("keeps the server order between matches of the same rank", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "menteri");

    // Assert
    expect(codes(result)).toEqual([
      "peraturan_menteri_keuangan",
      "keputusan_menteri_keuangan",
      "peraturan_menteri_ketenagakerjaan",
      "peraturan_menteri_perdagangan",
      "peraturan_menteri_ekonomi_kreatif_kepala_badan_ekonomi_kreatif",
    ]);
  });

  // Negative
  it("returns an empty list when nothing matches", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "tidak ada jenis ini");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns an empty list when only some of the words match", () => {
    // Act
    const result = searchRegulationTypes(TYPES, "menteri sosial");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns an empty list for an empty list of types", () => {
    // Act
    const result = searchRegulationTypes([], "uu");

    // Assert
    expect(result).toEqual([]);
  });

  // Edge cases
  it("does not fail for a type without an abbreviation", () => {
    // Arrange
    const types = [type("surat_edaran", "Surat Edaran", null)];

    // Act
    const result = searchRegulationTypes(types, "edaran");

    // Assert
    expect(codes(result)).toEqual(["surat_edaran"]);
  });

  it("does not filter by is_active, that is the caller's choice", () => {
    // Arrange
    const types = [type("lama", "Peraturan Lama", null, false)];

    // Act
    const result = searchRegulationTypes(types, "lama");

    // Assert
    expect(codes(result)).toEqual(["lama"]);
  });

  it("returns a new array and leaves the input untouched", () => {
    // Arrange
    const snapshot = structuredClone(TYPES);

    // Act
    const result = searchRegulationTypes(TYPES, "");

    // Assert
    expect(result).not.toBe(TYPES);
    expect(TYPES).toEqual(snapshot);
  });
});
