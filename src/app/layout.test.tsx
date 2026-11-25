import { describe, expect, it, vi } from "vitest";
import { metadata } from "./layout";

// next/font only works inside the Next.js build; here only the exported metadata matters.
vi.mock("next/font/google", () => ({
  Hanken_Grotesk: () => ({ variable: "font-sans" }),
  Source_Serif_4: () => ({ variable: "font-serif" }),
}));

describe("RootLayout metadata", () => {
  it("names the app in the browser tab instead of the create-next-app default", () => {
    // SCRUM-204 E2E: every page without its own title showed "Create Next App".
    expect(metadata.title).toBe("IndoLegalBench");
    expect(metadata.description).not.toMatch(/create next app/i);
  });
});
