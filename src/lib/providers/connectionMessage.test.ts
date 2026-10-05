import { describe, expect, it } from "vitest";
import { CONNECTION_ERROR_CODES, describeConnectionFailure } from "./connectionMessage";

// Input space partitioning on the error code the server sends:
//   P1 a known code with a fix the admin can act on (auth_failed, not_found, ...)
//   P2 a known code with no fix to offer (unsupported)
//   P3 no code at all: null, undefined, or "" (the server before SCRUM-133)
//   P4 a code this client does not know yet (a newer server)
describe("describeConnectionFailure", () => {
  // P1
  it("tells the admin to check the API key when the provider rejects it", () => {
    expect(describeConnectionFailure("auth_failed")).toEqual({
      title: "API key ditolak penyedia.",
      hint: "Periksa kembali API key, lalu simpan ulang lewat tombol Ubah.",
    });
  });

  it("points at the URL and model name when the provider does not know them", () => {
    expect(describeConnectionFailure("not_found").hint).toMatch(/URL endpoint dan nama model/);
  });

  it("separates provider-side trouble from mistakes in the form", () => {
    expect(describeConnectionFailure("provider_error").title).toMatch(/Server penyedia sedang bermasalah/);
    expect(describeConnectionFailure("rate_limited").hint).toMatch(/kuota/);
  });

  it("mentions the 15 second limit on a timeout", () => {
    expect(describeConnectionFailure("timeout").title).toMatch(/15 detik/);
  });

  it("has a title and hint for every known code, with no raw English left", () => {
    for (const code of CONNECTION_ERROR_CODES) {
      const { title, hint } = describeConnectionFailure(code);
      expect(title).not.toMatch(/provider|connection|failed/i);
      expect(title.endsWith(".")).toBe(true);
      if (hint !== null) expect(hint.endsWith(".")).toBe(true);
    }
  });

  // P2
  it("has no hint for a provider type that cannot be tested yet", () => {
    expect(describeConnectionFailure("unsupported")).toEqual({
      title: "Uji koneksi belum tersedia untuk jenis API ini.",
      hint: null,
    });
  });

  // P3 and P4 share the fallback, so the admin always gets a readable reason.
  it.each([null, undefined, "", "SOMETHING_NEW"])("falls back to the generic message for %j", (code) => {
    expect(describeConnectionFailure(code)).toEqual({
      title: "Uji koneksi gagal dan penyebabnya belum bisa kami kenali.",
      hint: "Buka Lihat detail untuk pesan asli dari penyedia.",
    });
  });
});
