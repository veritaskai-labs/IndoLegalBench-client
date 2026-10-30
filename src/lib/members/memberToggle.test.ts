/**
 * Pre-UAT F-08 (TC-30), PBI-1 (SCRUM-68), sub task SCRUM-95.
 * Saklar Aktif di halaman Anggota: apa yang terjadi saat diklik.
 */
import { describe, expect, it } from "vitest";
import type { User } from "@/types/user-management";
import { memberToggleAction, replaceMember } from "./memberToggle";

const SELF_ID = "11111111-1111-1111-1111-111111111111";

const ACTIVE: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Budi Author",
  email: "budi@veritask.ai",
  role: "contributor",
  is_active: true,
};
const INACTIVE: User = { ...ACTIVE, id: "33333333-3333-3333-3333-333333333333", is_active: false };

describe("memberToggleAction", () => {
  // Positif
  it("deactivates an active member", () => {
    expect(memberToggleAction(ACTIVE, SELF_ID)).toBe("deactivate");
  });

  it("reactivates an inactive member", () => {
    expect(memberToggleAction(INACTIVE, SELF_ID)).toBe("activate");
  });

  // Negatif: akun sendiri selalu terkunci
  it("locks the admin's own row", () => {
    expect(memberToggleAction({ ...ACTIVE, id: SELF_ID }, SELF_ID)).toBeNull();
  });

  // Corner: baris sendiri yang nonaktif tetap terkunci
  it("keeps the own row locked even if it shows as inactive", () => {
    expect(memberToggleAction({ ...INACTIVE, id: SELF_ID }, SELF_ID)).toBeNull();
  });

  // Corner: identitas belum dimuat
  it("still allows the action when the current user id is unknown", () => {
    expect(memberToggleAction(INACTIVE, null)).toBe("activate");
  });
});

describe("replaceMember", () => {
  // Positif
  it("swaps in the server's copy of the member and keeps the order", () => {
    const updated = { ...INACTIVE, is_active: true };

    expect(replaceMember([ACTIVE, INACTIVE], updated)).toEqual([ACTIVE, updated]);
  });

  // Negatif: id yang tidak ada di daftar tidak mengubah apa pun
  it("leaves the list as it is when the member is not in it", () => {
    const list = [ACTIVE];

    expect(replaceMember(list, INACTIVE)).toEqual([ACTIVE]);
  });

  // Corner
  it("returns an empty list for an empty list", () => {
    expect(replaceMember([], ACTIVE)).toEqual([]);
  });
});
