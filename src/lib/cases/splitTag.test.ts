import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import {
  canChangeTagAsAdmin,
  isDevToTest,
  isTagLockedInEditor,
  SPLIT_TAG_LABEL,
  splitTagErrorMessage,
} from "./splitTag";

describe("SPLIT_TAG_LABEL", () => {
  it("labels both tags for badges and options", () => {
    // Act + Assert
    expect(SPLIT_TAG_LABEL).toEqual({ dev: "Dev set", test: "Test set" });
  });
});

describe("isDevToTest", () => {
  // Positive
  it("is true only when moving from dev to test", () => {
    // Act + Assert
    expect(isDevToTest("dev", "test")).toBe(true);
  });

  // Negative
  it.each([
    ["test", "dev"],
    ["dev", "dev"],
    ["test", "test"],
  ] as const)("is false for %s -> %s", (from, to) => {
    // Act + Assert
    expect(isDevToTest(from, to)).toBe(false);
  });
});

describe("isTagLockedInEditor", () => {
  // Positive: PBI-9 AC3, after approval the tag is no longer the author's to change
  it("locks the tag on an approved version", () => {
    // Act + Assert
    expect(isTagLockedInEditor({ status: "approved", version: 1 })).toBe(true);
  });

  it("locks the tag on a later draft, because a later version always comes from an approved one", () => {
    // Act + Assert
    expect(isTagLockedInEditor({ status: "draft", version: 2 })).toBe(true);
  });

  // Negative
  it.each(["draft", "needs_revision", "in_review"] as const)(
    "leaves the tag to the author on version 1 while it is %s",
    (status) => {
      // Act + Assert
      expect(isTagLockedInEditor({ status, version: 1 })).toBe(false);
    },
  );
});

describe("canChangeTagAsAdmin", () => {
  // Positive
  it("lets an admin change the tag once the case has been approved", () => {
    // Act + Assert
    expect(canChangeTagAsAdmin("admin", { status: "approved", version: 1 })).toBe(true);
    expect(canChangeTagAsAdmin("admin", { status: "draft", version: 2 })).toBe(true);
  });

  // Negative
  it.each(["author", "reviewer", "viewer"] as const)("hides the action from %s", (role) => {
    // Act + Assert
    expect(canChangeTagAsAdmin(role, { status: "approved", version: 1 })).toBe(false);
  });

  it("hides the action before approval, when the author changes the tag in the form", () => {
    // Act + Assert
    expect(canChangeTagAsAdmin("admin", { status: "draft", version: 1 })).toBe(false);
  });

  // Edge
  it("hides the action while the role is unknown", () => {
    // Act + Assert
    expect(canChangeTagAsAdmin(null, { status: "approved", version: 1 })).toBe(false);
  });
});

describe("splitTagErrorMessage", () => {
  it.each([
    [409, "TAG_CHANGE_NEEDS_CONFIRMATION", "Centang konfirmasi"],
    [409, "NO_APPROVED_VERSION", "belum disetujui"],
    [422, "SUITE_NOT_ACTIVE", "diarsipkan"],
    [403, "FORBIDDEN", "Hanya Admin"],
    [404, "not_found", "tidak ditemukan"],
  ])("explains %i %s", (status, code, fragment) => {
    // Act
    const message = splitTagErrorMessage(new ApiError(status, code, null, null));

    // Assert
    expect(message).toContain(fragment);
  });

  // Edge
  it("falls back to a retry message for anything else", () => {
    // Act + Assert
    expect(splitTagErrorMessage(new Error("network"))).toBe("Gagal mengubah tag. Coba lagi.");
  });
});

describe("splitTagErrorMessage unknown server errors", () => {
  // Edge: an ApiError with an unknown code that is neither 403 nor 404
  it("falls back to the retry message for a 500", () => {
    // Act + Assert
    expect(splitTagErrorMessage(new ApiError(500, "internal_error", null, null))).toBe(
      "Gagal mengubah tag. Coba lagi.",
    );
  });
});
