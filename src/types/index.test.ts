import { describe, expect, it } from "vitest";
import { ROLE_LABEL } from "./index";

describe("ROLE_LABEL", () => {
  // PBI-24 AC1: one Kontributor label replaces Penulis and Peninjau for the account role.
  it("labels the contributor role as Kontributor", () => {
    expect(ROLE_LABEL.contributor).toBe("Kontributor");
  });

  it("keeps the admin and viewer labels", () => {
    expect(ROLE_LABEL.admin).toBe("Admin");
    expect(ROLE_LABEL.viewer).toBe("Pembaca");
  });

  it("has no label left for the retired author and reviewer roles", () => {
    expect(Object.keys(ROLE_LABEL)).not.toContain("author");
    expect(Object.keys(ROLE_LABEL)).not.toContain("reviewer");
  });
});
