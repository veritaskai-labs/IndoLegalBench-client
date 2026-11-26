import { describe, expect, it } from "vitest";
import { metadata } from "./layout";

describe("RootLayout metadata", () => {
  it("names the app in the browser tab instead of the create-next-app default", () => {
    // SCRUM-204 E2E: every page without its own title showed "Create Next App".
    expect(metadata.title).toBe("IndoLegalBench");
    expect(metadata.description).not.toMatch(/create next app/i);
  });
});
